#!/usr/bin/env python3
"""Builds the 7-slide demo deck (deck.html and BlindSpot-demo.pdf) from the text below and the app's own data."""
import json, subprocess, pathlib
HERE = pathlib.Path(__file__).parent
LIVE = '<a href="https://hardiksinghal3.github.io/blindspot/">hardiksinghal3.github.io/blindspot</a>'
CODE = '<a href="https://github.com/hardiksinghal3/blindspot">github.com/hardiksinghal3/blindspot</a>'

def slide(n, body, night=False):
    return f'<section class="s{" n" if night else ""}">{body}<div class="pg"><span>BlindSpot · research prototype</span><span>{n}</span></div></section>'

def light_time_chart(w=500, h=200):
    """One-way Earth to Mars signal time in minutes, from the bundled JPL Horizons table."""
    d = json.load(open(HERE.parent / 'public/data/lighttime.json'))
    mins = [au * d['au_km'] / d['c_km_s'] / 60 for au in d['bodies']['mars']['range_au']]
    n, top = len(mins), 25
    x = lambda i: 34 + i / (n - 1) * (w - 40); y = lambda m: h - 24 - m / top * (h - 40)
    pts = ' '.join(f'{x(i):.1f},{y(m):.1f}' for i, m in enumerate(mins) if i % 6 == 0)
    peak = max(range(n), key=lambda i: mins[i])
    grid = ''.join(f'<line x1="34" x2="{w-6}" y1="{y(m):.1f}" y2="{y(m):.1f}" stroke="#D8D3C8"/><text x="26" y="{y(m)+4:.1f}" text-anchor="end">{m}</text>' for m in (0, 10, 20))
    years = ''.join(f'<text x="{x((yr-2023)*365.25):.1f}" y="{h-6}" text-anchor="middle">{yr}</text>' for yr in (2024, 2028, 2032, 2036, 2040))
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" font-family="Figtree" font-size="12" fill="#565D70">{grid}{years}'
            f'<polyline points="{pts}" fill="none" stroke="#1B5FD9" stroke-width="1.8" stroke-linejoin="round"/>'
            f'<circle cx="{x(peak):.1f}" cy="{y(mins[peak]):.1f}" r="4" fill="#0B1733"/>'
            f'<text x="{x(peak)+9:.1f}" y="{y(mins[peak])-7:.1f}" fill="#0B1733" font-weight="600" font-size="13">{mins[peak]:.1f} min</text></svg>')

s1 = slide(1, f'''
<p class="sm m">NASA Space Apps Challenge 2026 · Create health monitoring software for astronauts on space missions</p>
<h1 style="font-size:138px;letter-spacing:-.03em;margin-top:96px">BlindSpot</h1>
<p style="font-size:30px;font-weight:500;margin-top:10px">The health monitor that does not trust how you feel.</p>
<svg class="abs" style="left:72px;top:440px" width="1136" height="96" font-family="Figtree" font-size="14">
<line x1="0" x2="1136" y1="30" y2="30" stroke="#2B3B66"/><line x1="102" x2="931" y1="30" y2="30" stroke="#fff" stroke-width="2"/>
<line x1="102" x2="102" y1="14" y2="46" stroke="#FF8A73" stroke-width="3"/><line x1="931" x2="931" y1="14" y2="46" stroke="#8DB8FF" stroke-width="3"/>
<text x="102" y="70" fill="#FF8A73">how they measured</text><text x="931" y="70" fill="#8DB8FF" text-anchor="end">how they said they felt</text>
<text x="516" y="16" fill="#fff" text-anchor="middle" font-family="Newsreader" font-style="italic" font-size="22">the blind spot</text></svg>
<div class="abs sm" style="left:72px;bottom:76px;display:flex;gap:56px"><div><span class="m">Live demo</span><br>{LIVE}</div><div><span class="m">Code</span><br>{CODE}</div><div><span class="m">Team</span><br>Hardik Singhal</div></div>
''', True)

s2 = slide(2, f'''
<div style="width:590px"><h1>A tired brain rates itself as fine.</h1>
<p style="margin-top:26px">In a 2003 sleep study, 14 days of sleep limited to 6 hours or less cut performance as much as up to two nights with no sleep. The subjects were largely unaware of it.</p>
<p class="sm m" style="margin-top:6px">Van Dongen and others, Sleep, 2003</p>
<p style="margin-top:20px">About 70 % of space station astronauts get some swelling at the back of the eye, and near vision can change without the astronaut noticing.</p>
<p class="sm m" style="margin-top:6px">NASA Human Research Program, SANS risk</p></div>
<div class="abs" style="left:708px;top:76px;width:500px"><p style="font-size:17px;font-weight:600">And Earth is a long way off</p>
<p class="sm m">One-way signal time from Earth to Mars, in minutes, 2023 to 2040</p>
<div style="margin-top:14px">{light_time_chart()}</div>
<p class="sm m" style="margin-top:4px">Computed from the NASA / JPL Horizons distances bundled in the app.</p>
<p style="margin-top:18px">At the far side of the orbit, a question and its answer take about 44 minutes. Nobody on the ground can catch a bad self-assessment in time.</p></div>
<p class="abs it" style="left:72px;bottom:74px;font-size:27px;width:1100px">A health monitor that begins with “how do you feel?” inherits this blind spot.</p>
''')

