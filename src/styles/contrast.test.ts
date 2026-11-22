import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastMeets, contrastRatio } from '../lib/contrast';

const css = readFileSync(join(process.cwd(), 'src/styles/gloss.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

function parseThemes(): Record<string, Record<string, string>> {
  const themes: Record<string, Record<string, string>> = {};
  for (const block of css.split('}')) {
    const name = /data-theme=['"](\w+)['"]/.exec(block)?.[1];
    if (!name) continue;
    const vars: Record<string, string> = {};
    for (const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[m[1] as string] = m[2] as string;
    themes[name] = { ...(themes[name] ?? {}), ...vars };
  }
  return themes;
}

const themes = parseThemes();

const TEXT_PAIRS: [string, string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'section-cf-bg'],
  ['text', 'section-content-bg'],
  ['text', 'card-cf-bg'],
  ['text', 'card-content-bg'],
  ['text-muted', 'bg'],
  ['text-muted', 'surface'],
  ['text-muted', 'section-cf-bg'],
  ['text-muted', 'section-content-bg'],
  ['text-muted', 'card-cf-bg'],
  ['text-muted', 'card-content-bg'],
  ['link', 'bg'],
  ['link', 'surface'],
  ['link', 'card-cf-bg'],
  ['link', 'card-content-bg'],
  ['on-accent', 'accent'],
  ['on-chip-on', 'chip-on'],
  ['on-badge', 'badge-bg'],
  ['on-badge-cf', 'badge-cf-bg'],
  ['on-badge-content', 'badge-content-bg'],
  ['danger', 'bg'],
  ['danger', 'surface'],
];

/** Control borders and focus rings (WCAG 1.4.11). Soft Graphite card --border is not a control edge. */
const UI_PAIRS: [string, string][] = [
  ['control-border', 'bg'],
  ['control-border', 'surface'],
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['card-cf-border', 'card-cf-bg'],
  ['card-cf-border', 'section-cf-bg'],
  ['card-content-border', 'card-content-bg'],
  ['card-content-border', 'section-content-bg'],
];

const FILLS: [string, string][] = [
  ['#2f6bff', '#ffffff'],
  ['#7a8394', '#111111'],
  ['#00b386', '#111111'],
  ['#d42d47', '#ffffff'],
  ['#ffb000', '#111111'],
  ['#00c2d1', '#111111'],
];

describe('gloss.css', () => {
  it('defines exactly the three gloss themes with the same tokens', () => {
    expect(Object.keys(themes).sort()).toEqual(['graphite', 'khaki', 'midnight']);
    const tokens = Object.keys(themes.khaki ?? {}).sort();
    expect(tokens.length).toBeGreaterThan(10);
    for (const t of Object.values(themes)) expect(Object.keys(t).sort()).toEqual(tokens);
  });

  for (const [name, vars] of Object.entries(themes)) {
    describe(`${name} theme`, () => {
      it.each(TEXT_PAIRS)('text %s on %s meets 4.5:1', (fg, bg) => {
        expect(contrastMeets(vars[fg] as string, vars[bg] as string, 4.5)).toBe(true);
      });
      it.each(UI_PAIRS)('UI %s against %s meets 3:1', (fg, bg) => {
        expect(contrastMeets(vars[fg] as string, vars[bg] as string, 3)).toBe(true);
      });
    });
  }

  it.each(FILLS)('official gloss fill %s against text %s meets 4.5:1', (bg, fg) => {
    expect(contrastMeets(fg, bg, 4.5)).toBe(true);
  });
});

describe('contrastRatio', () => {
  it('matches known WCAG values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  });
});
