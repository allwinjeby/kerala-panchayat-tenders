"""Scraper for the Kerala e-Tenders portal (etenders.kerala.gov.in, NIC GePNIC).

Flow (all public, no login, no CAPTCHA):
  1. "Tenders by Organisation" page lists every organisation with a link.
  2. Following an organisation's link (same session) returns ALL its active
     tenders in one table -- for Local Self Government Department that is
     every panchayat / municipality works tender in the state.
  3. Each row links to a detail page with tender value, EMD, category,
     location. Detail links only work inside the session that produced
     them, so details are fetched here and the dashboard links to the
     portal's search page by Tender ID instead.
The "Active Tenders" and search pages need a CAPTCHA; they are not used.
"""
from __future__ import annotations

import re

from bs4 import BeautifulSoup

from .common import classify_body, find_district, new_session, parse_date, parse_rupees, polite_get

BASE = "https://etenders.kerala.gov.in"
ORG_LIST_URL = f"{BASE}/nicgep/app?page=FrontEndTendersByOrganisation&service=page"
SOURCE = "kerala_etenders"
DETAIL_FIELDS = {
    "Tender Value in ₹": "value",
    "EMD Amount in ₹": "emd",
    "Tender Fee in ₹": "tender_fee",
    "Product Category": "category",
    "Tender Category": "tender_category",
    "Tender Type": "tender_type",
    "Location": "location",
    "Pincode": "pincode",
    "Period Of Work(Days)": "work_days",
}
MONEY_FIELDS = {"value", "emd", "tender_fee"}


def wanted_org(name: str) -> bool:
    low = name.lower()
    return "local self government" in low or "panchayat" in low or "panchayath" in low


def parse_org_list(html: str) -> list[tuple[str, int, str]]:
    """-> [(org name, tender count, link)]"""
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", id="table")
    out = []
    if table is None:
        return out
    for row in table.find_all("tr"):
        tds = row.find_all("td")
        if len(tds) < 3:
            continue
        a = row.find("a", href=True)
        name = tds[1].get_text(" ", strip=True)
        count = tds[2].get_text(strip=True)
        if a and name:
            out.append((name, int(count) if count.isdigit() else 0, a["href"]))
    return out


def split_title_cell(text: str) -> tuple[str, str | None, str | None]:
    """'[Title] [Ref No][2026_LSGD_885678_1]' -> (title, ref, tender_id)."""
    parts = [p.strip() for p in re.findall(r"\[([^\]]*)\]", text)]
    if not parts:
        return text.strip(), None, None
    tender_id = None
    if re.fullmatch(r"\d{4}_[A-Za-z0-9]+_\d+_\d+", parts[-1]):
        tender_id = parts.pop()
    title = parts[0] if parts else text.strip()
    ref = parts[1] if len(parts) > 1 else None
    return title, ref, tender_id


def parse_tender_list(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", id="table")
    records = []
    if table is None:
        return records
    for row in table.find_all("tr"):
        tds = row.find_all("td")
        if len(tds) < 6 or "list_header" in (row.get("class") or []):
            continue
        cells = [td.get_text(" ", strip=True) for td in tds]
        title, ref, tender_id = split_title_cell(cells[4])
        if not tender_id:
            continue
        chain = cells[5]
        chain_parts = [p.strip() for p in chain.split("||") if p.strip()]
        a = tds[4].find("a", href=True)
        records.append({
            "id": f"{SOURCE}:{tender_id}",
            "tender_id": tender_id,
            "title": title,
            "tender_ref": ref,
            "published_date": parse_date(cells[1]),
            "closing_date": parse_date(cells[2]),
            "closing_time": cells[2],
            "opening_date": parse_date(cells[3]),
            "organisation": chain_parts[-1] if chain_parts else chain,
            "org_chain": chain,
            "district": find_district(*chain_parts[1:], title),
            "body_type": classify_body(chain),
            "_detail_href": a["href"] if a else None,
        })
    return records


def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    cells = [td.get_text(" ", strip=True) for td in soup.find_all("td")]
    out = {}
    for i, text in enumerate(cells[:-1]):
        key = DETAIL_FIELDS.get(text)
        if key and key not in out:
            val = cells[i + 1]
            out[key] = parse_rupees(val) if key in MONEY_FIELDS else (val or None)
    return out


def scrape(known: dict[str, dict], detail_budget: int) -> tuple[list[dict], list[str]]:
    """Return (records, notes). `known` maps id -> previously stored record so
    details already fetched are reused; at most `detail_budget` new detail
    pages are fetched per run (the rest are filled on later runs)."""
    notes: list[str] = []
    session = new_session()

    resp = polite_get(session, ORG_LIST_URL)
    if resp is None:
        return [], [f"{SOURCE}: could not load the organisation list"]
    orgs = [o for o in parse_org_list(resp.text) if wanted_org(o[0])]
    if not orgs:
        return [], [f"{SOURCE}: no LSGD/panchayat organisations found on the organisation list (page layout may have changed)"]

    records: dict[str, dict] = {}
    for name, count, href in orgs:
        r = polite_get(session, BASE + href)
        if r is None:
            notes.append(f"{SOURCE}: failed to load tenders for {name}")
            continue
        rows = parse_tender_list(r.text)
        notes.append(f"{SOURCE}: {name}: {len(rows)} tenders (portal says {count})")
        for rec in rows:
            records.setdefault(rec["id"], rec)

    fetched = 0
    for rec in records.values():
        href = rec.pop("_detail_href", None)
        prior = known.get(rec["id"])
        if prior and prior.get("details_fetched"):
            for key in list(DETAIL_FIELDS.values()) + ["details_fetched"]:
                if key in prior:
                    rec[key] = prior[key]
            continue
        if fetched >= detail_budget or not href:
            continue
        r = polite_get(session, BASE + href)
        fetched += 1
        if r is None or "timed out" in r.text[:3000].lower():
            continue
        rec.update(parse_detail(r.text))
        rec["details_fetched"] = True
        if not rec.get("district"):
            rec["district"] = find_district(rec.get("location") or "")

    missing = sum(1 for r in records.values() if not r.get("details_fetched"))
    notes.append(f"{SOURCE}: fetched {fetched} detail pages this run; {missing} tenders still waiting for details")
    return list(records.values()), notes
