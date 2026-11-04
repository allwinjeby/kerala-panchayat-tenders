"""Secondary source: the Local Self Government Department's own website
(lsgkerala.gov.in), which publishes a "Tenders" listing separate from the
state e-Tenders portal (often used for smaller works below the mandatory
e-tendering threshold). Built on the common Kerala-govt Drupal theme, so
this targets Drupal's typical "views" listing markup with a few fallbacks.

Not verified against the live site from this environment (network access
to *.kerala.gov.in is blocked here) -- see README for how to check/fix it
against the real page once the GitHub Action can reach it.
"""
from __future__ import annotations

from bs4 import BeautifulSoup

from .common import TenderRecord, make_id, parse_date, polite_get, new_session

BASE = "https://lsgkerala.gov.in"
TENDERS_URL = f"{BASE}/en/tenders"
SOURCE = "lsgkerala"
MAX_PAGES = 10


def _parse_listing_page(html: str, page_url: str) -> list[TenderRecord]:
    soup = BeautifulSoup(html, "lxml")
    records: list[TenderRecord] = []

    rows = soup.select(".view-content .views-row") or soup.select("table.views-table tbody tr") or soup.select("article.node--type-tender")

    for row in rows:
        a = row.find("a", href=True)
        if not a:
            continue
        title = a.get_text(" ", strip=True)
        if not title:
            continue
        href = a["href"]
        url = href if href.startswith("http") else f"{BASE}{href}"

        text = row.get_text(" ", strip=True)
        date_field = row.select_one("time, .date-display-single, .field--name-field-date")
        closing_date = None
        if date_field is not None:
            closing_date = parse_date(date_field.get("datetime")) or parse_date(date_field.get_text(strip=True))

        rec = TenderRecord(
            id=make_id(SOURCE, title, url),
            source=SOURCE,
            title=title,
            organisation="Local Self Government Department",
            closing_date=closing_date,
            url=url,
            extra={"raw_text": text[:300]},
        )
        records.append(rec)

    return records


def _find_next_page_url(html: str, current_url: str) -> str | None:
    soup = BeautifulSoup(html, "lxml")
    next_link = soup.select_one("a[rel='next'], .pager__item--next a")
    if next_link and next_link.get("href"):
        href = next_link["href"]
        return href if href.startswith("http") else f"{BASE}{href}"
    return None


def scrape() -> tuple[list[TenderRecord], list[str]]:
    """Returns (records, warnings). Never raises."""
    warnings: list[str] = []
    session = new_session()

    url = TENDERS_URL
    all_records: list[TenderRecord] = []
    visited: set[str] = set()

    for page_num in range(1, MAX_PAGES + 1):
        if url in visited:
            break
        visited.add(url)

        resp = polite_get(session, url)
        if resp is None:
            if page_num == 1:
                warnings.append(f"{SOURCE}: could not fetch {url}")
            break

        records = _parse_listing_page(resp.text, url)
        all_records.extend(records)

        next_url = _find_next_page_url(resp.text, url)
        if not next_url:
            break
        url = next_url
    else:
        warnings.append(f"{SOURCE}: hit MAX_PAGES={MAX_PAGES} safety cap; there may be more results")

    if not all_records:
        warnings.append(f"{SOURCE}: parsed 0 tenders -- the page markup likely differs from what this scraper expects, see README")
    else:
        warnings.append(f"{SOURCE}: {len(all_records)} tenders parsed")

    return all_records, warnings
