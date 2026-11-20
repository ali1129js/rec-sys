/**
 * Local design-proposal screenshots only. Not a publish step.
 * Usage: npm run build && SHOTS_DIR=/workspace/projects/recsys-shots/gloss npm run shots:proposals
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium, type Page } from 'playwright-core';

const OUT = process.env.SHOTS_DIR ?? '/workspace/projects/recsys-shots/gloss';
const DIST = join(process.cwd(), 'dist');
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

function serve(): Promise<{ url: string; close: () => void }> {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/')).replace(/^(\.\.[/\\])+/, '');
    let file = join(DIST, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ url: `http://127.0.0.1:${port}/`, close: () => server.close() });
    }),
  );
}

async function pick(page: Page, query: string, optionStart: string): Promise<void> {
  const box = page.getByRole('combobox', { name: /Search for a film/ });
  await box.fill(query);
  await page.getByRole('option').filter({ hasText: new RegExp(`^${optionStart}`) }).first().click();
}

async function openResults(page: Page, url: string, theme: string, layout: string): Promise<void> {
  await page.addInitScript(
    (prefs: { theme: string; layout: string }) => {
      localStorage.setItem('rec-sys-theme', prefs.theme);
      localStorage.setItem('rec-sys-layout', prefs.layout);
      localStorage.setItem('rec-sys-motion', 'static');
    },
    { theme, layout },
  );
  await page.goto(url);
  await page.getByRole('combobox', { name: /Search for a film/ }).waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes('Loading the wider'), null, { timeout: 30_000 });
  const actual = await page.evaluate(() => document.documentElement.dataset.theme);
  if (actual !== theme) throw new Error(`Expected theme ${theme}, got ${actual}`);
  await pick(page, 'heat', 'Heat');
  await pick(page, 'pulp', 'Pulp Fiction');
  await page.getByRole('heading', { name: /From viewer ratings/ }).waitFor();
}

async function main(): Promise<void> {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ not found. Run `npm run build` first.');
  await mkdir(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'], headless: true });

  const shots: { file: string; layout: string; theme: string; width: number; height: number }[] = [
    { file: 'A-hero-graphite-1280.png', layout: 'hero', theme: 'graphite', width: 1280, height: 900 },
    { file: 'A-hero-graphite-390.png', layout: 'hero', theme: 'graphite', width: 390, height: 844 },
    { file: 'B-sidebar-graphite-1280.png', layout: 'sidebar', theme: 'graphite', width: 1280, height: 900 },
    { file: 'B-sidebar-graphite-390.png', layout: 'sidebar', theme: 'graphite', width: 390, height: 844 },
    { file: 'C-rows-graphite-1280.png', layout: 'rows', theme: 'graphite', width: 1280, height: 900 },
    { file: 'C-rows-graphite-390.png', layout: 'rows', theme: 'graphite', width: 390, height: 844 },
    { file: 'A-hero-khaki-1280.png', layout: 'hero', theme: 'khaki', width: 1280, height: 900 },
    { file: 'A-hero-midnight-1280.png', layout: 'hero', theme: 'midnight', width: 1280, height: 900 },
  ];

  try {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 1,
        colorScheme: shot.theme === 'khaki' ? 'light' : 'dark',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await openResults(page, server.url, shot.theme, shot.layout);
      await page.locator('#results-h').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      const dest = join(OUT, shot.file);
      await page.screenshot({ path: dest, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (errors.length > 0) throw new Error(`${shot.file} console errors: ${errors.join('; ')}`);
      if (overflow) console.warn(`${shot.file}: horizontal overflow`);
      console.log(`wrote ${dest} overflow=${overflow}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`Proposal screenshots written to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
