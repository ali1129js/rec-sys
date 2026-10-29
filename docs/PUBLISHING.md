# Publishing

Nothing is deployed. This branch only adds code; publishing is a decision for the repository owner.

## The constraint

GitHub Pages for a **private** repository requires a paid GitHub plan (Pro, Team or Enterprise). On the
free plan, Pages only works for **public** repositories.

## Options

1. **Make `ali1129js/rec-sys` public.** Simplest, and keeps the history. Before doing so, consider that the repo
   history contains the 2019 version (including `1movies.json` / `Data.js`). The rebuild branch removes those
   files, but they stay in git history unless the history is rewritten.
2. **Create a new public repository** (e.g. `film-finder`) and push this branch's tree as its first commit.
   Clean history, private original untouched. Recommended if you do not want the 2019 history public.
3. **Upgrade to a plan that supports Pages on private repos** and keep everything private.

## Before going public: licence checklist

- **MovieLens**: derived data (item-item similarities, aggregates) may be redistributed non-commercially under
  the same licence, with the citation and non-endorsement notice that the footer already shows. Raw ratings are not
  shipped and `raw/` is git-ignored.
- **IMDb**: ratings and vote counts are shown with attribution and a link to the title page, which is how the
  owner chose to accept the licence risk. IMDb's non-commercial dataset licence is for personal and non-commercial
  use and IMDb may withdraw permission. If that becomes a concern, rebuild without IMDb data: the `imdbRating` and
  `imdbVotes` fields are optional in the UI (items with `0` simply show no rating).
- **Wikidata**: CC0, no restrictions.

## Enabling Pages

1. Move `docs/github-pages-workflow.yml` to `.github/workflows/pages.yml`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Push to `main`. The site is built with relative asset paths (`base: './'`), so it works under
   `https://<user>.github.io/<repo>/` without further configuration.
