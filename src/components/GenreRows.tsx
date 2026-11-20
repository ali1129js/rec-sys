import type { Recommendation } from '../lib/recommender';
import type { Catalog } from '../lib/types';
import { ResultList } from './ResultList';

export function groupByPrimaryGenre(recs: readonly Recommendation[]): [string, Recommendation[]][] {
  const map = new Map<string, Recommendation[]>();
  const order: string[] = [];
  for (const rec of recs) {
    const genre = rec.movie.genres[0] ?? 'Other';
    let list = map.get(genre);
    if (!list) {
      list = [];
      map.set(genre, list);
      order.push(genre);
    }
    list.push(rec);
  }
  return order.map((g) => [g, map.get(g)!]);
}

export function GenreRows({
  catalog,
  recs,
  onPick,
}: {
  catalog: Catalog;
  recs: readonly Recommendation[];
  onPick: (index: number) => void;
}) {
  const groups = groupByPrimaryGenre(recs);
  return (
    <>
      {groups.map(([genre, items]) => (
        <div key={genre} className="shelf">
          <h4 className="shelf-title">{genre}</h4>
          <ResultList catalog={catalog} recs={items} onPick={onPick} variant="poster" className="shelf-track" />
        </div>
      ))}
    </>
  );
}
