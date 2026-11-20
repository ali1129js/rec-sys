import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Filters } from './components/Filters';
import { Footer } from './components/Footer';
import { GenreRows } from './components/GenreRows';
import { LayoutSwitcher } from './components/LayoutSwitcher';
import { MotionToggle } from './components/MotionToggle';
import { PosterArt } from './components/PosterArt';
import { ResultList } from './components/ResultList';
import { SearchBox } from './components/SearchBox';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { explain } from './lib/explain';
import { decadeOf } from './lib/genres';
import { initialLayout, persistLayout, type Layout } from './lib/layout';
import { applyMotion, initialMotion, prefersReducedMotion, type Motion } from './lib/motion';
import { recommend, type Recommendation } from './lib/recommender';
import { buildSearchIndex, searchMovies } from './lib/search';
import { initialState, MAX_PICKS, reducer } from './lib/state';
import { applyTheme, initialTheme, type Theme } from './lib/theme';
import type { Catalog } from './lib/types';
import { defaultLoaders, useCatalog, type Loaders } from './lib/useCatalog';

const EXAMPLES = ['Heat', 'Spirited Away', 'Alien', 'Casablanca'];

function allRecs(result: { collaborative: readonly Recommendation[]; content: readonly Recommendation[] }): Recommendation[] {
  return [...result.collaborative, ...result.content];
}

