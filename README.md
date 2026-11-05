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
- **AI analysis** of each tender: difficulty, profit chance and likely margin, competition, risks, requirements, tips
- **Cost calculator**: itemised materials/labour/machinery/transport estimate from the AI, editable, with your quote, profit and margin
- **Mobile app**: installable to the home screen, works offline with the last data, bottom navigation, filter sheet
- Saved tenders, card/table views, shareable filter links, CSV export, dark mode, `/` and `p` keyboard shortcuts
- **3-minute free trial**, then a login screen with premium-membership contact details

## Setup step 1: turn on the AI analysis

The AI runs inside the daily GitHub job using the Claude API, so it needs an
Anthropic API key stored as a GitHub secret (never in the code).

1. Get a key at https://console.anthropic.com → *API Keys* → *Create Key*, and
   add credit under *Billing*.
2. In this repo: *Settings → Secrets and variables → Actions → New repository
   secret*. Name `ANTHROPIC_API_KEY`, value: the key.
3. Run *Actions → Daily tender scrape → Run workflow* (or wait for the morning).

Optional repository **variables** (same page, *Variables* tab):

| Variable | Default | Meaning |
|---|---|---|
| `AI_MODEL` | `claude-opus-5-5` | Claude model; `claude-haiku-5-5` is about 40x cheaper but less thorough |
| `AI_DAILY_LIMIT` | `300` | Max tenders analysed per day (caps spend) |
| `AI_EFFORT` | `medium` | `low` is cheaper, `high` more thorough |

**Cost** (Message Batches API, half the normal price): roughly ₹1.5–2 per tender
with the default model, so ~₹450–600/day at the 300 cap while the backlog of about
5,000 open tenders is worked through (about 2–3 weeks), then about ₹150–300/day
for new tenders only. With `claude-haiku-5-5` it is about ₹15 per day.
Check actual usage at console.anthropic.com.

The AI only sees the public listing (title, value, EMD, period, category,
location). Tender documents and the BOQ need a CAPTCHA to download, so the
cost estimate is an informed estimate, clearly labelled as such.

## Setup step 2: login server (trial per IP + member logins)

Without this, the 3-minute trial and the login run only in the browser, so
someone can restart the trial in a private window or on another device.
The Cloudflare Worker in `worker/` fixes that: it keeps the trial clock per
IP address on the server (shared by every device on that network), and checks
member logins on the server. It is free at this scale.

1. Create a free account at https://dash.cloudflare.com.
2. *Storage & Databases → KV → Create* a namespace named `TRIAL`.
3. *Compute (Workers) → Create → Start with Hello World*, name it `kpt-auth`,
   *Deploy*, then *Edit code*: replace everything with the contents of
   `worker/worker.js` and *Deploy*.
4. Worker → *Settings → Bindings → Add → KV namespace*: variable name `TRIAL`,
   namespace `TRIAL`.
5. Worker → *Settings → Variables and Secrets*:
   - Secret `SECRET`: any long random text (e.g. 40 random letters/numbers).
   - Secret `USERS`: your members as JSON, e.g.
     `{"allwinjeby":"<new password>","ravi":"<his password>"}`.
     Add a paying member by adding a pair; remove one to revoke access.
   - Text variable `ALLOWED_ORIGIN`: `https://allwinjeby.github.io`
   - Text variable `TRIAL_SECONDS`: `180`
6. Copy the worker's URL (like `https://kpt-auth.<name>.workers.dev`) and set
   `var AUTH_API = "...";` near the bottom of `docs/index.html` to it.

Notes:
- The trial clock starts the first time an IP opens the app and runs for 3
  minutes of wall-clock time. Raw IPs are never stored, only salted hashes,
  for 30 days.
- Mobile networks (Jio, Airtel…) often share one IP between many people, and
  phones change IP often. Some new visitors may find the trial already used,
  and someone switching networks may get a new one. That's the limit of
  IP-based tracking without accounts.
- The tender data itself is still public (this repo and `docs/data/` are
  public), so the gate stops casual use, not a determined person. Making the
  data truly members-only needs a private data source served by the worker,
  which can be added later.
- Until `AUTH_API` is set, the browser-only fallback is used, with the demo
  login whose password hash is `AUTH_HASH` in `docs/index.html`.

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
| `scraper/ai_analysis.py` | Daily AI analysis via the Claude Message Batches API |
| `worker/worker.js` | Cloudflare Worker: trial per IP and member logins |
| `docs/manifest.webmanifest`, `docs/sw.js`, `docs/icons/` | Installable mobile app (PWA) |
| `docs/data/ai/`, `docs/data/ai_index.json` | Per-tender AI analyses and the compact index for badges and filters |
| `docs/data/bodies.json` | Register of every local body seen, so ones with nothing open stay searchable |
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
