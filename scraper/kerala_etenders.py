"""Scraper for the Kerala Government e-Tenders portal (etenders.kerala.gov.in),
built on NIC's GePNIC e-Procurement platform -- the same software used by
most Indian state tender portals. Pulls the public "Latest Active Tenders"
listing (no login required) and keeps only rows whose organisation chain
looks like a panchayat / LSGD body.

IMPORTANT: the exact table markup and pagination control names on this
platform vary slightly between state deployments and change occasionally.
This module is written defensively (header-driven column mapping, several
fallback selectors) rather than against a fixed XPath, but it has not been
verified against the live site from this environment (outbound access to
*.kerala.gov.in is blocked here). The first real GitHub Actions run's logs
are the actual verification step -- see README "Verifying / fixing the
scraper" if it ever reports 0 results.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from .common import TenderRecord, looks_like_panchayat, make_id, parse_date, polite_get, polite_post

BASE = "https://etenders.kerala.gov.in"
LATEST_ACTIVE_URL = f"{BASE}/nicgep/app?page=FrontEndLatestActiveTenders&service=page"
SOURCE = "kerala_etenders"
MAX_PAGES = 15

# Header text -> normalized field name. Matched case-insensitively against
# whatever <th>/<td> header text the page actually has, so small wording
# changes ("Closing Date" vs "Bid Submission Closing Date") don't break it.
HEADER_MAP = {
    "published": "published_date",
    "closing": "closing_date",
    "title": "title_cell",
    "organisation": "organisation",
    "organization": "organisation",
}


def _map_headers(header_cells: list[str]) -> dict[int, str]:
    mapping = {}
    for idx, text in enumerate(header_cells):
        low = text.lower()
        for key, field in HEADER_MAP.items():
            if key in low:
                mapping[idx] = field
                break
    return mapping


def _find_tender_table(soup: BeautifulSoup):
    """Find the table most likely to be the tender listing: the one with
    the most rows and a header mentioning both a date and a title/org."""
    best = None
    best_score = 0
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        header_text = " ".join(c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])).lower()
        score = len(rows)
        if "closing" in header_text and ("title" in header_text or "organisation" in header_text or "organization" in header_text):
            score += 1000  # strong signal this is the right table
        if score > best_score:
            best_score = score
            best = table
    return best


def _parse_listing_page(html: str) -> tuple[list[TenderRecord], str | None]:
    """Parse one page of results. Returns (records, next_page_event_target)."""
    soup = BeautifulSoup(html, "lxml")
    table = _find_tender_table(soup)
    records: list[TenderRecord] = []
    if table is None:
        return records, None

    rows = table.find_all("tr")
    header_cells = [c.get_text(" ", strip=True) for c in rows[0].find_all(["th", "td"])]
    col_map = _map_headers(header_cells)

    for row in rows[1:]:
        cells = row.find_all("td")
        if not cells:
            continue
        values: dict[str, str] = {}
        link_href = None
        for idx, cell in enumerate(cells):
            field = col_map.get(idx)
            if field is None:
                continue
            values[field] = cell.get_text(" ", strip=True)
            a = cell.find("a", href=True)
            if a and link_href is None:
                link_href = a["href"]

        title_cell = values.get("title_cell", "")
        organisation = values.get("organisation", "")
        if not title_cell and not organisation:
            continue  # not a data row (e.g. a spacer/pager row)

        # The title cell usually bundles "Title", "Ref No", "Tender Id" on
        # separate lines; keep the first non-empty line as the title and
        # try to pull a reference number out of the rest.
        lines = [l.strip() for l in title_cell.splitlines() if l.strip()]
        title = lines[0] if lines else title_cell
        ref_match = re.search(r"(Ref\.?\s*No\.?|Tender\s*ID)\s*[:\-]?\s*(\S+)", title_cell, re.I)
        tender_ref = ref_match.group(2) if ref_match else None

        url = f"{BASE}{link_href}" if link_href and link_href.startswith("/") else link_href

        rec = TenderRecord(
            id=make_id(SOURCE, tender_ref or title, organisation, values.get("published_date", "")),
            source=SOURCE,
            title=title,
            organisation=organisation,
            tender_ref=tender_ref,
            published_date=parse_date(values.get("published_date")),
            closing_date=parse_date(values.get("closing_date")),
            url=url,
        )
        records.append(rec)

    # Pagination: GePNIC pagers are ASP.NET postback links like
    # javascript:__doPostBack('ctl00$...$lnkbtn_PageNext','')
    next_target = None
    for a in soup.find_all("a", href=True):
        if "pagenext" in a["href"].lower() or (a.get_text(strip=True) == ">" and "__dopostback" in a["href"].lower()):
            m = re.search(r"__doPostBack\('([^']+)'", a["href"])
            if m:
                next_target = m.group(1)
                break

    return records, next_target


def _extract_aspnet_fields(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    fields = {}
    for name in ("__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"):
        tag = soup.find("input", {"name": name})
        if tag and tag.get("value") is not None:
            fields[name] = tag["value"]
    return fields


def scrape() -> tuple[list[TenderRecord], list[str]]:
    """Returns (panchayat_records, warnings). Never raises -- a failure to
    reach or parse the site shows up as a warning + empty record list, so
    the rest of the pipeline (and the other source) keeps working."""
    from .common import new_session

    warnings: list[str] = []
    session = new_session()

    resp = polite_get(session, LATEST_ACTIVE_URL)
    if resp is None:
        warnings.append(f"{SOURCE}: could not fetch {LATEST_ACTIVE_URL}")
        return [], warnings

    all_records: list[TenderRecord] = []
    html = resp.text
    seen_targets: set[str] = set()

    for page_num in range(1, MAX_PAGES + 1):
        records, next_target = _parse_listing_page(html)
        all_records.extend(records)

        if not next_target or next_target in seen_targets:
            break
        seen_targets.add(next_target)

        form_fields = _extract_aspnet_fields(html)
        if not form_fields:
            warnings.append(f"{SOURCE}: page {page_num} had a next-page link but no ASP.NET form fields; stopping pagination")
            break
        form_fields["__EVENTTARGET"] = next_target
        form_fields["__EVENTARGUMENT"] = ""

        resp = polite_post(session, LATEST_ACTIVE_URL, data=form_fields)
        if resp is None:
            warnings.append(f"{SOURCE}: pagination POST failed on page {page_num + 1}")
            break
        html = resp.text
    else:
        warnings.append(f"{SOURCE}: hit MAX_PAGES={MAX_PAGES} safety cap; there may be more results")

    if not all_records:
        warnings.append(f"{SOURCE}: parsed 0 rows from the listing page -- the site markup likely changed, see README")

    panchayat_records = [r for r in all_records if looks_like_panchayat(r.organisation)]
    warnings.append(f"{SOURCE}: {len(all_records)} total rows parsed, {len(panchayat_records)} matched panchayat/LSGD keywords")
    return panchayat_records, warnings
