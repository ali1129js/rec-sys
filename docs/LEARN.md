# Learning notes

Short explanations of the ideas this project actually uses, and why they matter. Each one points at a file.

## Don't mutate the list you are walking

The 2019 app recommended films by taking other users' lists, calling `splice` to drop the selected film, then counting what was left. `splice` changes the array in place, including the copy that still lived in React state, so a second click worked on already-damaged data. The rebuild keeps picks, filters and sort in a reducer that always returns a new state object. Tests freeze the input arrays so a stray mutation would throw.

See `src/lib/state.ts` and `src/lib/state.test.ts`. The old `splice` lived in `src/App.js` on `master`.

## User input is not a regular expression

The old search did `letter.toLowerCase().match(term)`. If you typed `(`, `[` or `.*`, JavaScript compiled that into a RegExp and the page could throw or match the wrong titles. Search now normalises both the query and the titles to plain text (NFC) and looks for a substring. There is no `new RegExp` on what the user typed.

See `src/lib/search.ts` and the injection cases in `src/App.test.tsx`.

## Two recommenders, one browser, no API keys

Viewer-rating neighbours are computed ahead of time from MovieLens (adjusted cosine, shrinkage, a little popularity damping) and shipped as `public/data/core.json`. A second, lazier file adds older and newer titles from Wikidata and matches them on genre, director, cast and era. Both lists run in the browser. The UI labels the second list **Content-based** so it is not confused with "people who liked this also liked". Explanations are built from the same data, not from a server.

See `src/lib/recommender.ts`, `src/lib/explain.ts` and `docs/DATA.md`.

## Validate data at the edge

The two JSON files are compact tuples, not objects, to keep the download small. On load they are checked with Zod. If a file is missing, truncated or the wrong shape, the page shows a retryable error instead of crashing mid-render. The same idea applies to the saved theme and motion preference: unknown values are ignored and a safe default is used (Graphite, static).

See `src/lib/schema.ts`, `src/lib/useCatalog.ts`, `src/lib/theme.ts` and `src/lib/motion.ts`.

## Theme tokens and contrast as tests

Colours live as CSS variables in `src/styles/gloss.css`. A test parses that file and checks WCAG AA for text (4.5:1, rounded to two decimals) and 3:1 for control borders, including official gloss fills (Cobalt, Pewter, Jade, Garnet, Saffron, Lagoon). Graphite's softer card border is not treated as a control edge; inputs use `--control-border`. The motion toggle sits next to the theme switch, defaults to static, and is forced static when the system asks for reduced motion.

See `src/styles/contrast.test.ts` and `src/components/MotionToggle.tsx`.
