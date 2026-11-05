"""One-off helper (run by .github/workflows/debug-probe.yml): download the
GeoNames India postal-code file and keep Kerala's rows as compact JSON in
out/kerala_postal.json. GeoNames data is CC BY 4.0 (https://www.geonames.org)."""
import csv
import io
import json
import pathlib
import zipfile

import requests

out = pathlib.Path("out")
out.mkdir(exist_ok=True)
r = requests.get("https://download.geonames.org/export/zip/IN.zip", timeout=120,
                 headers={"User-Agent": "KeralaPanchayatTenderWatch/1.0 (+https://github.com/allwinjeby/kerala-panchayat-tenders)"})
r.raise_for_status()
z = zipfile.ZipFile(io.BytesIO(r.content))
rows = []
with z.open("IN.txt") as f:
    for row in csv.reader(io.TextIOWrapper(f, "utf-8"), delimiter="\t"):
        # country, postal code, place name, admin1, code1, admin2, code2, admin3, code3, lat, lng, accuracy
        if len(row) >= 11 and row[3].strip().lower() == "kerala" and row[9] and row[10]:
            rows.append([row[1], row[2], row[5], row[7], round(float(row[9]), 4), round(float(row[10]), 4)])
(out / "kerala_postal.json").write_text(json.dumps(rows, ensure_ascii=False))
print("kerala rows:", len(rows), "unique pincodes:", len({r[0] for r in rows}))
print("sample:", rows[:3])
