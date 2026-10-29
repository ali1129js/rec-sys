import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { decadeLabel, decadeOf, genresToMask } from '../src/lib/genres';
import { validateContent, type ContentFile } from '../src/lib/schema';
import { readImdbCandidates, readImdbRatings } from './lib/imdb';
import { IMDB_BASICS, IMDB_RATINGS, OUT_DIR, WORK_DIR } from './lib/paths';
import { DECADE_QUOTAS, selectByDecade, type Candidate } from './lib/select';
import { chunk, fetchGenres, fetchMeta, fetchPeople, type WdPeople } from './lib/wikidata';
import { mapGenreLabels } from './lib/wikidataGenres';
import type { CoreItemMeta } from './build-core';

const OVERSHOOT = 1.7;
const MIN_VOTES = 200;
const CAST_PER_FILM = 6;
const DIRECTORS_PER_FILM = 3;

const top = <T extends { fame: number; name: string }>(list: T[], n: number): string[] =>
  [...list]
    .sort((a, b) => b.fame - a.fame || a.name.localeCompare(b.name))
    .map((p) => p.name)
    .filter((name, i, all) => all.indexOf(name) === i)
    .slice(0, n);

export async function buildContent(): Promise<void> {
  const t0 = Date.now();
  const log = (m: string) => console.log(`[content ${((Date.now() - t0) / 1000).toFixed(0)}s] ${m}`);

  const coreMeta = JSON.parse(await readFile(join(WORK_DIR, 'core-items.json'), 'utf8')) as CoreItemMeta[];
  const coreIds = new Set(coreMeta.map((m) => m.imdb));
  const [basics, ratings] = await Promise.all([readImdbCandidates(IMDB_BASICS), readImdbRatings(IMDB_RATINGS)]);
  log(`imdb candidates=${basics.size} ratings=${ratings.size}`);

  const candidates: Candidate[] = [];
  for (const b of basics.values()) {
    if (b.type === 'movie' && b.runtime > 0 && b.runtime < 40) continue;
    const r = ratings.get(b.id);
    if (!r) continue;
    candidates.push({ id: b.id, year: b.year, votes: r.votes });
  }
  const picked = selectByDecade(candidates, DECADE_QUOTAS, { exclude: coreIds, overshoot: OVERSHOOT, minVotes: MIN_VOTES });
  log(`candidates after quota overshoot: ${picked.length}`);
  const ids = picked.map((c) => c.id);

  const meta = new Map<number, { title: string }>();
  for (const [i, part] of chunk(ids, 250).entries()) {
    for (const [id, m] of await fetchMeta(part)) meta.set(id, m);
    if (i % 5 === 0) log(`meta ${i + 1}/${Math.ceil(ids.length / 250)} -> ${meta.size}`);
  }
  const genreLabels = new Map<number, string[]>();
  for (const [i, part] of chunk(ids, 250).entries()) {
    for (const [id, g] of await fetchGenres(part)) genreLabels.set(id, g);
    if (i % 5 === 0) log(`genres ${i + 1}/${Math.ceil(ids.length / 250)} -> ${genreLabels.size}`);
  }

  const maskOf = new Map<number, number>();
  for (const id of ids) {
    const mask = genresToMask(mapGenreLabels(genreLabels.get(id) ?? []));
    if (mask !== 0 && meta.has(id)) maskOf.set(id, mask);
  }
  const usable = picked.filter((c) => maskOf.has(c.id));
  const final = selectByDecade(usable, DECADE_QUOTAS, {});
  log(`usable=${usable.length} final=${final.length}`);

  const people = new Map<number, WdPeople>();
  const finalIds = final.map((c) => c.id);
  for (const [i, part] of chunk(finalIds, 200).entries()) {
    for (const [id, p] of await fetchPeople(part)) people.set(id, p);
    if (i % 5 === 0) log(`people(extras) ${i + 1}/${Math.ceil(finalIds.length / 200)}`);
  }
  const corePeople = new Map<number, WdPeople>();
  const coreImdb = coreMeta.map((m) => m.imdb);
  for (const [i, part] of chunk(coreImdb, 150).entries()) {
    for (const [id, p] of await fetchPeople(part)) corePeople.set(id, p);
    if (i % 5 === 0) log(`people(core) ${i + 1}/${Math.ceil(coreImdb.length / 150)}`);
  }

  // Person feature vocabulary: only people who appear in at least two films carry matching signal.
  const df = new Map<string, number>();
  const feats = (p: WdPeople | undefined): [string[], string[]] =>
    p ? [top(p.directors, DIRECTORS_PER_FILM), top(p.cast, CAST_PER_FILM)] : [[], []];
  const bump = (names: string[]) => names.forEach((n) => df.set(n, (df.get(n) ?? 0) + 1));
  const extraFeats = finalIds.map((id) => feats(people.get(id)));
  const coreFeats = coreImdb.map((id) => feats(corePeople.get(id)));
  for (const [d, c] of [...extraFeats, ...coreFeats]) {
    bump(d);
    bump(c);
  }
  const vocab = [...df.entries()].filter(([, n]) => n >= 2).map(([name]) => name).sort((a, b) => a.localeCompare(b));
  const index = new Map(vocab.map((n, i) => [n, i]));
  const toIdx = (names: string[]) => names.flatMap((n) => (index.has(n) ? [index.get(n) as number] : []));

  const content: ContentFile = {
    v: 1,
    built: new Date().toISOString().slice(0, 10),
    coreCount: coreMeta.length,
    people: vocab,
    items: final.map((c, k) => {
      const r = ratings.get(c.id);
      const [d, ca] = extraFeats[k] as [string[], string[]];
      return [
        (meta.get(c.id) as { title: string }).title,
        c.year,
        maskOf.get(c.id) as number,
        c.id,
        r?.rating10 ?? 0,
        r?.votes ?? 0,
        toIdx(d),
        toIdx(ca),
      ];
    }),
    coreFeatures: coreFeats.map(([d, ca]) => [toIdx(d), toIdx(ca)]),
  };
  validateContent(content, coreMeta.length);
  await writeFile(join(OUT_DIR, 'content.json'), JSON.stringify(content));

  const perDecade = new Map<number, number>();
  for (const it of content.items) perDecade.set(decadeOf(it[1]), (perDecade.get(decadeOf(it[1])) ?? 0) + 1);
  for (const [d, n] of [...perDecade].sort((a, b) => a[0] - b[0])) {
    log(`${decadeLabel(d)}: ${n} (quota ${DECADE_QUOTAS[d] ?? '-'})`);
  }
  log(`wrote content.json: ${content.items.length} extra titles, ${vocab.length} people`);
}
