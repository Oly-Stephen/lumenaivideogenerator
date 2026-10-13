"""For registered .com names: registry nameservers + creation date (Verisign RDAP) and whether the site
looks parked / for sale (keywords in the served page). Evidence only; a listing price needs the marketplace page."""
import json, re, sys, urllib.request

SALE = re.compile(r"(for sale|buy this domain|make an offer|domain is for sale|afternic|sedo|dan\.com|hugedomains|atom\.com|brandbucket|squadhelp|undeveloped|parkingcrew|bodis|godaddy\.com/domainsearch|this domain may be for sale)", re.I)
PARK_NS = re.compile(r"(afternic|sedoparking|parkingcrew|bodis|dan\.com|undeveloped|hugedomains|above\.com|parklogic|namebright|domaincontrol)", re.I)

def rdap(d):
    try:
        with urllib.request.urlopen(urllib.request.Request("https://rdap.verisign.com/com/v1/domain/" + d, headers={"Accept": "application/rdap+json"}), timeout=20) as r:
            j = json.load(r)
        ns = [n["ldhName"].lower() for n in j.get("nameservers", [])]
        created = next((e["eventDate"][:10] for e in j.get("events", []) if e["eventAction"] == "registration"), None)
        registrar = next((v[3] for e in j.get("entities", []) if "registrar" in e.get("roles", []) for v in e.get("vcardArray", [None, []])[1] if v[0] == "fn"), None)
        return ns, created, registrar
    except Exception as e:
        return [], None, f"rdap error {type(e).__name__}"

def page(d):
    for scheme in ("https://", "http://"):
        try:
            req = urllib.request.Request(scheme + d, headers={"User-Agent": "Mozilla/5.0 brand-research"})
            with urllib.request.urlopen(req, timeout=15) as r:
                html = r.read(200_000).decode("utf-8", "ignore")
                title = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
                hit = SALE.search(html)
                return r.geturl(), (title.group(1).strip()[:80] if title else ""), (hit.group(0) if hit else "")
        except Exception as e:
            last = type(e).__name__
    return "", f"no site ({last})", ""

for d in sys.argv[1:]:
    ns, created, registrar = rdap(d)
    url, title, sale = page(d)
    park = any(PARK_NS.search(n) for n in ns)
    print(json.dumps({"domain": d, "created": created, "registrar": registrar, "ns": ns[:2], "parked_ns": park, "final_url": url[:60], "title": title, "sale_signal": sale}))
