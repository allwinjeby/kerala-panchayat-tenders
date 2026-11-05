"""Parser tests against trimmed copies of real etenders.kerala.gov.in pages
(captured Nov 2026). Run: python3 tests/test_parsers.py"""
import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper.common import body_name, classify_body, find_district, parse_date, parse_rupees
from scraper.kerala_etenders import parse_detail, parse_org_list, parse_tender_list, split_title_cell, wanted_org
from scraper.run import merge

FIX = Path(__file__).parent / "fixtures"


def test_org_list():
    orgs = parse_org_list((FIX / "org_list.html").read_text())
    names = {n: c for n, c, _ in orgs}
    assert names["Local Self Government Department"] == 5314
    wanted = sorted(n for n, _, _ in orgs if wanted_org(n))
    assert wanted == ["Directorate of Panchayat", "Local Self Government Department", "Secretary Kannur District Panchayat"]


def test_tender_list():
    rows = parse_tender_list((FIX / "lsgd_tenders.html").read_text())
    assert len(rows) == 5
    first = rows[0]
    assert first["tender_id"] == "2026_LSGD_885678_1"
    assert first["title"].startswith("Annual Plan-Kuzhalmannam GP")
    assert first["tender_ref"] == "03/ET/RETEN/26-27/AE/LIDEW/KZM"
    assert first["closing_date"] == "2026-11-17"
    assert first["district"] == "Palakkad"
    assert first["body_type"] == "Grama Panchayat"
    assert first["_detail_href"].startswith("/nicgep/app?")


def test_detail():
    d = parse_detail((FIX / "tender_detail.html").read_text())
    assert d["value"] == 83971
    assert d["emd"] == 2099
    assert d["category"] == "Civil Works - Roads"
    assert d["pincode"] == "678702"


def test_helpers():
    assert parse_date("17-Nov-2026 05:00 PM") == "2026-11-17"
    assert parse_date("") is None
    assert parse_rupees("1,23,456") == 123456
    assert parse_rupees("NA") is None
    assert split_title_cell("[A road] [REF/1][2026_LSGD_1_1]") == ("A road", "REF/1", "2026_LSGD_1_1")
    assert find_district("Grama Panchayath Section Office PKD") == "Palakkad"
    assert find_district("Thiruvananthapuram") == "Thiruvananthapuram"
    assert classify_body("LSGD||Kozhikode||Koduvally Block Panchayat") == "Block Panchayat"
    assert classify_body("LSGD||Palakkad||Municipal Engineers office PKD||Municipal Engineer Pattambi Municipality") == "Municipality"
    assert classify_body("LSGD||Kannur||Secretary Kannur District Panchayath") == "District Panchayat"


def test_body_name():
    cases = {
        ("Office of the AE Kuzhalmannam Grama Panchayath", "Grama Panchayat", "Palakkad"): "Kuzhalmannam Grama Panchayat",
        ("Mullankolly Gramapanchayat", "Grama Panchayat", "Wayanad"): "Mullankolly Grama Panchayat",
        ("O/O Asst. Exec Engg Chalakkudy Block Panchayath", "Block Panchayat", "Thrissur"): "Chalakkudy Block Panchayat",
        ("Ofc of Exec Engg District Panchayath Thrissur", "District Panchayat", "Thrissur"): "Thrissur District Panchayat",
        ("Office of the Exe Engineer Kannur District Pnchyth", "District Panchayat", "Kannur"): "Kannur District Panchayat",
        ("Office of the Executive Engineer Kottayam", "District Panchayat", "Kottayam"): "Kottayam District Panchayat",
        ("Municipal Engineer Pattambi Municipality", "Municipality", "Palakkad"): "Pattambi Municipality",
        ("Corporation Engineer Kochi Corporation", "Corporation", "Ernakulam"): "Kochi Corporation",
        ("Office of the Assistant Engineer Mangalpady", "Grama Panchayat", "Kasaragod"): "Mangalpady Grama Panchayat",
    }
    for (org, bt, dist), want in cases.items():
        assert body_name(org, bt, dist) == want, (org, body_name(org, bt, dist))


def test_merge_tracks_new_and_drops_expired():
    today = dt.date(2026, 11, 5)
    existing = {
        "a": {"id": "a", "first_seen": "2026-11-01", "last_seen": "2026-11-04", "closing_date": "2026-11-20"},
        "old": {"id": "old", "first_seen": "2026-10-01", "last_seen": "2026-11-04", "closing_date": "2026-11-01"},
        "gone": {"id": "gone", "first_seen": "2026-10-01", "last_seen": "2026-10-20", "closing_date": "2026-12-01"},
    }
    fresh = [{"id": "a", "closing_date": "2026-11-20"}, {"id": "b", "closing_date": "2026-11-10"}]
    records, new_ids = merge(existing, fresh, today)
    ids = [r["id"] for r in records]
    assert ids == ["b", "a"]
    assert new_ids == {"b"}
    assert records[1]["first_seen"] == "2026-11-01"


def test_classify_work():
    from scraper.classify import classify
    cases = {
        "Cherukunnu anganwadi paattayam road retarring": ("roads", "Tarring & re-tarring"),
        "PULLERY ROAD CONCRETE WARD 3": ("roads", "Concrete roads"),
        "Construction of Cholakkundu anganwadi building": ("buildings", "Anganwadis"),
        "CHENOTH AGANAVADI RENNOVATION, PROJECT NO 157": ("buildings", "Anganwadis"),
        "Completion of GUPS Mepparambu": ("buildings", "Schools"),
        "Ozhivupara Thekkumpuram Canal Bund Road Rennovation": ("roads", "Road renovation & maintenance"),
        "Renovation of Adiyamattom farm RoadGeneral Civil Work": ("roads", "Road renovation & maintenance"),
        "Construction of protection wall for Palachuvad road": ("walls", "Side protection & retaining walls"),
        "Kongam Bazar Kappekkad Drainage Construction": ("water", "Drains"),
        "TARUR GP Providing Water Supply in Mattumala Anganvadi": ("water", "Drinking water & wells"),
        "Street Light Maintenance": ("electrical", "Street lights"),
        "Supply and Installation of Highmast Lowmast lights at 46 various locations": ("electrical", "High mast & low mast lights"),
        "Supply of cot": ("supply", "Beds & furnishings"),
        "PROVIDING ADDITIONAL FACILITIES FOR MCF BUILDING": ("waste", "MCF / RRF & waste facilities"),
        "Kavikkunnel SC Sanketham Samagra Vikasanam": ("other", "Colony & area development"),
    }
    for title, want in cases.items():
        got = classify(title)[:2]
        assert got == want, (title, got)


def test_update_bodies_keeps_bodies_with_nothing_open():
    import json
    import tempfile
    import scraper.run as run
    with tempfile.TemporaryDirectory() as d:
        run.BODIES_FILE = Path(d) / "bodies.json"
        day1 = [{"id": "x:1", "tender_id": "1", "body_name": "Valakom Grama Panchayat", "body_type": "Grama Panchayat", "district": "Ernakulam"}]
        run.BODIES_FILE.write_text(json.dumps(run.update_bodies(day1, dt.date(2026, 11, 5))))
        b = run.update_bodies([], dt.date(2026, 11, 6))
        v = b["Valakom Grama Panchayat"]
        assert v["open"] == 0 and v["tenders_seen"] == 1 and v["last_seen"] == "2026-11-05"


if __name__ == "__main__":
    failed = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn()
                print("PASS", name)
            except Exception as e:  # noqa: BLE001
                failed += 1
                print("FAIL", name, repr(e))
    sys.exit(1 if failed else 0)
