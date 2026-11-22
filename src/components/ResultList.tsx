import { explain } from '../lib/explain';
import type { Recommendation } from '../lib/recommender';
import { imdbUrl, type Catalog } from '../lib/types';
import { PosterArt } from './PosterArt';

interface Props {
  catalog: Catalog;
  recs: readonly Recommendation[];
  picked: ReadonlySet<number>;
  onPick: (index: number) => void;
  onUnpick: (index: number) => void;
}

const votesLabel = (v: number): string =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v);

export function ResultList({ catalog, recs, picked, onPick, onUnpick }: Props) {
  return (
    <ol className="results poster-grid">
      {recs.map((rec) => {
        const m = rec.movie;
        const why = explain(catalog, rec);
        return (
          <li key={m.index} className={rec.kind === 'content' ? 'card card-content' : 'card card-cf'} data-kind={rec.kind}>
            <PosterArt title={m.title} year={m.year} />
            <div className="card-body">
              <div className="card-head">
                <h3>
                  {m.title} <span className="year">({m.year})</span>
                </h3>
                <span className={rec.kind === 'content' ? 'badge badge-content' : 'badge badge-cf'}>
                  {rec.kind === 'content' ? 'Content-based' : 'Ratings (MovieLens)'}
                </span>
              </div>
              <p className="meta">
                {m.genres.join(' · ')}
                {m.imdbRating !== null && (
                  <>
                    {' '}
                    <span className="rating">
                      <span aria-hidden="true">★</span> {m.imdbRating.toFixed(1)}
                      <span className="visually-hidden"> out of 10 on IMDb</span> ({votesLabel(m.imdbVotes)} votes){' '}
                    </span>
                  </>
                )}
                <a
                  href={imdbUrl(m.imdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${m.title} on IMDb (opens in a new tab)`}
                >
                  IMDb
                </a>
              </p>
              <p className="why">
                <strong>{why.headline}.</strong> {why.detail}
              </p>
              <button
                type="button"
                className="pick-toggle"
                aria-pressed={picked.has(m.index)}
                aria-label={`Add ${m.title} to my picks`}
                onClick={() => (picked.has(m.index) ? onUnpick(m.index) : onPick(m.index))}
              >
                {picked.has(m.index) ? 'Added' : 'Add to my picks'}
              </button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
