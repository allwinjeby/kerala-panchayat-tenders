"""Daily orchestrator: run every source scraper, merge results with what
was already known, and write the data files the dashboard reads. Designed
to never crash the whole pipeline because one source failed -- each source
error becomes a warning in meta.json instead.
"""
from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

from . import kerala_etenders, lsgkerala
from .common import TenderRecord

DATA_DIR = Path(__file__).resolve().parent.parent / "docs" / "data"
HISTORY_DIR = DATA_DIR / "history"
TENDERS_FILE = DATA_DIR / "tenders.json"
NEW_TODAY_FILE = DATA_DIR / "new_today.json"
META_FILE = DATA_DIR / "meta.json"

GRACE_DAYS = 3  # tolerate a source being briefly unreachable before dropping its listings
HISTORY_RETENTION_DAYS = 60  # keep history/ from growing forever

SOURCES = {
    "kerala_etenders": kerala_etenders.scrape,
    "lsgkerala": lsgkerala.scrape,
}


def _load_existing() -> dict[str, dict]:
    if not TENDERS_FILE.exists():
        return {}
    try:
        data = json.loads(TENDERS_FILE.read_text())
        return {rec["id"]: rec for rec in data}
    except (json.JSONDecodeError, KeyError):
        return {}


def _is_expired(closing_date: str | None, today: dt.date) -> bool:
    if not closing_date:
        return False
    try:
        return dt.date.fromisoformat(closing_date) < today
    except ValueError:
        return False


def _is_stale(last_seen: str, today: dt.date) -> bool:
    try:
        last = dt.date.fromisoformat(last_seen)
    except ValueError:
        return True
    return (today - last).days > GRACE_DAYS


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)

    today = dt.datetime.now(dt.timezone.utc).date()
    today_iso = today.isoformat()

    existing = _load_existing()
    all_warnings: list[str] = []
    source_counts: dict[str, int] = {}
    fresh_records: list[TenderRecord] = []

    for name, scrape_fn in SOURCES.items():
        try:
            records, warnings = scrape_fn()
        except Exception as exc:  # noqa: BLE001 - a source must never take down the run
            records, warnings = [], [f"{name}: unhandled exception: {exc!r}"]
        fresh_records.extend(records)
        source_counts[name] = len(records)
        all_warnings.extend(warnings)

    merged: dict[str, dict] = {}
    new_today_ids: set[str] = set()

    for rec in fresh_records:
        d = rec.to_dict()
        prior = existing.get(d["id"])
        d["first_seen"] = prior["first_seen"] if prior else today_iso
        d["last_seen"] = today_iso
        if not prior:
            new_today_ids.add(d["id"])
        merged[d["id"]] = d

    # Carry forward anything not seen in today's fresh scrape, unless it's
    # expired or has been missing for too many days in a row.
    for tid, d in existing.items():
        if tid in merged:
            continue
        if _is_expired(d.get("closing_date"), today):
            continue
        if _is_stale(d.get("last_seen", today_iso), today):
            continue
        merged[tid] = d

    def sort_key(d: dict):
        return (d.get("closing_date") is None, d.get("closing_date") or "", d.get("title") or "")

    all_records = sorted(merged.values(), key=sort_key)
    new_today = [d for d in all_records if d["id"] in new_today_ids]

    TENDERS_FILE.write_text(json.dumps(all_records, indent=2, ensure_ascii=False))
    NEW_TODAY_FILE.write_text(json.dumps(new_today, indent=2, ensure_ascii=False))
    (HISTORY_DIR / f"{today_iso}.json").write_text(json.dumps(all_records, indent=2, ensure_ascii=False))

    meta = {
        "last_run_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "total_active": len(all_records),
        "new_today": len(new_today),
        "source_counts": source_counts,
        "warnings": all_warnings,
    }
    META_FILE.write_text(json.dumps(meta, indent=2, ensure_ascii=False))

    _prune_history(today)

    print(f"Done. {len(all_records)} active tenders ({len(new_today)} new today).")
    for w in all_warnings:
        print(f"  - {w}")


def _prune_history(today: dt.date) -> None:
    cutoff = today - dt.timedelta(days=HISTORY_RETENTION_DAYS)
    for f in HISTORY_DIR.glob("*.json"):
        try:
            file_date = dt.date.fromisoformat(f.stem)
        except ValueError:
            continue
        if file_date < cutoff:
            f.unlink()


if __name__ == "__main__":
    main()
