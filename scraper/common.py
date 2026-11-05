"""Shared helpers: polite HTTP (robots.txt + delay), date parsing, and
classification of Kerala local bodies and districts."""
from __future__ import annotations

import datetime as dt
import re
import time
import urllib.robotparser as robotparser
from urllib.parse import urljoin, urlparse

import requests

USER_AGENT = "KeralaPanchayatTenderWatch/1.0 (+https://github.com/allwinjeby/kerala-panchayat-tenders)"
REQUEST_TIMEOUT = 120
REQUEST_DELAY_SECONDS = 1.5
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))


def today_ist() -> dt.date:
    return dt.datetime.now(IST).date()


def new_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT})
    return s


_robots_cache: dict[str, robotparser.RobotFileParser] = {}


def robots_allows(url: str, session: requests.Session) -> bool:
    parsed = urlparse(url)
    host = f"{parsed.scheme}://{parsed.netloc}"
    rp = _robots_cache.get(host)
    if rp is None:
        rp = robotparser.RobotFileParser()
        try:
            resp = session.get(urljoin(host, "/robots.txt"), timeout=30)
            rp.parse(resp.text.splitlines() if resp.status_code == 200 else [])
        except requests.RequestException:
            rp.parse([])
        _robots_cache[host] = rp
    return rp.can_fetch(USER_AGENT, url)


def polite_get(session: requests.Session, url: str) -> requests.Response | None:
    """GET honoring robots.txt and a delay. Returns None instead of raising."""
    if not robots_allows(url, session):
        print(f"[skip] robots.txt disallows: {url}")
        return None
    for attempt in (1, 2, 3):
        time.sleep(REQUEST_DELAY_SECONDS if attempt == 1 else 15 * attempt)
        try:
            resp = session.get(url, timeout=REQUEST_TIMEOUT)
            resp.raise_for_status()
            return resp
        except requests.RequestException as exc:
            print(f"[error] GET {url} failed (attempt {attempt}/3): {exc}")
    return None


def parse_date(text: str | None) -> str | None:
    """'17-Nov-2026 05:00 PM' -> '2026-11-17'."""
    if not text:
        return None
    m = re.search(r"\d{1,2}-[A-Za-z]{3}-\d{4}", text)
    if not m:
        return None
    try:
        return dt.datetime.strptime(m.group(0), "%d-%b-%Y").date().isoformat()
    except ValueError:
        return None


def parse_rupees(text: str | None) -> int | None:
    """'83,971' -> 83971; 'NA' / '' -> None."""
    if not text:
        return None
    digits = re.sub(r"[^\d.]", "", text)
    if not digits:
        return None
    try:
        return int(float(digits))
    except ValueError:
        return None


DISTRICTS = {
    "Thiruvananthapuram": ("thiruvananthapuram", "trivandrum", "tvm"),
    "Kollam": ("kollam", "quilon", "klm"),
    "Pathanamthitta": ("pathanamthitta", "pta"),
    "Alappuzha": ("alappuzha", "alleppey", "alp"),
    "Kottayam": ("kottayam", "ktm"),
    "Idukki": ("idukki", "idk"),
    "Ernakulam": ("ernakulam", "ekm"),
    "Thrissur": ("thrissur", "trichur", "tcr", "trchr"),
    "Palakkad": ("palakkad", "palghat", "pkd"),
    "Malappuram": ("malappuram", "mlp"),
    "Kozhikode": ("kozhikode", "calicut", "kzd", "kkd"),
    "Wayanad": ("wayanad", "wyd"),
    "Kannur": ("kannur", "cannanore", "knr"),
    "Kasaragod": ("kasaragod", "kasargod", "ksd"),
}


def find_district(*texts: str) -> str | None:
    """First district named in any of the texts (full names first, then
    the short office codes like 'PKD' that appear in section-office names)."""
    for text in texts:
        low = (text or "").lower()
        for name, aliases in DISTRICTS.items():
            if aliases[0] in low or (len(aliases) > 1 and aliases[1] in low):
                return name
    for text in texts:
        words = set(re.findall(r"[a-z]+", (text or "").lower()))
        for name, aliases in DISTRICTS.items():
            if words & set(aliases[1:]):
                return name
    return None


def classify_body(chain: str) -> str:
    """Kind of local body that issued the tender, from the organisation chain."""
    low = chain.lower().replace("panchayath", "panchayat").replace("panchyat", "panchayat")
    last = low.split("||")[-1]
    for text in (last, low):
        if "district panchayat" in text or "jilla panchayat" in text:
            return "District Panchayat"
        if "block panchayat" in text:
            return "Block Panchayat"
        if "grama panchayat" in text or "gramapanchayat" in text or re.search(r"\bgp\b", text):
            return "Grama Panchayat"
        if "corporation" in text:
            return "Corporation"
        if "municipal" in text:
            return "Municipality"
        if "panchayat" in text:
            return "Panchayat (other)"
    return "Other LSGD"


PANCHAYAT_TYPES = {"Grama Panchayat", "Block Panchayat", "District Panchayat", "Panchayat (other)"}