s3 = slide(3, '''
<h1>Ask first. Measure second. Act on the difference.</h1>
<svg class="abs" style="left:72px;top:214px" width="1136" height="190" font-family="Figtree" font-size="14" fill="#565D70">
<line x1="0" x2="1136" y1="96" y2="96" stroke="#D8D3C8" stroke-width="2"/>
''' + ''.join(f'<line x1="{i*113.6:.0f}" x2="{i*113.6:.0f}" y1="90" y2="102" stroke="#B9B3A6"/>' for i in range(11)) + '''
<text x="0" y="124">0</text><text x="1136" y="124" text-anchor="end">100</text>
<line x1="102" x2="931" y1="96" y2="96" stroke="#C0271F" stroke-width="5" opacity=".28"/>
<line x1="931" x2="931" y1="58" y2="110" stroke="#1B5FD9" stroke-width="4"/><line x1="102" x2="102" y1="82" y2="134" stroke="#C0271F" stroke-width="4"/>
<text x="931" y="24" text-anchor="middle" fill="#1B5FD9" font-weight="600">You called</text><text x="931" y="50" text-anchor="middle" fill="#0B1733" font-size="26" font-weight="700">82</text>
<text x="102" y="160" text-anchor="middle" fill="#C0271F" font-weight="600">You measured</text><text x="102" y="186" text-anchor="middle" fill="#0B1733" font-size="26" font-weight="700">9</text>
<text x="516" y="74" text-anchor="middle" fill="#0B1733" font-family="Newsreader" font-size="34">Insight Gap +73</text>
<text x="516" y="128" text-anchor="middle" fill="#C0271F" font-weight="700" letter-spacing=".04em">NO-GO · impaired and unaware</text></svg>
<div class="cols abs" style="left:72px;right:72px;top:446px">
<div><b>Call it</b><span>Before each test the astronaut predicts the result on a slider.</span></div>
<div><b>Test it</b><span>Reaction time, near vision, pointing, pulse and balance, measured on the laptop against their own baseline.</span></div>
<div><b>See the gap</b><span>Felt minus measured. A large gap while impaired is the dangerous state, and it gets its own alarm.</span></div>
<div><b>Act without Earth</b><span>Each body system reports GO, WATCH or NO-GO from written rules, with the source of every number.</span></div></div>
<p class="abs sm m" style="left:72px;bottom:66px">Illustrative numbers. The Insight Gap is a hypothesis built on sleep research and has not been validated.</p>
''')

checks = [('Alertness', '1 or 3 min', 'Reaction test built to the PVT-B method; flown on the ISS as Reaction Self-Test.'),
          ('Vision', '2 min', 'Near acuity and an Amsler grid for each eye, modelled on ISS vision checks.'),
          ('Hands', '30 s', 'Pointing at random targets, for fine motor control.'),
          ('Pulse', '30 s', 'Tap along, or the camera on the face or a tracked palm. Screening grade.'),
          ('Balance', '1 min', 'Five timed sit-to-stands. Under gravity only.'),
          ('Readings', '1 min', 'Sleep, mood, temperature, blood pressure, oxygen and cabin air, typed in.')]
s4 = slide(4, '<div style="width:520px"><h1 style="font-size:46px">Six checks on one laptop, with no extra hardware.</h1><table style="margin-top:22px">'
           + ''.join(f'<tr><td style="width:96px"><b>{a}</b></td><td class="m" style="width:84px;font-size:14px;padding-top:13px">{b}</td><td style="padding-right:0;font-size:15.5px">{c}</td></tr>' for a, b, c in checks)
           + '''</table></div>
<img class="shot abs" src="shots/s4.png" style="left:640px;top:96px;width:568px">
<p class="abs sm m it" style="left:640px;top:388px;font-size:16px">The Check screen of the live app.</p>
<p class="abs" style="left:640px;top:440px;width:568px;font-size:18px">Each result is scored against the astronaut’s own baseline once there are three readings. Readings stay in the browser; nothing is sent anywhere.</p>
''')

notes = [(64, 76, 'Focus mode', 'They measured below normal, so the screen drops to one instruction.'),
         (158, 193, 'The gap', 'Their own judgement is 28 points too high.'),
         (238, 248, 'The instruction', 'Do not self-certify. Hand over critical tasks and ask a crewmate to cross-check.'),
         (336, 287, 'Earth is late', 'A reply would take at least 14 min 19 s, so written rules decide.')]
