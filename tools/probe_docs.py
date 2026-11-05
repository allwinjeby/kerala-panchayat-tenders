"""Debug helper (run by .github/workflows/debug-probe.yml): opens one LSGD tender's
detail page in a session and tries its document links, saving what comes back to out/."""
import pathlib
import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://etenders.kerala.gov.in"
out = pathlib.Path("out")
out.mkdir(exist_ok=True)
s = requests.Session()
s.headers["User-Agent"] = "KeralaPanchayatTenderWatch/1.0 (+https://github.com/allwinjeby/kerala-panchayat-tenders)"


def get(url, name):
    time.sleep(2)
    r = s.get(url if url.startswith("http") else BASE + url, timeout=120)
    ctype = r.headers.get("content-type", "")
    ext = ".html" if "html" in ctype else ".bin"
    (out / (name + ext)).write_bytes(r.content)
    print(name, r.status_code, ctype, len(r.content), r.headers.get("content-disposition", ""))
    return r


r = get("/nicgep/app?page=FrontEndTendersByOrganisation&service=page", "01_orgs")
soup = BeautifulSoup(r.text, "lxml")
href = next(row.find("a")["href"] for row in soup.select("table#table tr")
            if len(row.find_all("td")) >= 3 and row.find_all("td")[1].get_text(strip=True) == "Local Self Government Department")
r = get(href, "02_lsgd")
soup = BeautifulSoup(r.text, "lxml")
detail = None
for row in soup.select("table#table tr"):
    tds = row.find_all("td")
    if len(tds) >= 6 and "road" in tds[4].get_text().lower():
        detail = tds[4].find("a")["href"]
        print("tender:", tds[4].get_text(" ", strip=True)[:120])
        break
r = get(detail, "03_detail")
soup = BeautifulSoup(r.text, "lxml")
links = [(a.get_text(" ", strip=True), a["href"]) for a in soup.find_all("a", href=True)
         if re.search(r"\.(pdf|xls|xlsx)$", a.get_text(strip=True), re.I) or "zip" in a.get_text().lower()]
for i, (text, h) in enumerate(links):
    print("link", i, text, h[:120])
for i, (text, h) in enumerate(links[:6]):
    res = get(h, f"04_doc{i}_{re.sub(r'[^A-Za-z0-9.]', '_', text)[:40]}")
    if "html" in res.headers.get("content-type", ""):
        t = BeautifulSoup(res.text, "lxml").get_text(" ", strip=True)
        print("   html says:", ("captcha" in t.lower()), t[:200])
