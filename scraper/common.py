"""Shared helpers used by every source scraper: HTTP session, robots.txt
compliance, date parsing, and the normalized tender record shape."""
from __future__ import annotations

import datetime as dt
import hashlib
import re
import time
import urllib.robotparser as robotparser
from dataclasses import dataclass, field
from urllib.parse import urljoin, urlparse

import requests

USER_AGENT = "KeralaPanchayatTenderWatch/1.0 (+github.com/{owner}/{repo}; personal, non-commercial, low-rate daily scrape)"

REQUEST_TIMEOUT = 30
REQUEST_DELAY_SECONDS = 2.0

PANCHAYAT_KEYWORDS = (
    "panchayat",
    "panchayath",
    "grama",
    "gramam",
    "lsgd",
    "local self government",
    "block panchayat",
    "district panchayat",
)


def new_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


_robots_cache: dict[str, robotparser.RobotFileParser] = {}


def robots_allows(url: str, session: requests.Session) -> bool:
    """Check robots.txt for the given URL's host, caching per-host. Fails
    open (returns True) only if robots.txt itself can't be fetched, since a
    missing robots.txt conventionally means "no restrictions"."""
    parsed = urlparse(url)
    host = f"{parsed.scheme}://{parsed.netloc}"
    rp = _robots_cache.get(host)
    if rp is None:
        rp = robotparser.RobotFileParser()
        rp.set_url(urljoin(host, "/robots.txt"))
        try:
            resp = session.get(rp.url, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 200:
                rp.parse(resp.text.splitlines())
            else:
                rp.parse([])  # no robots.txt -> allow all
        except requests.RequestException:
            rp.parse([])
        _robots_cache[host] = rp
    return rp.can_fetch(USER_AGENT, url)


def polite_get(session: requests.Session, url: str, **kwargs) -> requests.Response | None:
    """GET a URL, honoring robots.txt and a fixed delay between requests.
    Returns None (and never raises) if robots.txt disallows it or the
    request fails, so one bad fetch never kills the whole scrape."""
    if not robots_allows(url, session):
        print(f"[skip] robots.txt disallows: {url}")
        return None
    time.sleep(REQUEST_DELAY_SECONDS)
    try:
        resp = session.get(url, timeout=REQUEST_TIMEOUT, **kwargs)
        resp.raise_for_status()
        return resp
    except requests.RequestException as exc:
        print(f"[error] GET {url} failed: {exc}")
        return None


def polite_post(session: requests.Session, url: str, data: dict, **kwargs) -> requests.Response | None:
    if not robots_allows(url, session):
        print(f"[skip] robots.txt disallows: {url}")
        return None
    time.sleep(REQUEST_DELAY_SECONDS)
    try:
        resp = session.post(url, data=data, timeout=REQUEST_TIMEOUT, **kwargs)
        resp.raise_for_status()
        return resp
    except requests.RequestException as exc:
        print(f"[error] POST {url} failed: {exc}")
        return None


def looks_like_panchayat(organisation: str) -> bool:
    text = (organisation or "").lower()
    return any(kw in text for kw in PANCHAYAT_KEYWORDS)


_DATE_PATTERNS = (
    "%d-%b-%Y %I:%M %p",
    "%d-%b-%Y",
    "%d %b %Y",
    "%d/%m/%Y %I:%M %p",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%Y-%m-%d",
)


def parse_date(text: str | None) -> str | None:
    """Best-effort parse of the many date formats Indian govt portals use.
    Returns an ISO date string (YYYY-MM-DD) or None if unparseable."""
    if not text:
        return None
    cleaned = re.sub(r"\s+", " ", text).strip()
    cleaned = re.sub(r"\s*\(.*?\)\s*", "", cleaned)  # strip "(2 Days left)" etc.
    for pattern in _DATE_PATTERNS:
        try:
            return dt.datetime.strptime(cleaned, pattern).date().isoformat()
        except ValueError:
            continue
    return None


def make_id(source: str, *parts: str) -> str:
    """Stable id for dedup: prefer a real reference number when we have
    one; otherwise hash the distinguishing fields."""
    joined = "|".join(p.strip() for p in parts if p)
    digest = hashlib.sha1(joined.encode("utf-8")).hexdigest()[:16]
    return f"{source}:{digest}"


@dataclass
class TenderRecord:
    id: str
    source: str
    title: str
    organisation: str
    tender_ref: str | None = None
    published_date: str | None = None
    closing_date: str | None = None
    value_estimate: str | None = None
    url: str | None = None
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = {
            "id": self.id,
            "source": self.source,
            "title": self.title,
            "organisation": self.organisation,
            "tender_ref": self.tender_ref,
            "published_date": self.published_date,
            "closing_date": self.closing_date,
            "value_estimate": self.value_estimate,
            "url": self.url,
        }
        d.update(self.extra)
        return d
