"""Daily job: scrape, merge with yesterday's data, write docs/data/*.json."""
from __future__ import annotations

import datetime as dt
import json
import os
from pathlib import Path

from . import kerala_etenders
from .classify import classify
from .geo import body_positions, pincode_positions, position
from .common import IST, body_name, today_ist

DATA_DIR = Path(__file__).resolve().parent.parent / "docs" / "data"
TENDERS_FILE = DATA_DIR / "tenders.json"
NEW_TODAY_FILE = DATA_DIR / "new_today.json"
BODIES_FILE = DATA_DIR / "bodies.json"
PINCODES_FILE = DATA_DIR / "pincodes.json"
PLACES_FILE = DATA_DIR / "places.json"
META_FILE = DATA_DIR / "meta.json"

DETAIL_BUDGET = int(os.environ.get("DETAIL_BUDGET") or 1200)  # detail pages per run; ~35 min per 1,200 at the polite delay
GRACE_DAYS = 3  # keep a tender this many days if the portal is briefly unreachable


def load_existing() -> dict[str, dict]:
    try:
        return {r["id"]: r for r in json.loads(TENDERS_FILE.read_text())}
    except (FileNotFoundError, json.JSONDecodeError, KeyError, TypeError):
        return {}


def merge(existing: dict[str, dict], fresh: list[dict], today: dt.date) -> tuple[list[dict], set[str]]:
    today_iso = today.isoformat()
    merged: dict[str, dict] = {}
    new_ids: set[str] = set()
    for rec in fresh:
        prior = existing.get(rec["id"])
        rec["first_seen"] = prior["first_seen"] if prior else today_iso
        rec["last_seen"] = today_iso
        if not prior:
            new_ids.add(rec["id"])
        merged[rec["id"]] = rec
    for tid, rec in existing.items():
        if tid in merged:
            continue
        closing = rec.get("closing_date")
        if closing and closing < today_iso:
            continue
        last_seen = rec.get("last_seen") or today_iso
        if (today - dt.date.fromisoformat(last_seen)).days > GRACE_DAYS:
            continue
        merged[tid] = rec
    records = [r for r in merged.values() if not (r.get("closing_date") and r["closing_date"] < today_iso)]
    records.sort(key=lambda r: (r.get("closing_date") or "9999", r.get("title") or ""))
    return records, new_ids


def update_bodies(records: list[dict], today: dt.date) -> dict[str, dict]:
    """Permanent register of every local body ever seen, so a panchayat with
    no open tender today is still searchable. `seen_ids` counts unique tenders."""
    try:
        bodies = json.loads(BODIES_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        bodies = {}
    today_iso = today.isoformat()
    open_now: dict[str, int] = {}
    for r in records:
        name = r.get("body_name")
        if not name:
            continue
        open_now[name] = open_now.get(name, 0) + 1
        b = bodies.setdefault(name, {"type": r.get("body_type"), "district": r.get("district"), "first_seen": today_iso, "tenders_seen": 0, "seen_ids": []})
        tid = r.get("tender_id") or r["id"]
        if tid not in b["seen_ids"]:
            b["seen_ids"].append(tid)
            b["tenders_seen"] = len(b["seen_ids"])
        b["last_seen"] = today_iso
        if not b.get("district") and r.get("district"):
            b["district"] = r["district"]
    for name, b in bodies.items():
        b["open"] = open_now.get(name, 0)
        b["seen_ids"] = b["seen_ids"][-500:]
    return dict(sorted(bodies.items()))


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    today = today_ist()
    existing = load_existing()

    try:
        fresh, notes = kerala_etenders.scrape(existing, DETAIL_BUDGET)
    except Exception as exc:  # noqa: BLE001 - keep yesterday's data if the scraper breaks
        fresh, notes = [], [f"kerala_etenders: unhandled error: {exc!r}"]

    first_run = not existing
    records, new_ids = merge(existing, fresh, today)
    for r in records:
        r["body_name"] = body_name(r.get("organisation", ""), r.get("body_type"), r.get("district"))
        r["grp"], r["kind"], r["job"] = classify(r.get("title", ""), r.get("category"))
    try:
        register = json.loads(BODIES_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        register = {}
    body_pos = body_positions(records, {k: v.get("pos") for k, v in register.items()})
    for r in records:
        r["geo"] = position(r, body_pos)
    new_today = [] if first_run else [r for r in records if r["id"] in new_ids]

    def dump(path: Path, obj) -> None:
        path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))

    dump(TENDERS_FILE, records)
    bodies = update_bodies(records, today)
    for name, pos in body_pos.items():
        if name in bodies:
            bodies[name]["pos"] = pos
    dump(BODIES_FILE, bodies)
    dump(PINCODES_FILE, {k: list(v) for k, v in sorted(pincode_positions().items())})
    dump(PLACES_FILE, {k: v for k, v in sorted(body_pos.items())})
    dump(NEW_TODAY_FILE, new_today)
    META_FILE.write_text(json.dumps({
        "last_run": dt.datetime.now(IST).isoformat(timespec="seconds"),
        "today": today.isoformat(),
        "total_active": len(records),
        "new_today": len(new_today),
        "scraped_this_run": len(fresh),
        "notes": notes,
    }, ensure_ascii=False, indent=2))

    print(f"Done: {len(records)} active tenders, {len(new_today)} new today.")
    for n in notes:
        print("  -", n)


if __name__ == "__main__":
    main()
