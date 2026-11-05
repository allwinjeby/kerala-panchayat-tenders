"""Sort every tender into a shop-style category and kind of work from its
title (the portal's own category is only published for some tenders, so it is
used just as a fallback). Rules are ordered: the first matching rule wins."""
from __future__ import annotations

import re

GROUPS = {
    "roads": "Roads & Paths",
    "buildings": "Buildings",
    "water": "Water & Drainage",
    "walls": "Walls & Protection",
    "electrical": "Electrical & Lighting",
    "waste": "Waste & Sanitation",
    "supply": "Supply & Equipment",
    "services": "Services & Hiring",
    "agri": "Agriculture & Environment",
    "other": "Other works",
}


def _r(pattern: str) -> re.Pattern:
    return re.compile(pattern, re.I)


ROAD_WORDS = _r(r"(?<!b)road|\bretar+ing\b|\bre[\s-]?tar+ing\b|\btar+ing\b|\bfoot\s?path|\binterlock|\bpaver|\bculvert|\bbridge|\bbypass\b|\blane\b|\bpathway|\bnadappatha|\bjunction\b|\bmukku\b")
BUILDING_WORDS = _r(r"\bbuilding|\broof|\btoilet|\bkitchen|\bhall\b|auditorium|\bpainting|\bflooring|\bplastering|\bclass\s?room|\bcomfort station|\bshed\b")
FACILITY_WORDS = _r(r"a(n)?ga(n|nn)?a?[wv]a?a?d[iy]|school|\b(g?v?[uh]?[lu]ps|g?v?hss?|ghs|lps|ups|gups|glps|gvhss|ghss|gvhs)\b|police|station\b|hospital|health|\b[pfc]\s?h\s?c\b|ayurved|homoeo|dispensary|office|library|market|bhavan|centre|center|stadium|bus\s?(shelter|stand|waiting)|\bveedu\b|\bhouse\b|\bbuds\b")

ELECTRICAL = _r(r"electrif|electrical|street\s?light|high\s?mast|low\s?mast|mini\s?mast|\bsolar\b|\blighting\b|\bled lights?\b|\blamps?\b|charging station")
WASTE = _r(r"\bmcf\b|\brrf\b|\bmrf\b|\bwaste\b|\bbins?\b|incinerator|suchitw|sanitation|haritha\s?karma|\bcompost")
SUPPLY = _r(r"(?<!water )\bsuppl(y|ying)\b|\bpurchase|procure|furniture|\bcomputers?\b|laptop|\bprinters?\b|\bequipments?\b|\bmaterials?\b|\bboards?\b|\bcots?\b")
SERVICES = _r(r"\bhir(e|ing)\b|rental|annual maintenance contract|\bsurvey\b|dgps|consultan|cleaning|security service|catering|printing|documentation")
WALLS = _r(r"compound\s?wall|protect?i?on\s?wall|retaining\s?wall|side\s?protection|side\s?wall|\bbhithi")
WATER_STRONG = _r(r"\bdrain|drinking|water supply|\bwells?\b|pipe\s?line|irrigat|check\s?dam|recharge")
WATER_WEAK = _r(r"\bponds?\b|\bkulam\b|\bchira\b|\bcanals?\b|\bthodu\b|\btanks?\b|reservoir|\bbund\b")
AGRI = _r(r"agricultur|\bfarm(ing)?\b|paddy|plantation|nursery|fencing|\bgarden|cultivation|vegetable|seedling")
AREA = _r(r"colony|sanketham|unnathi|infrastructure|samagra|\bnagar\b")

