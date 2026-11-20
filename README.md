# Film Finder (rec-sys, rebuild 2026)

A client-side movie recommender. Pick films you like and get recommendations with "because you liked X" explanations.
No server, no API keys, nothing you pick leaves your browser.

**Live:** https://ali1129js.github.io/rec-sys/

* **Viewer-rating layer**: the 3,000 most-rated films of MovieLens 32M with 30 precomputed neighbours each
  (item-item adjusted cosine, shrinkage, mild popularity damping).
* **Wider catalogue layer**: 7,032 more titles from the silent era to 2026 (Wikidata, CC0), matched by genre, director,
  cast and era, always labelled **Content-based** in the UI. It is lazy-loaded after the first render.
* Multi-film selection, genre and decade filters, popular vs hidden-gems, sort options, gloss themes
  (Khaki, Graphite default, Midnight plum), a motion toggle (static by default), keyboard-accessible
  combobox search, typographic poster tiles, and IMDb ratings with a link-out.

## Commands

```
npm install
npm run dev          # local dev server
npm test             # 196 tests (Vitest)
npm run typecheck    # strict TS, noUncheckedIndexedAccess
npm run build        # typecheck + production build into dist/
npm run shots        # headless Chrome e2e: screenshots, axe (incl. contrast) for 3 themes x 2 widths
npm run guard        # leak guard on the working tree
npm run guard:history
npm run data:build   # rebuild public/data/*.json (see docs/DATA.md, needs raw downloads)
```

## What changed from the 2019 version

| Old problem | How it is fixed |
|---|---|
| `splice` mutated state | Pure reducer with immutable state (`src/lib/state.ts`), tested with frozen arrays |
| Typing before clicking crashed the app | Defensive empty states; covered by an App test |
| Raw user input compiled into a RegExp | Normalised plain-text search, no regex from input (`src/lib/search.ts`) with injection tests |
| Raw co-occurrence counts favoured blockbusters | Adjusted cosine + shrinkage + damping (`scripts/lib/similarity.ts`, maths tested) |
| Titles like "Moonlight (0)" | Proper MovieLens title parser (`scripts/lib/titles.ts`); data validation rejects year 0 |

## Size (gzipped)

| File | Size |
|---|---|
| JS (React 19 app) | 101.4 kB |
| CSS | 2.0 kB |
| `core.json` (eager) | 360.5 kB |
| `content.json` (lazy) | 355.0 kB |
| **Total** | **about 820 kB** |

## Catalogue by decade

| Decade | MovieLens | Wikidata | Total |
|---|---|---|---|
| 1890s | 0 | 12 | 12 |
| 1900s | 0 | 40 | 40 |
| 1910s | 0 | 110 | 110 |
| 1920s | 6 | 300 | 306 |
| 1930s | 27 | 450 | 477 |
| 1940s | 30 | 520 | 550 |
| 1950s | 65 | 620 | 685 |
| 1960s | 91 | 680 | 771 |
| 1970s | 131 | 700 | 831 |
| 1980s | 374 | 720 | 1094 |
| 1990s | 898 | 740 | 1638 |
| 2000s | 873 | 760 | 1633 |
| 2010s | 490 | 780 | 1270 |
| 2020s | 15 | 600 | 615 |
| **Total** | **3000** | **7032** | **10032** |

## Docs

* [docs/LEARN.md](docs/LEARN.md): why the rebuild is structured this way
* [docs/DATA.md](docs/DATA.md): how the data is built and its limits
* [docs/PUBLISHING.md](docs/PUBLISHING.md): GitHub Pages notes
* [NOTICE.md](NOTICE.md): MovieLens citation and non-endorsement, IMDb and Wikidata attribution

## Known limits

* MovieLens ratings stop in October 2023, so viewer-rating recommendations cannot cover newer films.
* IMDb data is used under its non-commercial terms; IMDb may withdraw permission.
* Wikidata cast/genre coverage is uneven for early and non-English cinema.
