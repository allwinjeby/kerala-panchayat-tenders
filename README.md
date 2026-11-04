# Kerala Panchayat Tenders

A small daily job that scrapes public-works tenders/bids published by
Kerala's panchayats and the Local Self Government Department (LSGD), and
publishes them as a searchable dashboard.

**Dashboard:** `https://<your-github-username>.github.io/kerala-panchayat-tenders/` (after setup below)

## How it works

- `scraper/kerala_etenders.py` — scrapes the public "Latest Active Tenders"
  listing on the state's official e-Tenders portal
  ([etenders.kerala.gov.in](https://etenders.kerala.gov.in/), built on
  NIC's GePNIC e-Procurement platform), keeping only rows whose
  organisation looks like a panchayat / LSGD body.
- `scraper/lsgkerala.py` — scrapes LSGD's own tenders listing
  ([lsgkerala.gov.in/en/tenders](https://lsgkerala.gov.in/en/tenders)),
  which sometimes carries smaller works that don't go through the
  e-Tenders portal.
- `scraper/run.py` — runs both, merges results with the previous day's
  data (tracking `first_seen`/`last_seen` per tender so the dashboard can
  flag what's new), drops expired tenders, and writes everything into
  `docs/data/` for the static dashboard (`docs/index.html`) to read.
- `.github/workflows/daily-scrape.yml` — runs the scraper once a day
  (03:00 UTC / 08:30 IST) on GitHub's own servers and commits the updated
  data. GitHub Pages serves `docs/` as the live site.

Both scrapers check `robots.txt` before fetching, rate-limit themselves,
and are written so that one source failing (site down, markup changed)
never crashes the run — it just shows up as a warning banner on the
dashboard and in `docs/data/meta.json`, while the other source keeps
working.

## One-time setup (do this after the code is pushed)

1. **Enable GitHub Pages**: repo *Settings → Pages → Build and deployment
   → Source: "Deploy from a branch"* → branch `main`, folder `/docs`.
   The dashboard will be live at
   `https://<username>.github.io/kerala-panchayat-tenders/` a minute or two later.
2. **Run it once by hand** to seed real data instead of waiting for the
   schedule: repo *Actions → Daily tender scrape → Run workflow*.
3. Everything after that is automatic — the workflow fires daily and
   pushes fresh data.

## Verifying / fixing the scraper against the live site

This project was built and tested with **synthetic fixture HTML**
(`tests/fixtures/`) because the sandbox it was written in could not reach
`*.kerala.gov.in`. The parsing logic (`tests/test_parsers.py`) is verified
against those fixtures, but the real page markup has not been confirmed.

After the first real run (step 2 above), check:

- `docs/data/meta.json` → `warnings`. A line like `"...parsed 0 rows..."`
  means a selector needs adjusting for the real page.
- The Action's log (*Actions → the run → scrape job*) prints the same
  warnings plus any HTTP errors.

If a source needs fixing:

1. Open the live page in a browser, "View Source" (or save the page),
   and compare against the assumptions in that source's module —
   `kerala_etenders.py` expects a `<table>` whose header row mentions
   "closing" and "title"/"organisation"; `lsgkerala.py` expects a Drupal
   `.view-content .views-row` listing.
2. Adjust the selector/column-mapping logic to match what's actually
   there, drop the saved HTML into `tests/fixtures/` (replacing the
   synthetic one), update `tests/test_parsers.py` expectations, and run:
   ```
   python3 tests/test_parsers.py
   ```
3. Commit and push; the next scheduled run picks up the fix.

## Running locally

```bash
pip install -r requirements.txt
python3 -m scraper.run
python3 tests/test_parsers.py
```

`python3 -m http.server -d docs 8000` and open `http://localhost:8000/`
to preview the dashboard against whatever is in `docs/data/`.

## Scope / etiquette

This reads only public tender-notice listings meant for contractors to
browse, at a slow rate (one request every couple of seconds), and honors
each site's `robots.txt`. It's an unofficial personal aggregator, not
affiliated with the Government of Kerala — always confirm details on the
official portal before acting on anything shown here.