function Picks({
  catalog,
  picks,
  dispatch,
}: {
  catalog: Catalog;
  picks: readonly number[];
  dispatch: (a: { type: 'unpick'; index: number } | { type: 'clear' }) => void;
}) {
  return (
    <div className="picks">
      <h3 id="picks-h">Your picks ({picks.length}/{MAX_PICKS})</h3>
      <ul aria-labelledby="picks-h" className="chips">
        {picks.map((i) => {
          const m = catalog.movies[i];
          if (!m) return null;
          return (
            <li key={i} className="pick">
              <span>
                {m.title} ({m.year})
              </span>
              <button type="button" aria-label={`Remove ${m.title}`} onClick={() => dispatch({ type: 'unpick', index: i })}>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="link-button" onClick={() => dispatch({ type: 'clear' })}>
        Clear all
      </button>
      {picks.length >= MAX_PICKS && <p className="hint">That is the maximum of {MAX_PICKS} picks. Remove one to add another.</p>}
    </div>
  );
}

function ResultsBlock({
  catalog,
  result,
  state,
  dispatch,
  layout,
  selectedIndex,
  onSelect,
}: {
  catalog: Catalog;
  result: ReturnType<typeof recommend>;
  state: { limit: number };
  dispatch: (a: { type: 'pick'; index: number } | { type: 'more' }) => void;
  layout: Layout;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}) {
  const total = result.collaborative.length + result.content.length;
  const variant = layout === 'sidebar' ? 'list' : 'poster';
  const renderList = (recs: readonly Recommendation[]) =>
    layout === 'rows' ? (
      <GenreRows catalog={catalog} recs={recs} onPick={(i) => dispatch({ type: 'pick', index: i })} />
    ) : (
      <ResultList
        catalog={catalog}
        recs={recs}
        onPick={(i) => dispatch({ type: 'pick', index: i })}
        variant={variant}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
      />
    );

  return (
    <>
      {total === 0 && (
        <p className="hint" data-testid="no-results">
          No recommendations match these filters. Try removing a genre or choosing “Any decade”.
        </p>
      )}
      {result.collaborative.length > 0 && (
        <section aria-labelledby="cf-h">
          <h3 id="cf-h">From viewer ratings (MovieLens)</h3>
          {renderList(result.collaborative)}
        </section>
      )}
      {result.content.length > 0 && (
        <section aria-labelledby="content-h">
          <h3 id="content-h">From the wider catalogue (content-based)</h3>
          <p className="hint">
            Matched on genre, director, cast and era, not on what viewers rated. Useful for older and newer films
            MovieLens cannot speak for.
          </p>
          {renderList(result.content)}
        </section>
      )}
      {total > 0 && (result.collaborative.length >= state.limit || result.content.length >= state.limit) && (
        <button type="button" onClick={() => dispatch({ type: 'more' })}>
          Show more
        </button>
      )}
    </>
  );
}

function Detail({
  catalog,
  rec,
  onPick,
}: {
  catalog: Catalog;
  rec: Recommendation;
  onPick: (index: number) => void;
}) {
  const m = rec.movie;
  const why = explain(catalog, rec);
  return (
    <>
      <PosterArt title={m.title} year={m.year} />
      <p className="detail-title">
        {m.title} <span className="year">({m.year})</span>
      </p>
      <p className="meta">{m.genres.join(' · ')}</p>
      <p className="why">
        <strong>{why.headline}.</strong> {why.detail}
      </p>
      <button type="button" className="link-button" onClick={() => onPick(m.index)}>
        Add {m.title} to my picks
      </button>
    </>
  );
}

export function App({ loaders = defaultLoaders }: { loaders?: Loaders }) {
  const [attempt, setAttempt] = useState(0);
  const { catalog, status } = useCatalog(loaders, attempt);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [theme, setTheme] = useState<Theme>(() => initialTheme());
  const [motion, setMotion] = useState<Motion>(() => initialMotion());
  const [reducedMotion, setReducedMotion] = useState(() => prefersReducedMotion());
  const [layout, setLayout] = useState<Layout>(() => initialLayout());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => applyMotion(motion, reducedMotion), [motion, reducedMotion]);
  useEffect(() => persistLayout(layout), [layout]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReducedMotion(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const index = useMemo(() => (catalog ? buildSearchIndex(catalog.movies) : { entries: [] }), [catalog]);
  const picked = useMemo(() => new Set(state.picks), [state.picks]);

  const decades = useMemo(() => {
    const set = new Set<number>();
    for (const m of catalog?.movies ?? []) set.add(decadeOf(m.year));
    return [...set].sort((a, b) => a - b);
  }, [catalog]);

  const result = useMemo(() => {
    if (!catalog || state.picks.length === 0) return null;
    return recommend(catalog, state.picks, {
      mode: state.mode,
      filters: state.filters,
      limit: state.limit,
      sort: state.sort,
    });
  }, [catalog, state.picks, state.mode, state.filters, state.limit, state.sort]);

  useEffect(() => {
    if (!result) {
      setSelectedIndex(null);
      return;
    }
    const ids = allRecs(result).map((r) => r.movie.index);
    setSelectedIndex((current) => (current !== null && ids.includes(current) ? current : (ids[0] ?? null)));
  }, [result]);

  const pickByTitle = useCallback(
    (title: string) => {
      const hit = searchMovies(index, title, { limit: 1 })[0];
      if (hit) dispatch({ type: 'pick', index: hit.index });
    },
    [index],
  );

  const ready = status.phase === 'ready' && catalog !== null;
  const selectedRec = result && selectedIndex !== null ? allRecs(result).find((r) => r.movie.index === selectedIndex) : undefined;

  const searchAndPicks = (
    <section aria-labelledby="pick-h" className={layout === 'hero' ? 'hero' : 'panel'}>
      <h2 id="pick-h">1. Pick films you like</h2>
      <SearchBox
        index={index}
        picked={picked}
        disabled={!ready}
        onPick={(m) => dispatch({ type: 'pick', index: m.index })}
      />
      {ready && state.picks.length === 0 && (
        <p className="examples">
          Not sure? Try:{' '}
          {EXAMPLES.map((t) => (
            <button key={t} type="button" className="link-button" onClick={() => pickByTitle(t)}>
              {t}
            </button>
          ))}
        </p>
      )}
      {catalog && state.picks.length > 0 && <Picks catalog={catalog} picks={state.picks} dispatch={dispatch} />}
      {status.phase === 'ready' && status.content === 'loading' && (
        <p role="status" className="hint">
          Loading the wider all-eras catalogue…
        </p>
      )}
      {status.phase === 'ready' && status.content === 'failed' && (
        <p role="status" className="hint">
          The wider catalogue could not be loaded, so only the MovieLens films are available.
        </p>
      )}
    </section>
  );

  const resultsSection = (
    <section aria-labelledby="results-h" className="panel" aria-live="polite">
      <h2 id="results-h">2. Recommendations</h2>
      {!ready && <p className="hint">Recommendations will appear here.</p>}
      {ready && state.picks.length === 0 && (
        <p className="hint" data-testid="empty-picks">
          Pick at least one film above to see recommendations.
        </p>
      )}
      {catalog && result && (
        <ResultsBlock
          catalog={catalog}
          result={result}
          state={state}
          dispatch={dispatch}
          layout={layout}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
        />
      )}
    </section>
  );

  return (
    <div className={`page layout-${layout}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div>
          <h1>Film Finder</h1>
          <p className="tagline">Pick films you love. Get recommendations from real viewer ratings, plus the whole history of cinema.</p>
        </div>
        <div className="theme-tools">
          <ThemeSwitcher theme={theme} onChange={setTheme} />
          <MotionToggle value={motion} onChange={setMotion} reducedMotion={reducedMotion} />
          <LayoutSwitcher layout={layout} onChange={setLayout} />
        </div>
      </header>

      <main id="main">
        {status.phase === 'error' && (
          <div role="alert" className="alert">
            <p>Could not load the film data. {status.message}</p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </button>
          </div>
        )}
        {status.phase === 'loading-core' && (
          <p role="status" className="hint">
            Loading the film catalogue…
          </p>
        )}

        {layout === 'sidebar' ? (
          <div className="shell">
            <aside className="sidebar">
              {searchAndPicks}
              {ready && <Filters state={state} dispatch={dispatch} decades={decades} />}
            </aside>
            {resultsSection}
            <div className="detail-pane">
              <h2>Details</h2>
              {!selectedRec && <p className="hint">Pick a recommendation to read why it was suggested.</p>}
              {catalog && selectedRec && (
                <Detail catalog={catalog} rec={selectedRec} onPick={(i) => dispatch({ type: 'pick', index: i })} />
              )}
            </div>
          </div>
        ) : (
          <>
            {searchAndPicks}
            {ready && <Filters state={state} dispatch={dispatch} decades={decades} />}
            {resultsSection}
          </>
        )}
      </main>

      <Footer catalog={catalog} />
    </div>
  );
}