KINDS = {
    "roads": [
        ("Culverts & bridges", _r(r"culvert|bridge|\bslab\b")),
        ("Footpaths & steps", _r(r"foot\s?path|pathway|nadappatha|\bsteps?\b|stair")),
        ("Interlock & paver", _r(r"interlock|paver|\btiles?\b")),
        ("Tarring & re-tarring", _r(r"tar+ing|\bre[\s-]?tar|bitumen|bm\s?&?\s?bc|\bbc\b|\bbm\b")),
        ("Concrete roads", _r(r"concret")),
        ("New road construction", _r(r"construction|formation|new road")),
        ("Road renovation & maintenance", _r(r"maint|renov|rennov|naveekaran|repair|improv|restor|resurfac|rehabilit|upgrad")),
        ("Other road works", _r(r".")),
    ],
    "buildings": [
        ("Anganwadis", _r(r"a(n)?ga(n|nn)?a?[wv]a?a?d[iy]")),
        ("Schools", _r(r"school|\b(g?v?[uh]?[lu]ps|g?v?hss?|ghs|lps|ups|gups|glps|gvhss|ghss|gvhs)\b|class\s?room|\bkg\b|\bbuds\b")),
        ("Hospitals & health centres", _r(r"hospital|health|\b[pfc]\s?h\s?c\b|ayurved|homoeo|dispensary|clinic|sub\s?cent")),
        ("Toilets & comfort stations", _r(r"toilet|comfort station|urinal")),
        ("Houses", _r(r"\bveedu|\bhouse|\blife\b|housing|lakshamveedu")),
        ("Markets & shopping complexes", _r(r"market|shopping|shop\b|stall")),
        ("Offices, halls & community buildings", _r(r"office|hall\b|auditorium|community|library|bhavan|centre|center|kendram|panchayat|krishi")),
        ("Other buildings", _r(r".")),
    ],
    "water": [
        ("Drinking water & wells", _r(r"drinking|water supply|\bwells?\b|pipe\s?line|pipeline|\bpipes?\b|water tank|kudivellam|jalanidhi")),
        ("Ponds & tanks", _r(r"\bponds?\b|\bkulam\b|\bchira\b|\btanks?\b|reservoir")),
        ("Canals & streams", _r(r"canal|\bthodu\b|stream|\bthod\b")),
        ("Irrigation", _r(r"irrigat|check\s?dam|\bvca\b|lift")),
        ("Drains", _r(r"drain")),
        ("Groundwater recharge", _r(r"recharge")),
        ("Other water works", _r(r".")),
    ],
    "walls": [
        ("Compound walls", _r(r"compound")),
        ("Side protection & retaining walls", _r(r".")),
    ],
    "electrical": [
        ("High mast & low mast lights", _r(r"high\s?mast|low\s?mast|mini\s?mast")),
        ("Street lights", _r(r"street\s?light|\blights?\b|lamp|\bled\b")),
        ("EV charging", _r(r"charging")),
        ("Solar", _r(r"solar")),
        ("Electrification & wiring", _r(r"electrif|wiring|\bwiring")),
        ("Other electrical works", _r(r".")),
    ],
    "waste": [
        ("MCF / RRF & waste facilities", _r(r"\bmcf\b|\brrf\b|\bmrf\b|facility|incinerator|compost|plant")),
        ("Bins & collection", _r(r"\bbins?\b|collect|bucket|vehicle")),
        ("Other sanitation works", _r(r".")),
    ],
    "supply": [
        ("Computers & IT", _r(r"computer|laptop|printer|\bit\b|projector|software|cctv|camera|ups\b")),
        ("Furniture", _r(r"furniture|chairs?|tables?|almirah|cupboard|\bbench")),
        ("Equipment & machinery", _r(r"equipment|machin|instrument|appliance|generator|pump")),
        ("Materials", _r(r"material|cement|steel|sand|aggregate|bricks?|pipes?|seeds?|fertili|plants|saplings")),
        ("Boards & signage", _r(r"board|sign")),
        ("Beds & furnishings", _r(r"\bcots?\b|\bbeds?\b|mattress")),
        ("Other supplies", _r(r".")),
    ],
    "services": [
        ("Vehicle hire", _r(r"vehicle|hire|hiring|rental|\btaxi\b|\bjeep\b|\bcar\b")),
        ("Maintenance contracts (AMC)", _r(r"\bamc\b|annual maintenance contract|service contract")),
        ("Surveys & consultancy", _r(r"survey|dgps|consult|study|\bdpr\b|design")),
        ("Cleaning, printing & documentation", _r(r"clean|print|document")),
        ("Other services", _r(r".")),
    ],
    "agri": [
        ("Agriculture & environment works", _r(r".")),
    ],
    "other": [
        ("Colony & area development", AREA),
        ("Other works", _r(r".")),
    ],
}

PORTAL_FALLBACK = [
    (_r(r"roads"), "roads"),
    (_r(r"buildings"), "buildings"),
    (_r(r"water|canal|irrigation"), "water"),
    (_r(r"electrical"), "electrical"),
    (_r(r"raw materials|equipment|hardware|consumables|food|furniture|medical|computer"), "supply"),
    (_r(r"amc|service|transport|consultan|maintenance contract"), "services"),
]

JOB_RULES = [
    ("Supply & installation", _r(r"\bsuppl|install|purchase|procure")),
    ("New construction", _r(r"construct|formation|\bnew\b|providing|\bbuild")),
    ("Repair & maintenance", _r(r"maint|renov|rennov|naveekaran|repair|improv|restor|re[\s-]?tar|retar|reconcret|resurfac|rehabilit|upgrad|completion|balance work")),
]


def _group_for(title: str, category: str | None) -> str:
    road = bool(ROAD_WORDS.search(title))
    building = bool(BUILDING_WORDS.search(title))
    if ELECTRICAL.search(title):
        return "electrical"
    if WASTE.search(title):
        return "waste"
    if not road and not building:
        if SUPPLY.search(title):
            return "supply"
        if SERVICES.search(title):
            return "services"
    if WALLS.search(title):
        return "walls"
    if WATER_STRONG.search(title) or (not road and WATER_WEAK.search(title)):
        return "water"
    if road and not building:
        return "roads"
    if building or FACILITY_WORDS.search(title) or re.search(r"agricultur\w* office|krishi", title, re.I):
        return "buildings"
    if AGRI.search(title):
        return "agri"
    for pattern, group in PORTAL_FALLBACK:
        if category and pattern.search(category):
            return group
    if re.search(r"concret", title, re.I) and not AREA.search(title):
        return "roads"
    return "other"


def classify(title: str, category: str | None = None) -> tuple[str, str, str]:
    """-> (group key, kind of work, job type)"""
    title = title or ""
    group = _group_for(title, category)
    kind = next(name for name, pattern in KINDS[group] if pattern.search(title))
    job = next((name for name, pattern in JOB_RULES if pattern.search(title)), "Other")
    return group, kind, job
