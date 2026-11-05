"""Daily AI analysis of open tenders with Claude, via the Message Batches API
(half price; results usually within the hour, at most 24h).

Each run:
  1. Collects the batch submitted by an earlier run, if it has finished.
  2. Submits a new batch for open tenders that have no analysis yet, newest
     first and tenders with a known value first, up to AI_DAILY_LIMIT.
  3. Waits up to AI_WAIT_MINUTES for that batch; whatever isn't done is
     picked up by the next run.
Analyses are written one file per tender to docs/data/ai/<tender_id>.json,
plus a compact docs/data/ai_index.json the dashboard uses for badges and
filters. Analyses for tenders that are no longer open are deleted.

The analysis is generated from the public listing only (title, value, EMD,
period, category, location): tender documents and the BOQ are behind a
CAPTCHA on the portal and are not read. The prompt makes the model say so
and keep its confidence honest.

Needs the ANTHROPIC_API_KEY secret; does nothing without it.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "docs" / "data"
AI_DIR = DATA_DIR / "ai"
INDEX_FILE = DATA_DIR / "ai_index.json"
STATE_FILE = ROOT / "data" / "ai_state.json"

MODEL = os.environ.get("AI_MODEL") or "claude-opus-5-5"
EFFORT = os.environ.get("AI_EFFORT") or "medium"
DAILY_LIMIT = int(os.environ.get("AI_DAILY_LIMIT") or 300)
WAIT_MINUTES = float(os.environ.get("AI_WAIT_MINUTES") or 40)

SYSTEM_PROMPT = """You are a senior civil-works estimator in Kerala, India, advising a small/medium contractor who bids on Local Self Government Department (panchayat and municipality) works through the Kerala e-Tenders portal.

For each tender you get only what the public listing shows: the work title, the department's estimated contract value (PAC, in rupees, if known), EMD, tender fee, period of work, work category, location and the issuing local body. You do NOT have the tender documents, drawings or the bill of quantities (BOQ).

Produce a practical pre-bid assessment:
- summary: one or two plain sentences on what the work most likely involves.
- difficulty: score 1 (very simple) to 10 (very complex) with short reasons (technical complexity, site access, timeline, specialised machinery or licences).
- profit: score 1 (poor) to 10 (excellent) for the chance of making a healthy profit, with a realistic net margin range in percent (after all costs) and short reasons. Typical LSGD civil works earn single-digit to low-teens net margins when executed well; works priced on outdated schedule rates, very small works, remote sites, and works with heavy competition earn less. Do not promise profit.
- competition: Low, Medium or High, with one reason.
- cost_estimate: an itemised estimate of what it would cost the contractor to execute the work. First infer plausible quantities that are consistent with the estimated value and the title (for example, for a concrete road worth Rs 8 lakh, infer an approximate length, width and thickness), and state these as assumptions. Then list line items with category (Material, Labour, Machinery, Transport, Overheads), quantity, unit and a current (2026) Kerala market rate in rupees. Use realistic units (cum, sqm, m, kg, bag, tonne, nos, day, trip, LS). Include cement, aggregate, sand/M-sand, steel, bitumen, bricks/blocks, pipes, electrical items etc. only where the work needs them. Keep to 6-16 items. Include contingency_pct (usually 3-10).
- requirements: machinery, manpower, licences/registration class or experience the work likely needs.
- risks: the main things that could cause loss or delay (monsoon, site disputes, rate escalation, delayed bill payment, etc.).
- tips: concrete, practical bidding or execution tips for this specific work.
- confidence: Low if the value is unknown or the title is vague; Medium normally; High only when the title clearly defines the scope.