lead = ''.join(f'<polyline points="700,{b} 726,{b} 726,{a+12} 752,{a+12}" fill="none" stroke="#0B1733" stroke-width="1"/><circle cx="700" cy="{b}" r="3.5" fill="#0B1733"/>' for a, b, _, _ in notes)
s5 = slide(5, '''<h1>Day 66. They call 44. They measure 16.</h1>
<p class="m" style="margin-top:10px">A simulated crew member on about five hours of sleep, flown through real NASA signal-delay and solar storm records.</p>
<div class="abs" style="left:72px;top:206px;width:1136px;height:400px"><img class="shot" src="shots/s5.png" style="width:700px">
<svg class="abs" style="left:0;top:0" width="1136" height="400">''' + lead + '</svg>'
+ ''.join(f'<div class="note abs" style="left:762px;top:{a}px;width:374px"><b>{t}</b><span>{d}</span></div>' for a, _, t, d in notes)
+ '''</div><p class="abs sm m it" style="left:72px;bottom:62px;font-size:16px">Today screen of the live app, replay day 66. To try it, open the live demo and choose “Play a 180-day mission”.</p>''')

rows = [('NASA / JPL Horizons', 'Daily Earth to Mars and Earth to Moon distance and Sun angle, 2023 to 2040', 'Signal delay, earliest reply time and communication blackouts'),
        ('NASA DONKI', '494 solar energetic particle records, 2010 to November 2026', 'A recent event raises the radiation status'),
        ('NASA-STD-3001 Vol. 1', '600 mSv career effective dose limit', 'Career dose shown against the limit'),
        ('NASA-STD-3001 Vol. 2', '3 mmHg one-hour cabin carbon dioxide limit', 'Cabin air turns NO-GO above it'),
        ('Acta Astronautica, 2011', 'The 3-minute PVT-B reaction test', 'Timing and scoring of the Alertness check'),
        ('Sleep, 2003', 'Sleep restriction and self-rated sleepiness', 'The reason for the Insight Gap')]
s6 = slide(6, '<h1>Real NASA data in, and every number traced to its source.</h1><table style="margin-top:30px"><tr><th style="width:250px">Source</th><th style="width:470px">What it provides</th><th>What BlindSpot does with it</th></tr>'
           + ''.join(f'<tr><td><b>{a}</b></td><td>{b}</td><td class="m" style="padding-right:0">{c}</td></tr>' for a, b, c in rows)
           + '</table><p class="abs it" style="left:72px;bottom:68px;width:1100px;font-size:23px;line-height:1.3">Only 600 mSv, 3 mmHg and the 2.5 mmHg seven-day carbon dioxide figure are NASA’s numbers. Every other threshold is marked in the app as this prototype’s own setting.</p>')

def block(t, items, top):
    return f'<div class="abs" style="left:640px;top:{top}px;width:568px"><p class="sm m" style="border-top:1px solid var(--nrule);padding-top:10px">{t}</p>' + ''.join(f'<p style="font-size:17.5px;margin-top:6px">{i}</p>' for i in items) + '</div>'
s7 = slide(7, '''<h1 style="font-size:50px;white-space:nowrap;line-height:1.14;margin-top:6px">Not a medical device.<br>Not validated in flight.<br>Not endorsed by NASA.</h1>
<p class="m" style="width:480px;margin-top:26px">A research prototype. The crew member in the replay is simulated; the NASA data is real.</p>'''
+ block('Still unproven', ['The Insight Gap is a hypothesis, not a validated measure.', 'Camera pulse and the balance test are screening grade.'], 70)
+ block('What comes next', ['Test the Insight Gap against sleep-restriction study data.', 'Read wearables and cabin sensors instead of typed values.', 'Have flight surgeons set and review the rule thresholds.'], 232)
+ block('SI disclosure', ['The code, the app text and this deck were produced with SI (AI) coding tools. No SI-generated images, video or audio are used. Screenshots are of the live app.'], 430)
+ f'<div class="abs sm" style="left:72px;bottom:76px;display:flex;gap:56px"><div><span class="m">Live demo</span><br>{LIVE}</div><div><span class="m">Code</span><br>{CODE}</div></div>', True)

html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BlindSpot demo</title><link rel="stylesheet" href="deck.css"></head><body>' + s1 + s2 + s3 + s4 + s5 + s6 + s7 + '</body></html>'
(HERE / 'deck.html').write_text(html)
subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=4000',
                f'--print-to-pdf={HERE / "BlindSpot-demo.pdf"}', f'file://{HERE / "deck.html"}'], check=True, capture_output=True)
print('built')
