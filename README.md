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
   category, location and pincode**. It fetches up to 1,200 a day, so the
   first few days fill in the backlog and after that it keeps up easily.
4. Normalises office names ("Office of the AE Kuzhalmannam Grama
   Panchayath") into clean local-body names ("Kuzhalmannam Grama
   Panchayat") for panchayat search and grouping.

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

## Dashboard features

- **Panchayat search**: type-ahead over every local body (about 470), with a profile panel showing open tenders, closing this week, value, and the most common work type
- **Kerala map**: district tiles shaded by number of open tenders. Click to filter.
- **Charts**: closing dates, contract-value ranges, work types, and the most active panchayats (by count or value). Each one filters everything else.
- **Follow panchayats**: get a "new since your last visit" alert and quick chips for the panchayats you follow
- **Tender detail**: value, EMD, live countdown, private notes, other tenders from the same panchayat, calendar reminder (.ics), WhatsApp share
- Saved tenders, card/table views, shareable filter links, CSV export, dark mode, `/` and `p` keyboard shortcuts
- **3-minute free trial**, then a login screen with premium-membership contact details

### About the login

The login is a **demo gate that runs in the browser**. GitHub Pages only serves
static files, so there is no server to check passwords. The password is stored
as a SHA-256 hash, not in plain text. Even so, anyone technical can get past it
(clear browser storage, or download `docs/data/tenders.json` directly, since this
repo is public). It's fine for a demo. To actually sell access, move to a real
auth backend, e.g. a private repo hosted on Cloudflare Pages behind
Cloudflare Access, or Supabase/Firebase auth serving the data only to logged-in
members.

To change the demo password, compute the new hash and replace `AUTH_HASH` in
`docs/index.html`:

```bash
printf '%s' 'kpt-v1|<username-lowercase>|<password>' | sha256sum
```

### Who won past tenders?

Award results (winning bidder, awarded amount) are only on the portal's
*Results of Tenders* / *Tender Status* pages, which require a CAPTCHA. This
project deliberately doesn't bypass that, so winner data isn't collected. Each
tender's detail view links to the Results page for a manual lookup by
Tender ID.

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
| `.github/workflows/daily-scrape.yml` | Runs everything daily at 06:30 IST (01:00 UTC) |
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
