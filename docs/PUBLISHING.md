# Publishing

The rebuild is published as a public GitHub Pages site at https://ali1129js.github.io/rec-sys/.

Pages is built by `.github/workflows/deploy.yml` from the default branch (`master`). The Vite
config uses `base: './'`, so the site works under that project URL.

## Licence checklist

- **MovieLens.** Derived data (item-item similarities, aggregates) may be redistributed non-commercially under
  the same licence, with the citation and non-endorsement notice that the footer already shows. Raw ratings are not
  shipped and `raw/` is git-ignored.
- **IMDb.** Ratings and vote counts are shown with attribution and a link to the title page. IMDb's non-commercial
  dataset licence is for personal and non-commercial use and IMDb may withdraw permission. If that becomes a concern,
  rebuild without IMDb data: items with no rating simply hide the stars.
- **Wikidata.** CC0, no restrictions.

## History note

The default branch still contains the 2019 app in earlier commits (`1movies.json`, `src/Components/Data.js`):
70 film titles and 806 anonymous numeric user IDs with lists of movie IDs. No API keys and no personal names
or emails. The current tree no longer ships those files.
