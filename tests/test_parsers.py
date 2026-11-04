"""Sanity checks for the parsing logic against synthetic fixture HTML.

These confirm the *code* behaves correctly (header mapping, panchayat
filtering, date parsing, dedupe id stability) -- they do not guarantee the
live site's real markup matches the fixtures, since this environment
cannot reach etenders.kerala.gov.in / lsgkerala.gov.in to capture real
HTML. See README for how the first live GitHub Actions run verifies that.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scraper import kerala_etenders, lsgkerala
from scraper.common import looks_like_panchayat, make_id, parse_date

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_date_formats():
    assert parse_date("01-Nov-2026") == "2026-11-01"
    assert parse_date("20-Nov-2026 05:00 PM") == "2026-11-20"
    assert parse_date("") is None
    assert parse_date(None) is None
    assert parse_date("not a date") is None


def test_looks_like_panchayat():
    assert looks_like_panchayat("Nedumangad Grama Panchayat")
    assert looks_like_panchayat("Koduvally Block Panchayat")
    assert looks_like_panchayat("Local Self Government Department||LSGD")
    assert not looks_like_panchayat("Directorate of Collegiate Education")


def test_make_id_is_stable_and_order_sensitive_to_content_not_call():
    a = make_id("src", "Title", "Org", "2026-11-01")
    b = make_id("src", "Title", "Org", "2026-11-01")
    c = make_id("src", "Different Title", "Org", "2026-11-01")
    assert a == b
    assert a != c


def test_etenders_listing_filters_to_panchayat_only():
    html = (FIXTURES / "etenders_listing.html").read_text()
    records, next_target = kerala_etenders._parse_listing_page(html)
    assert len(records) == 3, "parser should find all 3 rows before filtering"

    panchayat_only = [r for r in records if looks_like_panchayat(r.organisation)]
    assert len(panchayat_only) == 2
    titles = {r.title for r in panchayat_only}
    assert "Construction of road at Ward 5" in titles
    assert "Renovation of anganwadi building" in titles

    road = next(r for r in panchayat_only if "road" in r.title)
    assert road.closing_date == "2026-11-20"
    assert road.published_date == "2026-11-01"
    assert road.url == "https://etenders.kerala.gov.in/nicgep/app?page=FrontEndViewTender&service=direct&tenderId=111"

    assert next_target is None  # no pager links in the fixture


def test_lsgkerala_listing_parses_rows():
    html = (FIXTURES / "lsgkerala_listing.html").read_text()
    records = lsgkerala._parse_listing_page(html, "https://lsgkerala.gov.in/en/tenders")
    assert len(records) == 2
    assert records[0].title == "Tender for road repair work, Ward 3"
    assert records[0].url == "https://lsgkerala.gov.in/en/tenders/road-repair-ward-3"
    assert records[1].closing_date == "2026-11-18"


if __name__ == "__main__":
    failures = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    if failures:
        print(f"\n{failures} test(s) failed")
        sys.exit(1)
    print("\nAll tests passed")
