"""Approximate map position for each tender, for the "Near me" search.

Order of preference:
  "p"  the tender's pincode (from its detail page)        - good
  "b"  the issuing panchayat/municipality matched by name   - good
       to a post-office place in the same district
  "d"  the district's headquarters                          - rough
Postal places and coordinates: GeoNames (CC BY 4.0, https://www.geonames.org),
stored in data/kerala_postal.json by tools/fetch_geo.py.
"""
from __future__ import annotations

import difflib
import json
import re
from functools import lru_cache
from pathlib import Path

from .common import find_district

POSTAL_FILE = Path(__file__).resolve().parent.parent / "data" / "kerala_postal.json"

DISTRICT_HQ = {
    "Thiruvananthapuram": (8.5241, 76.9366), "Kollam": (8.8932, 76.6141), "Pathanamthitta": (9.2648, 76.7870),
    "Alappuzha": (9.4981, 76.3388), "Kottayam": (9.5916, 76.5222), "Idukki": (9.8494, 76.9720),
    "Ernakulam": (10.0159, 76.3419), "Thrissur": (10.5276, 76.2144), "Palakkad": (10.7867, 76.6548),
    "Malappuram": (11.0510, 76.0711), "Kozhikode": (11.2588, 75.7804), "Wayanad": (11.6854, 76.1320),
    "Kannur": (11.8745, 75.3704), "Kasaragod": (12.4996, 74.9869),
}
SUFFIX = re.compile(r"\s+(grama panchayat|block panchayat|district panchayat|municipality|corporation|panchayat \(other\))$", re.I)


def squash(name: str) -> str:
    """Spelling-tolerant key: 'Kuzhalmannam' ~ 'Kuzhalmandam', 'Nenmara' ~ 'Nemmara'."""
    s = re.sub(r"[^a-z]", "", (name or "").lower())
    for a, b in (("th", "t"), ("zh", "l"), ("nd", "n"), ("nm", "m"), ("ck", "k"), ("ph", "p"), ("dh", "d"), ("bh", "b"), ("kh", "k"), ("gh", "g"), ("ee", "i"), ("oo", "u"), ("w", "v"), ("y", "i")):
        s = s.replace(a, b)
    return re.sub(r"(.)\1+", r"\1", s)


@lru_cache(maxsize=1)
def _index():
    rows = json.loads(POSTAL_FILE.read_text()) if POSTAL_FILE.exists() else []
    pins: dict[str, list] = {}
    places: dict[str, dict[str, list]] = {}
    for pin, place, district, _taluk, lat, lng in rows:
        pins.setdefault(pin, []).append((lat, lng))
        d = find_district(district) or district
        for name in {place, re.sub(r"\s+(north|south|east|west|town|bazar|junction|r\.?s\.?|h\.?o\.?|s\.?o\.?|b\.?o\.?)$", "", place, flags=re.I)}:
            places.setdefault(d, {}).setdefault(squash(name), []).append((lat, lng))
    pin_pos = {p: (round(sum(a for a, _ in v) / len(v), 4), round(sum(b for _, b in v) / len(v), 4)) for p, v in pins.items()}
    place_pos = {d: {k: (round(sum(a for a, _ in v) / len(v), 4), round(sum(b for _, b in v) / len(v), 4)) for k, v in m.items()} for d, m in places.items()}
    return pin_pos, place_pos


def pincode_positions() -> dict[str, tuple[float, float]]:
    return _index()[0]


@lru_cache(maxsize=4096)
def locate_body(body_name: str, body_type: str | None, district: str | None) -> tuple[float, float] | None:
    if not body_name or body_type == "District Panchayat":
        return None
    core = SUFFIX.sub("", body_name).strip()
    key = squash(core)
    if len(key) < 3:
        return None
    _, place_pos = _index()
    pools = [place_pos.get(district or "", {})] if district else list(place_pos.values())
    for pool in pools:
        if key in pool:
            return pool[key]
        first = squash(core.split()[0]) if core.split() else ""
        if len(first) >= 5 and first in pool:
            return pool[first]
        close = difflib.get_close_matches(key, list(pool), n=1, cutoff=0.86)
        if close:
            return pool[close[0]]
        if len(key) >= 5:
            pref = [v for k, v in pool.items() if k.startswith(key)]
            if pref:
                return (round(sum(a for a, _ in pref) / len(pref), 4), round(sum(b for _, b in pref) / len(pref), 4))
    return None


def pin_position(t: dict) -> tuple[float, float] | None:
    pin = (t.get("pincode") or "").strip()
    pins = pincode_positions()
    return pins.get(pin) if re.fullmatch(r"6[789]\d{4}", pin) else None


def body_positions(records: list[dict], known: dict[str, list] | None = None) -> dict[str, list]:
    """Where each local body is, learned from its own tenders' pincodes (most
    common pincode wins), then from earlier runs, then by name lookup."""
    from collections import Counter
    pins: dict[str, Counter] = {}
    for t in records:
        if pin_position(t):
            pins.setdefault(t.get("body_name") or "", Counter())[t["pincode"].strip()] += 1
    out: dict[str, list] = {}
    for t in records:
        name = t.get("body_name") or ""
        if name in out or t.get("body_type") == "District Panchayat":
            continue
        if name in pins:
            out[name] = list(pincode_positions()[pins[name].most_common(1)[0][0]])
        elif known and known.get(name):
            out[name] = list(known[name])
        else:
            pos = locate_body(name, t.get("body_type"), t.get("district"))
            if pos:
                out[name] = list(pos)
    return out


def position(t: dict, bodies: dict[str, list] | None = None) -> list | None:
    """-> [lat, lng, precision] with precision 'p' (pincode), 'b' (panchayat), 'd' (district)."""
    pos = pin_position(t)
    if pos:
        return [*pos, "p"]
    pos = (bodies or {}).get(t.get("body_name") or "") or locate_body(t.get("body_name") or "", t.get("body_type"), t.get("district"))
    if pos:
        return [*pos[:2], "b"]
    if t.get("district") in DISTRICT_HQ:
        return [*DISTRICT_HQ[t["district"]], "d"]
    return None
