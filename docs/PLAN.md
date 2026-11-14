# BlindSpot build plan

A website for the 2026 NASA Space Apps challenge "Create Health Monitoring Software for Astronauts on Space Missions". Deadline: Sunday 15 Nov 2026, 11:59 p.m. local.

## 1. What "done" means

A judge opens one public link, understands the idea in 10 seconds, runs a real check on themselves in about 60 seconds, and sees a felt-versus-measured gap, a GO / WATCH / NO-GO body poll and what to do while Earth is out of reach. A second button plays a labelled, simulated 180-day mission so the trend features are visible without history.

## 2. Decisions

| Topic | Decision | Reason |
|---|---|---|
| Stack | Static site, plain HTML, CSS and JavaScript modules, no build step, no runtime dependencies | Loads fast, anyone on the team can edit it, nothing to break on judging day |
| Hosting | GitHub Pages (HTTPS) | The camera only works on HTTPS; judges need a link with no login |
| Storage | The browser only (localStorage), with export | Privacy; matches a spacecraft with no link to Earth |
| NASA data | Fetched once by scripts and bundled as JSON | JPL Horizons sends no CORS header, so a browser cannot call it; the DONKI demo key is rate limited (10 calls, currently used up); a spacecraft cannot call Earth anyway |
| Simulated data | Only in "Mission replay", stamped SIMULATED on every screen | Honesty, and judges punish hidden fake data |
| Medical safety | No drug doses, a "prototype, not a medical device" notice, every rule shows its source and evidence tier | Validity score |
| SI and branding | SI use disclosed in README, footer and page metadata; no NASA logos or insignia | Submission rules |

## 3. Screens

1. **Landing.** One sentence, the gap graphic, two buttons: "Run today's check" and "Play a 180-day mission".
2. **Today.** Mission bar (environment, mission day, light-time to Earth, radiation), checks due, the body poll, the top finding.
3. **Check.** For each test: predict, measure, reveal felt versus measured.
4. **Body poll.** Clickable figure. Each system card: what it does, how the five hazards affect it, its indicators, status, the rule that fired, what to do now, sources.
5. **Trends.** Each indicator against the personal band and the expected spaceflight adaptation, plus the Insight Gap chart.
6. **Mission.** Environment, mission day, next critical event, radiation ledger, space weather events, comms delay and blackout.
7. **Flight rules.** The full rule library with sources.
8. **Surgeon packet.** A ready-to-send summary with the earliest time Earth can reply.
9. **Sources and limits.** Data, references, SI disclosure, what is not validated.

**Focus mode:** when measured alertness is poor (or on request) the interface switches to one instruction per screen in large type. It announces the switch and can be turned off.

## 4. Test battery

The battery changes with gravity, because standing-balance tests mean nothing in weightlessness.

| System | Test | Parameters | Evidence tier |
|---|---|---|---|
| Alertness | Reaction test (PVT-B) | 3 min, gaps of 1 to 4 s, lapse at 355 ms or slower, false start under 100 ms; main metric is response speed (1/RT). A 60 s "quick" mode is marked demo grade | Flown on ISS |
| Vision (SANS) | Near acuity (tumbling E) and Amsler grid, each eye | Screen size calibrated with a bank card, eyes 50 cm away, 4 letters per line, 3 correct to pass. Letters are drawn on whole pixels only, so the lines are the sizes the screen can really draw | Modelled on ISS monitoring (there: Amsler grid on a laptop, near acuity on a handheld card) |
| Fine motor | Pointing test, 11 targets in a ring, two sizes | Throughput in bits per second | Modelled on NASA's Fine Motor Skills tablet test flown on ISS |
| Heart | Pulse from webcam, 30 s; fallback is tapping along with your pulse | Skin colour signal, 0.7 to 3 Hz band, quality gate that refuses a bad reading | Validated on Earth |
| Balance (surface and landing day only) | Stand-and-sway and sit-to-stand by webcam | Stretch goal | Experimental |
| Typed-in | Blood pressure, glucose, temperature, oxygen saturation, sleep hours, mood, exercise minutes, cabin CO2, dosimeter, symptoms | Units shown, ranges checked | Device dependent |

## 5. Scoring

- **Baseline:** median and robust spread of a person's first 5 sessions per metric. Until 3 exist, built-in reference values are used and labelled "provisional".
- **Measured score M:** how today compares with your own normal, on 0 to 100 where 50 is "my normal".
- **Felt score F:** a slider on the same 0 to 100 scale, set before the test.
- **Insight Gap:** F minus M, shown raw. The person's usual bias is shown beside it, not subtracted, because habitual over-confidence is the thing to catch.
- **Status:** WATCH at 1 spread below normal, NO-GO at 2. **Impaired and unaware:** WATCH or worse with a gap of 20 or more.
- **Calibration score:** 100 minus the average gap over the last 7 checks. This is the game score, with a streak for daily checks.

## 6. Flight rules (first set)

