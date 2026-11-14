# BlindSpot

The health monitor that does not trust how you feel. A research prototype for the 2026 NASA Space Apps challenge "Create Health Monitoring Software for Astronauts on Space Missions".

The astronaut predicts each result, the device measures it, and the gap between the two (the Insight Gap) drives GO, WATCH or NO-GO decisions from written flight rules, for times when Earth is too far away to ask.

**Not a medical device. Not validated in flight. Not endorsed by NASA.**

## Run it

It is a static site with no build step and no dependencies.

```
python3 -m http.server 8765
```

Open http://localhost:8765. The camera pulse test needs HTTPS or localhost.

- `#/replay` plays a simulated 180-day mission (stamped SIMULATED on every screen).
- `#/replay/66` opens the replay paused on a given day.

## What is inside

| Path | What |
|---|---|
| `js/scoring.js` | Baselines, measured score, Insight Gap, reaction, pointing and pulse metrics |
| `js/rules.js` | Flight rules and body systems, each with its sources |
| `js/mission.js` | Environments, light-time, blackout windows, radiation ledger |
| `js/model.js` | Turns stored readings into what the screens show |
| `js/tests/` | Reaction test, vision test, pointing test, pulse |
| `js/views/` | One file per screen |
| `js/replay.js` | The simulated mission |
| `data/lighttime.json` | Daily Earth to Mars and Earth to Moon range and Sun angle, 2026 to 2040, from JPL Horizons |
| `scripts/fetch_horizons.py` | Rebuilds `data/lighttime.json` (no API key needed) |
| `tests/` | Unit tests; open `tests/index.html` in a browser |

## NASA data and references

Listed with links on the app's "Sources and limits" screen and in `js/sources.js`. In short: JPL Horizons (light-time, solar conjunction), NASA-STD-3001 (600 mSv career dose limit, 3 mmHg carbon dioxide limit), NASA OCHMO-TB-004 (carbon dioxide and headache), dose rates from Table 2 of "Space radiation measurements during the Artemis I lunar mission" (Nature, 2024), NASA Human Research Program pages on hazards, SANS and bone loss, the PVT-B paper and NASA's Reaction Self-Test, NASA's Fine Motor Skills battery.

## Limits

- The Insight Gap is a hypothesis built on sleep-restriction research. It has not been validated as a spaceflight measure.
- Only the 600 mSv, 3 mmHg and 2.5 mmHg thresholds are NASA's. Blood pressure, blood sugar and oxygen thresholds are common clinical conventions that were not checked against a cited source. All other thresholds are prototype settings.
- Browser tests are screening grade. The camera pulse reading has not been checked against a reference device.
- The solar particle event in the replay is simulated. NASA DONKI event data is not bundled yet.

## Use of SI (AI) tools

The code, text and graphics in this repository were produced with SI coding tools. No SI-generated images, video or audio are used. No NASA logos or insignia are used.

## Privacy

All readings stay in the browser's local storage. Camera frames are processed on the device and never stored or sent.
