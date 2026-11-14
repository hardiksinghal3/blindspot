#!/usr/bin/env python3
"""Download NASA DONKI solar energetic particle (SEP) records and write data/sep.json.
Needs an api.nasa.gov key in the NASA_API_KEY environment variable. Run from the repository root.
The API accepts at most 60 days per request, so the range is fetched in windows."""
import datetime, json, os, subprocess, sys, time

KEY = os.environ.get("NASA_API_KEY")
if not KEY:
    sys.exit("Set NASA_API_KEY (free key from https://api.nasa.gov/).")
START = datetime.date(2010, 1, 1)
END = datetime.date.today()
API = "https://api.nasa.gov/DONKI/SEP"

events, seen, calls = [], set(), 0
a = START
while a <= END:
    b = min(a + datetime.timedelta(days=59), END)
    url = f"{API}?startDate={a}&endDate={b}&api_key={KEY}"
    for attempt in range(4):
        out = subprocess.run(["curl", "-s", "-m", "90", "-w", "\n%{http_code}", url], capture_output=True, text=True).stdout
        body, _, code = out.rpartition("\n")
        if code == "200":
            break
        time.sleep(5 * (attempt + 1))
    else:
        sys.exit(f"DONKI request failed for {a}..{b}: HTTP {code}: {body[:200]}")
    calls += 1
    for e in json.loads(body) if body.strip() else []:
        if e["sepID"] in seen:
            continue
        seen.add(e["sepID"])
        events.append({"t": e["eventTime"], "inst": [i["displayName"] for i in e.get("instruments") or []], "link": e.get("link")})
    a = b + datetime.timedelta(days=1)
    time.sleep(0.6)

events.sort(key=lambda e: e["t"])
json.dump({
    "source": "NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information), SEP endpoint via https://api.nasa.gov/",
    "retrieved": END.isoformat(), "from": START.isoformat(),
    "note": "Each record is the onset of a solar energetic particle event as seen by one instrument, or a model forecast (instrument name starts with MODEL).",
    "events": events,
}, open("data/sep.json", "w"), separators=(",", ":"))
print(len(events), "records in", calls, "requests")