Write in simple English a contractor understands. Never invent facts that are not implied by the listing; label inferences as assumptions."""

SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "difficulty": {
            "type": "object",
            "properties": {
                "score": {"type": "integer"},
                "level": {"type": "string", "enum": ["Easy", "Moderate", "Hard", "Very hard"]},
                "reasons": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["score", "level", "reasons"],
            "additionalProperties": False,
        },
        "profit": {
            "type": "object",
            "properties": {
                "score": {"type": "integer"},
                "chance": {"type": "string", "enum": ["Low", "Medium", "High"]},
                "margin_pct_low": {"type": "number"},
                "margin_pct_high": {"type": "number"},
                "reasons": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["score", "chance", "margin_pct_low", "margin_pct_high", "reasons"],
            "additionalProperties": False,
        },
        "competition": {
            "type": "object",
            "properties": {
                "level": {"type": "string", "enum": ["Low", "Medium", "High"]},
                "reason": {"type": "string"},
            },
            "required": ["level", "reason"],
            "additionalProperties": False,
        },
        "cost_estimate": {
            "type": "object",
            "properties": {
                "assumptions": {"type": "array", "items": {"type": "string"}},
                "items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "item": {"type": "string"},
                            "category": {"type": "string", "enum": ["Material", "Labour", "Machinery", "Transport", "Overheads"]},
                            "quantity": {"type": "number"},
                            "unit": {"type": "string"},
                            "rate_inr": {"type": "number"},
                        },
                        "required": ["item", "category", "quantity", "unit", "rate_inr"],
                        "additionalProperties": False,
                    },
                },
                "contingency_pct": {"type": "number"},
            },
            "required": ["assumptions", "items", "contingency_pct"],
            "additionalProperties": False,
        },
        "requirements": {"type": "array", "items": {"type": "string"}},
        "risks": {"type": "array", "items": {"type": "string"}},
        "tips": {"type": "array", "items": {"type": "string"}},
        "confidence": {"type": "string", "enum": ["Low", "Medium", "High"]},
    },
    "required": ["summary", "difficulty", "profit", "competition", "cost_estimate", "requirements", "risks", "tips", "confidence"],
    "additionalProperties": False,
}


def tender_prompt(t: dict) -> str:
    def rupees(v):
        return f"Rs {v:,}" if isinstance(v, (int, float)) else "not published in the listing"
    lines = [
        f"Work title: {t.get('title')}",
        f"Issued by: {t.get('body_name') or t.get('organisation')} ({t.get('body_type')}), {t.get('district') or 'district unknown'} district, Kerala",
        f"Department path: {(t.get('org_chain') or '').replace('||', ' > ')}",
        f"Estimated contract value (PAC): {rupees(t.get('value'))}",
        f"EMD: {rupees(t.get('emd'))}",
        f"Tender fee: {rupees(t.get('tender_fee'))}",
        f"Work category: {t.get('category') or 'unknown'}",
        f"Tender type: {t.get('tender_type') or 'unknown'}",
        f"Period of work: {(t.get('work_days') + ' days') if t.get('work_days') else 'unknown'}",
        f"Location: {t.get('location') or 'unknown'} {t.get('pincode') or ''}".strip(),
        f"Bid submission closes: {t.get('closing_time') or t.get('closing_date')}",
        f"Reference: {t.get('tender_ref') or '-'}",
    ]
    return "Assess this tender.\n\n" + "\n".join(lines)


def build_request(t: dict) -> dict:
    return {
        "custom_id": t["tender_id"],
        "params": {
            "model": MODEL,
            "max_tokens": 16000,
            "system": [{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            "messages": [{"role": "user", "content": tender_prompt(t)}],
            "output_config": {"effort": EFFORT, "format": {"type": "json_schema", "schema": SCHEMA}},
        },
    }


def index_entry(a: dict) -> dict:
    items = a.get("cost_estimate", {}).get("items", [])
    direct = sum((i.get("quantity") or 0) * (i.get("rate_inr") or 0) for i in items)
    est = round(direct * (1 + (a.get("cost_estimate", {}).get("contingency_pct") or 0) / 100))
    return {
        "d": a["difficulty"]["score"], "dl": a["difficulty"]["level"],
        "p": a["profit"]["score"], "pc": a["profit"]["chance"],
        "ml": a["profit"]["margin_pct_low"], "mh": a["profit"]["margin_pct_high"],
        "c": a["competition"]["level"], "cost": est, "conf": a["confidence"],
    }


def candidates(tenders: list[dict], done: set[str], pending: set[str], now_iso: str) -> list[dict]:
    pool = [t for t in tenders
            if t.get("tender_id") and t["tender_id"] not in done and t["tender_id"] not in pending
            and (t.get("closing_date") or "9999") > now_iso[:10]]
    # Panchayat works with a known value first, newest first.
    pool.sort(key=lambda t: (
        bool(t.get("details_fetched")),
        "Panchayat" in (t.get("body_type") or ""),
        t.get("published_date") or "",
    ), reverse=True)
    return pool[:DAILY_LIMIT]


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_results(client, batch_id: str, generated: str) -> tuple[int, int]:
    ok = failed = 0
    AI_DIR.mkdir(parents=True, exist_ok=True)
    for res in client.messages.batches.results(batch_id):
        if res.result.type != "succeeded":
            failed += 1
            continue
        msg = res.result.message
        if msg.stop_reason != "end_turn":
            failed += 1
            continue
        text = next((b.text for b in msg.content if b.type == "text"), "")
        try:
            analysis = json.loads(text)
        except json.JSONDecodeError:
            failed += 1
            continue
        analysis["model"] = msg.model
        analysis["generated"] = generated
        (AI_DIR / f"{res.custom_id}.json").write_text(json.dumps(analysis, ensure_ascii=False, separators=(",", ":")))
        ok += 1
    return ok, failed


def wait_for(client, batch_id: str, deadline: float) -> bool:
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        if batch.processing_status == "ended":
            return True
        if time.time() > deadline:
            return False
        time.sleep(30)


def rebuild_index(open_ids: set[str]) -> dict:
    index = {}
    AI_DIR.mkdir(parents=True, exist_ok=True)
    for f in AI_DIR.glob("*.json"):
        if f.stem not in open_ids:
            f.unlink()
            continue
        try:
            index[f.stem] = index_entry(json.loads(f.read_text()))
        except (json.JSONDecodeError, KeyError, TypeError):
            f.unlink()
    INDEX_FILE.write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
    return index


def main() -> None:
    tenders = load_json(DATA_DIR / "tenders.json", [])
    open_ids = {t["tender_id"] for t in tenders if t.get("tender_id")}
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("AI analysis skipped: ANTHROPIC_API_KEY is not set.")
        rebuild_index(open_ids)
        return

    import anthropic

    client = anthropic.Anthropic()
    deadline = time.time() + WAIT_MINUTES * 60
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=5, minutes=30)))
    state = load_json(STATE_FILE, {})
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)

    try:
        if state.get("batch_id"):
            if wait_for(client, state["batch_id"], deadline):
                ok, failed = save_results(client, state["batch_id"], state.get("submitted", now.isoformat(timespec="seconds")))
                print(f"Collected earlier batch {state['batch_id']}: {ok} analyses, {failed} failed.")
                state = {}
            else:
                print(f"Earlier batch {state['batch_id']} still processing; will collect next run.")
                STATE_FILE.write_text(json.dumps(state))
                rebuild_index(open_ids)
                return

        done = {f.stem for f in AI_DIR.glob("*.json")} if AI_DIR.exists() else set()
        todo = candidates(tenders, done, set(), now.isoformat())
        if not todo:
            print("No tenders need analysis.")
        else:
            batch = client.messages.batches.create(requests=[build_request(t) for t in todo])
            state = {"batch_id": batch.id, "submitted": now.isoformat(timespec="seconds"), "count": len(todo), "model": MODEL}
            STATE_FILE.write_text(json.dumps(state))
            print(f"Submitted batch {batch.id} with {len(todo)} tenders ({MODEL}, effort {EFFORT}).")
            if wait_for(client, batch.id, deadline):
                ok, failed = save_results(client, batch.id, state["submitted"])
                print(f"Batch done: {ok} analyses, {failed} failed.")
                state = {}
            else:
                print("Batch still processing; will collect next run.")
        STATE_FILE.write_text(json.dumps(state))
    except anthropic.AuthenticationError:
        print("AI analysis failed: the ANTHROPIC_API_KEY secret is invalid.", file=sys.stderr)
    except anthropic.PermissionDeniedError as e:
        print(f"AI analysis failed: permission denied ({e.message}).", file=sys.stderr)
    except anthropic.RateLimitError:
        print("AI analysis hit a rate limit; will retry next run.", file=sys.stderr)
    except anthropic.APIStatusError as e:
        print(f"AI analysis API error {e.status_code}: {e.message}", file=sys.stderr)
    except anthropic.APIConnectionError:
        print("AI analysis could not reach the API; will retry next run.", file=sys.stderr)

    index = rebuild_index(open_ids)
    print(f"AI index: {len(index)} open tenders analysed.")


if __name__ == "__main__":
    main()
