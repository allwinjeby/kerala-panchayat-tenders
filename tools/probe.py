"""Debug helper run by .github/workflows/debug-probe.yml: walks the e-Tenders
"Tenders by Organisation" flow in one session and saves each page to out/."""
import pathlib
import re
import time

import requests
from bs4 import BeautifulSoup

BASE = "https://etenders.kerala.gov.in"
out = pathlib.Path("out")
out.mkdir(exist_ok=True)
s = requests.Session()
s.headers["User-Agent"] = "KeralaPanchayatTenderWatch/1.0 (debug)"


def save(name, resp):
    (out / name).write_text(resp.text)
    print(name, resp.status_code, resp.url, len(resp.text))


r = s.get(f"{BASE}/nicgep/app?page=FrontEndTendersByOrganisation&service=page", timeout=30)
save("01_orgs.html", r)
soup = BeautifulSoup(r.text, "lxml")
link = None
for row in soup.select("table#table tr"):
    tds = row.find_all("td")
    if len(tds) >= 3 and tds[1].get_text(strip=True) == "Local Self Government Department":
        link = tds[2].find("a") or row.find("a")
        break
print("LSGD link:", link and link.get("href"))
time.sleep(2)
r = s.get(BASE + link["href"], timeout=30)
save("02_lsgd.html", r)

soup = BeautifulSoup(r.text, "lxml")
nxt = soup.find("a", id=re.compile("linkFwd|next", re.I)) or soup.find("a", string=re.compile(r"Next|>", re.I))
print("next link:", nxt and nxt.get("href"))
if nxt and nxt.get("href"):
    time.sleep(2)
    r = s.get(BASE + nxt["href"], timeout=30)
    save("03_lsgd_page2.html", r)

detail = soup.find("a", href=re.compile("DirectLink"), string=re.compile(r"\["))
if detail:
    time.sleep(2)
    r = s.get(BASE + detail["href"], timeout=30)
    save("04_detail.html", r)
