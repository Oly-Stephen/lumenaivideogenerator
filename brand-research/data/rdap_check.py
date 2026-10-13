"""Domain registration check via authoritative RDAP servers (IANA bootstrap).
404 from the registry RDAP = no registration record (likely available, may still be reserved/premium).
200 = registered. Anything else = unknown."""
import json, sys, time, urllib.request, urllib.error, datetime

SERVERS = {
    "com": "https://rdap.verisign.com/com/v1/domain/",
    "app": "https://pubapi.registry.google/rdap/domain/",
    "ai": "https://rdap.identitydigital.services/rdap/domain/",
    "io": "https://rdap.identitydigital.services/rdap/domain/",
    "studio": "https://rdap.identitydigital.services/rdap/domain/",
    "video": "https://rdap.identitydigital.services/rdap/domain/",
    "co": "https://rdap.registry.co/co/domain/",
}

def check(domain: str) -> str:
    tld = domain.rsplit(".", 1)[1]
    url = SERVERS[tld] + domain
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/rdap+json", "User-Agent": "brand-research/1.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return "registered" if r.status == 200 else f"http {r.status}"
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return "not registered"
            if e.code == 429:
                time.sleep(3 + attempt * 3)
                continue
            return f"http {e.code}"
        except Exception as e:  # network
            time.sleep(2)
            last = type(e).__name__
    return "unknown"

if __name__ == "__main__":
    names = [n.strip().lower() for n in open(sys.argv[1], encoding="utf-8") if n.strip() and not n.startswith("#")]
    tlds = sys.argv[2].split(",")
    out = {"checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "results": {}}
    for n in names:
        out["results"][n] = {}
        for t in tlds:
            out["results"][n][t] = check(f"{n}.{t}")
            time.sleep(0.35)
        print(n, out["results"][n], flush=True)
    json.dump(out, open(sys.argv[3], "w"), indent=1)
