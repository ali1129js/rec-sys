/**
 * Chosen layout (hero grid) on Graphite. Local screenshots only.
 * Usage: npm run build && SHOTS_DIR=/workspace/projects/recsys-shots/gloss/final npm run shots:final
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium, type Page } from 'playwright-core';

const OUT = process.env.SHOTS_DIR ?? '/workspace/projects/recsys-shots/gloss/final';
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

async function main(): Promise<void> {
  if (!existsSync(join(DIST, 'index.html'))) throw new Error('dist/ not found. Run `npm run build` first.');
  await mkdir(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'], headless: true });
  const shots = [
    { file: 'graphite-1280.png', width: 1280, height: 900 },
    { file: 'graphite-390.png', width: 390, height: 844 },
  ] as const;

  try {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 1,
        colorScheme: 'dark',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.addInitScript(() => {
        localStorage.setItem('rec-sys-theme', 'graphite');
        localStorage.setItem('rec-sys-motion', 'static');
        localStorage.removeItem('rec-sys-layout');
      });
      await page.goto(server.url);
      await page.getByRole('combobox', { name: /Search for a film/ }).waitFor();
      await page.waitForFunction(() => !document.body.innerText.includes('Loading the wider'), null, { timeout: 30_000 });
      const actual = await page.evaluate(() => document.documentElement.dataset.theme);
      if (actual !== 'graphite') throw new Error(`Expected theme graphite, got ${actual}`);
      await pick(page, 'heat', 'Heat');
      await pick(page, 'pulp', 'Pulp Fiction');
      await page.getByRole('heading', { name: /From viewer ratings/ }).waitFor();
      await page.evaluate(() => window.scrollTo(0, 0));
      const dest = join(OUT, shot.file);
      await page.screenshot({ path: dest, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (errors.length > 0) throw new Error(`${shot.file} console errors: ${errors.join('; ')}`);
      if (overflow) throw new Error(`${shot.file}: horizontal overflow`);
      console.log(`wrote ${dest}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
