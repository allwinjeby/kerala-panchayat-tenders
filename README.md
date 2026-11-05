# Kerala Panchayat Tenders

A daily-updated, searchable list of public works tenders from Kerala's
panchayats (Grama, Block and District) and other local bodies.

**Dashboard:** https://allwinjeby.github.io/kerala-panchayat-tenders/

## Where the data comes from

The [Kerala e-Tenders portal](https://etenders.kerala.gov.in/nicgep/app)
(NIC GePNIC). Every morning the job:

1. Opens the public **Tenders by Organisation** page and picks the
   organisations that cover local bodies: *Local Self Government
   Department* (about 5,000 open tenders) plus any organisation with
   "Panchayat" in its name (Directorate of Panchayat, district panchayats).
2. Downloads each one's full tender list: title, reference, Tender ID,
   published, closing and opening dates, and the organisation chain. The
   chain gives the district and the issuing panchayat or municipality.
3. Opens each new tender's detail page for its **value (₹), EMD, work
   category, location and pincode**. It fetches up to 600 a day, so the
   first few days fill in the backlog and after that it keeps up easily.

Pages that need a CAPTCHA ("Active Tenders", search) are deliberately not
used. The job reads robots.txt and waits between requests.

Not used:
- `tender.lsgkerala.gov.in`: its robots.txt forbids automated access to
  the tender pages.
- `lsgkerala.gov.in`'s DDP and Other Institutions pages: these are office
  quotations such as vehicle hire, not public works.

Tender detail links on the portal only work inside the browsing session
that produced them. That's why the dashboard shows each **Tender ID** with
a copy button and links to the portal's search page, where you paste it.

## Files

| Path | What it is |
|---|---|
| `scraper/kerala_etenders.py` | Portal scraper and parsers |
| `scraper/common.py` | HTTP and robots.txt handling, date/₹ parsing, district and body-type detection |
| `scraper/run.py` | Daily job: merge with yesterday, mark new tenders, drop expired ones, write `docs/data/` |
| `docs/index.html` | The dashboard (static, served by GitHub Pages) |
| `docs/data/tenders.json` | All open tenders |
| `docs/data/new_today.json` | Tenders first seen today |
| `docs/data/meta.json` | Last run time, counts, scraper notes |
| `.github/workflows/daily-scrape.yml` | Runs everything daily at 06:30 IST |
| `.github/workflows/debug-fetch.yml` | Manual tool: saves live pages to the `debug-html` branch for inspection |
| `tests/` | Parser tests against trimmed copies of real portal pages |

## If it stops working

The portal's page layout can change. If the dashboard shows 0 tenders, or
the "Scraper notes" say something failed:

1. Open *Actions → Daily tender scrape* and read the latest run's log.
2. Run *Actions → Debug - fetch pages → Run workflow* with the portal URL
   to capture the live HTML on the `debug-html` branch.
3. Update the parser in `scraper/kerala_etenders.py`, refresh the
   matching file in `tests/fixtures/`, and run `python3 tests/test_parsers.py`.

## Run locally

```bash
pip install -r requirements.txt
python3 tests/test_parsers.py
python3 -m scraper.run
python3 -m http.server -d docs 8000
```

Unofficial tool, not affiliated with the Government of Kerala. Always
check the official notice before bidding.