| Rule | Trigger | Source |
|---|---|---|
| Alertness | Measured status WATCH or NO-GO | Reaction Self-Test; Van Dongen 2003 |
| Unaware | Impaired with gap of 20 or more: get a crewmate cross-check, hand over critical tasks | Van Dongen 2003 |
| Vision | WATCH at 1 line worse than baseline or any Amsler distortion; NO-GO at 2 lines worse on two checks in a row | NASA SANS monitoring; NASA says about 70 % of ISS astronauts get some swelling at the back of the eye |
| Fine motor | 2 spreads worse, or first week after a gravity change | NASA Fine Motor Skills study |
| Radiation dose | Projected career dose reaches 600 mSv | NASA-STD-3001 Vol. 1 |
| Solar particle event | Event in progress: go to shelter | NASA DONKI; Artemis I radiation paper |
| Cabin CO2 | NO-GO: 1-hour average above 3 mmHg. WATCH: 7-day average above 2.5 mmHg (NASA's level for keeping headache risk under 1 %) | NASA-STD-3001 Vol. 2 [V2 6004]; OCHMO-TB-004 |
| Temperature | Judged against a baseline that rises about 1 °C over 2.5 months | Stahn 2017 |
| Bone and muscle | Exercise adherence under 70 % for 7 days | NASA: 1 to 1.5 % bone loss per month |
| Sleep | Under 6 hours for 2 nights | Van Dongen 2003 |
| Glucose, blood pressure, oxygen, resting pulse, mood | Standard clinical thresholds, labelled as such | Clinical convention, not NASA |

Only the 600 mSv, 3 mmHg and 2.5 mmHg triggers are NASA's numbers. Every other trigger (spreads, gap of 20, 6 hours, 70 %) is this prototype's own setting; the Source column is the evidence behind the rule, not approval of the threshold. The app says so on each rule card.

## 7. NASA data pipeline

- **JPL Horizons:** daily Earth to Mars and Earth to Moon distance and Sun angle, 2026 to 2040. Gives one-way light-time, earliest reply time and solar-conjunction blackout (Mars within 2 degrees of the Sun, which reproduces NASA's 2 to 16 Oct 2021 commanding pause). For a ship in transit the distance is an estimate, labelled as such, because Horizons has no trajectory for a mission that does not exist.
- **NASA DONKI:** catalogue of real solar particle events and flares. Drives shelter alerts in live mode and in the replay.
- **Dose rates:** the measured table in NASA's Artemis I radiation paper (mSv per day: ISS 0.68, lunar surface 0.81, low lunar orbit 1.55, Mars transit 1.58, Mars surface 0.65, Artemis I 0.96 to 1.24).
- **Caveat shown in the app:** these are dose-equivalent rates for December 2022 solar conditions; the 600 mSv limit is in effective dose, so the ledger is a rough comparison.
- **Not invented:** a solar event's dose depends on shielding, so the app asks for the dosimeter reading and does not make one up.

## 8. Design

- Dark "cabin at night" interface, one accent colour, large numerals in a monospace face.
- The signature element is the gap bar: a hollow marker for felt, a solid marker for measured, joined by a line. It appears on every result.
- Status never relies on colour alone: circle for GO, triangle for WATCH, square for NO-GO, each with its word.
- Keyboard operable, readable contrast, reduced-motion respected, laptop first and usable on a tablet.
- Hand-drawn SVG body figure. No stock images.

## 9. Build order

Everything above the line ships first; items below it are added only if the ones above are solid.

1. Shell: design tokens, navigation, storage, landing page.
2. Predict, reaction test, reveal, Insight Gap, baselines.
3. Today screen, body poll, rule engine and rule cards.
4. Mission screen: environments, light-time, radiation ledger, solar events.
5. Mission replay with simulated crew member.
6. Trends charts.
7. Vision tests, fine-motor test, typed-in vitals.
8. Surgeon packet, Focus mode, Sources page.

---

9. Webcam pulse with tap-along fallback.
10. Offline install.
11. Webcam balance tests.

## 10. Checks before it is called finished

- Unit tests for every formula: reaction metrics, scores, gap, light-time, dose, pulse signal processing on synthetic signals.
- A full click-through in a real browser, with screenshots of every screen at laptop and tablet widths.
- Camera path exercised with a fake camera feed; no-camera and permission-denied paths.
- Contrast, keyboard-only use, colour-blind check.
- Every number in the interface traced to a source on the Sources page.

## 11. Holes found while reviewing, and the fix

| Hole | Fix |
|---|---|
| Balance tests are meaningless in weightlessness | Battery depends on environment; fine-motor test covers flight |
| Horizons cannot be called from a browser; DONKI key is rate limited | Bundle the data |
| A first-time user has no baseline | Provisional reference values, clearly labelled |
| A first-time user has no history to chart | Labelled mission replay |
| Browsers add timing delay to reaction tests | Scores compare you with yourself on the same machine |
| Low-resolution screens cannot draw the smallest letters | The test reports its floor instead of a false result |
| A 3-minute test is too long for a judge | 60 s quick mode, marked demo grade |
| Camera refused or missing | Tap-along pulse; every test can be skipped |
| Colour-blind or vision-impaired users | Shape and word with every colour |
| A bad webcam reading shown as fact | Quality gate refuses it |
| Subtracting a person's usual bias would hide chronic over-confidence | Gap is shown raw, bias shown beside it |
| A ship in transit is not at Mars, so Earth to Mars light-time overstates the delay | Transit value is a labelled estimate |

## 12. What only you can do

- Create or approve the public GitHub repository for hosting.
- Try the webcam pulse on a real face against a manual count.
- Possibly a free api.nasa.gov key: the shared demo key is over its limit, and it does not reset for about 6.5 hours. Without a key I download the solar event catalogue after the reset.
- Reshape the idea with your team, record the 30-second demo, fill in the project page and disclose SI use.
