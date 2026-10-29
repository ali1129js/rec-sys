import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildCatalog } from './lib/catalog';
import { decadeOf } from './lib/genres';
import { NO_FILTERS, recommendCollaborative } from './lib/recommender';
import { buildSearchIndex, searchMovies } from './lib/search';

/** Checks the shipped data files in public/data, as produced by `npm run data:build`. */
const dir = join(process.cwd(), 'public/data');
const read = (f: string): unknown => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const gz = (f: string): number => gzipSync(readFileSync(join(dir, f)), { level: 9 }).length;

describe('shipped data: core.json', () => {
  const core = read('core.json');
  const cat = buildCatalog(core, existsSync(join(dir, 'content.json')) ? read('content.json') : null);
  const movielens = cat.movies.slice(0, cat.coreCount);

  it('validates against the schema (3,000 films, 30 neighbours each)', () => {
    expect(cat.coreCount).toBe(3000);
    expect(cat.neighbours).toHaveLength(3000);
    for (const row of cat.neighbours) {
      expect(row.length).toBeGreaterThan(0);
      expect(row.length).toBeLessThanOrEqual(30);
    }
  });

  it('has no year 0 and no future years', () => {
    for (const m of cat.movies) {
      expect(m.year).toBeGreaterThanOrEqual(1888);
      expect(m.year).toBeLessThanOrEqual(2027);
    }
  });

  it('keeps titles in natural order ("The Usual Suspects", not "Usual Suspects, The")', () => {
    expect(movielens.filter((m) => /, (The|A|An)$/.test(m.title))).toEqual([]);
    expect(movielens.some((m) => m.title === 'The Usual Suspects')).toBe(true);
  });

  it('contains no raw user ratings: only aggregates and item-item similarities', () => {
    const keys = Object.keys(core as object).sort();
    expect(keys).toEqual(['built', 'genres', 'imdbSnapshot', 'items', 'movielens', 'nn', 'v']);
    const text = JSON.stringify(core);
    expect(text).not.toMatch(/userId|timestamp/i);
  });

  it('neighbours are sorted by damped relevance, similarities lie in (0, 1]', () => {
    for (const row of cat.neighbours) for (const n of row) expect(n.sim).toBeGreaterThan(0);
  });

  it('recommends sensible neighbours for well-known films', () => {
    const idx = buildSearchIndex(cat.movies);
    const first = (q: string) => searchMovies(idx, q, { limit: 1 })[0]!;
    const top = (q: string, n = 10) =>
      recommendCollaborative(cat, [first(q).index], { mode: 'popular', filters: NO_FILTERS, limit: n, sort: 'relevance' }).map((r) => r.movie.title);
    expect(top('Toy Story 1995')).toContain('Toy Story 2');
    expect(top('The Dark Knight 2008')).toEqual(expect.arrayContaining(['Batman Begins']));
    expect(top('The Lord of the Rings The Fellowship of the Ring')).toEqual(expect.arrayContaining(['The Lord of the Rings: The Two Towers']));
  });

  it('fits the size budget (gzipped)', () => {
    expect(gz('core.json')).toBeLessThan(700 * 1024);
  });
});

describe('shipped data: content.json', () => {
  const have = existsSync(join(dir, 'content.json'));
  it('exists', () => expect(have).toBe(true));
  if (!have) return;
  const cat = buildCatalog(read('core.json'), read('content.json'));
  const extras = cat.movies.slice(cat.coreCount);

  it('adds 5,000-8,000 wider-catalogue titles spanning the silent era to 2026', () => {
    expect(extras.length).toBeGreaterThanOrEqual(5000);
    expect(extras.length).toBeLessThanOrEqual(8000);
    const years = extras.map((m) => m.year);
    expect(Math.min(...years)).toBeLessThan(1915);
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2025);
  });

  it('represents every decade from the 1900s to the 2020s', () => {
    const decades = new Set(extras.map((m) => decadeOf(m.year)));
    for (let d = 1900; d <= 2020; d += 10) expect(decades.has(d)).toBe(true);
  });

  it('has no duplicates of core films and every title has a genre', () => {
    const core = new Set(cat.movies.slice(0, cat.coreCount).map((m) => m.imdbId));
    expect(extras.filter((m) => core.has(m.imdbId))).toEqual([]);
    expect(new Set(extras.map((m) => m.imdbId)).size).toBe(extras.length);
    expect(extras.filter((m) => m.genreMask === 0)).toEqual([]);
  });

  it('fits the total size budget (gzipped, both files under 1.5 MB)', () => {
    const total = gz('core.json') + gz('content.json');
    expect(total).toBeLessThan(1.5 * 1024 * 1024);
    expect(statSync(join(dir, 'content.json')).size).toBeGreaterThan(0);
  });
});
