#!/usr/bin/env python3
"""Download daily Earth-centre range and Sun-Earth-target angle from JPL Horizons
and write data/lighttime.json. Run from the repository root. No API key needed."""
import json, subprocess, urllib.parse, datetime, sys

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
START, STOP = "2026-01-01", "2040-12-31"
BODIES = {"mars": "499", "moon": "301"}
AU_KM = 149597870.7
C_KM_S = 299792.458


def fetch(command):
    params = {
        "format": "text", "COMMAND": f"'{command}'", "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'", "EPHEM_TYPE": "'OBSERVER'", "CENTER": "'500@399'",
        "START_TIME": f"'{START}'", "STOP_TIME": f"'{STOP}'", "STEP_SIZE": "'1d'",
        "QUANTITIES": "'20,23'", "CSV_FORMAT": "'YES'",
    }
    url = API + "?" + urllib.parse.urlencode(params)
    out = subprocess.run(["curl", "-s", "-m", "120", url], capture_output=True, text=True, check=True).stdout
    if "$$SOE" not in out:
        sys.exit("Horizons returned no ephemeris:\n" + out[:800])
    rows = out.split("$$SOE")[1].split("$$EOE")[0].strip().splitlines()
    dist_au, elong = [], []
    for r in rows:
        c = [x.strip() for x in r.split(",")]
        dist_au.append(float(c[3]))
        elong.append(float(c[5]))
    first = datetime.datetime.strptime(rows[0].split(",")[0].strip(), "%Y-%b-%d %H:%M").date()
    return first, dist_au, elong


result = {
    "source": "NASA/JPL Horizons API, https://ssd.jpl.nasa.gov/api/horizons.api",
    "retrieved": datetime.date.today().isoformat(),
    "note": "Geocentric apparent range (quantity 20) and Sun-Observer-Target angle (quantity 23), daily at 00:00 UT.",
    "au_km": AU_KM, "c_km_s": C_KM_S, "bodies": {},
}
for name, cmd in BODIES.items():
    first, dist, elong = fetch(cmd)
    result["bodies"][name] = {
        "start": first.isoformat(), "step_days": 1,
        "range_au": [round(x, 6) for x in dist],
        "sun_angle_deg": [round(x, 2) for x in elong],
    }
    print(name, first, len(dist), "days; range AU min/max", min(dist), max(dist))
json.dump(result, open("data/lighttime.json", "w"), separators=(",", ":"))
