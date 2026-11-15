#!/usr/bin/env python3
"""Builds the 7-slide demo deck. `build.py template` renders the empty layout, `build.py` the final deck."""
import sys, subprocess, pathlib, importlib
HERE = pathlib.Path(__file__).parent
mode = 'template' if len(sys.argv) > 1 and sys.argv[1] == 'template' else 'final'
C = importlib.import_module('content_' + mode).C
PH = ' ph' if mode == 'template' else ''
MARK = '<svg viewBox="0 0 32 32"><circle cx="11" cy="16" r="7" fill="none" stroke="#1B5FD9" stroke-width="4"/><circle cx="25" cy="16" r="4" fill="#D93025"/></svg>'

def frame(n, kicker, inner, night=False, foot=''):
    return f'''<section class="slide{' night' if night else ''}">
<div class="top"><span>{kicker}</span><span class="brand">{MARK}BlindSpot</span></div>
{inner}
<div class="foot"><span>{foot}</span><span class="n">{n} / 7</span></div></section>'''

def head(s): return f'<h1>{s["title"]}</h1>' + (f'<p class="lead">{s["lead"]}</p>' if s.get('lead') else '')

def shot(s, flex='1.25'):
    inner = f'<img src="{s["img"]}">' if s.get('img') else s['img_note']
    size = '' if s.get('img') else ' style="flex:1;min-height:0"'
    return f'<div class="col" style="flex:{flex};gap:0"><div class="shot{PH}"{size}>{inner}</div><div class="cap">{s["cap"]}</div></div>'

def steps(items, cls=''):
    return f'<ol class="steps{cls}">' + ''.join(f'<li><div class="k">{i+1}</div><div><b>{a}</b><span>{b}</span></div></li>' for i, (a, b) in enumerate(items)) + '</ol>'

def s1(s):
    links = ''.join(f'<div><b>{a}</b>{b}</div>' for a, b in s['links'])
    path = '''<svg class="path" viewBox="0 0 330 260" fill="none"><path d="M40 210 C120 60 220 40 290 60" stroke="#3A5290" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/>
<circle cx="40" cy="210" r="16" fill="#7FB0FF"/><circle cx="290" cy="60" r="11" fill="#E0694A"/><circle cx="168" cy="87" r="5" fill="#fff"/>
<text x="40" y="246" fill="#9FACC8" font-size="13" text-anchor="middle" font-family="Figtree">Earth</text><text x="290" y="92" fill="#9FACC8" font-size="13" text-anchor="middle" font-family="Figtree">Mars</text>
<text x="180" y="120" fill="#C6D0E6" font-size="13" font-family="Figtree">%s</text></svg>''' % s['path']
    return frame(1, s['kicker'], f'{path}<div class="title"><h1>{s["title"]}</h1><div class="sub">{s["sub"]}</div><p class="lead">{s["lead"]}</p></div><div class="links">{links}</div>', True, s['foot'])

def s2(s):
    cards = ''.join(f'<div class="card col{PH}"><div class="fig">{f}</div><p>{t}</p><div class="src">{src}</div></div>' for f, t, src in s['stats'])
    return frame(2, s['kicker'], head(s) + f'<div class="body">{cards}</div><div class="strip">{s["strip"]}</div>', foot=s['foot'])

def s3(s):
    e = s['example']
    card = f'''<div class="card col{PH}" style="gap:14px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="tag">{e["label"]}</span><span class="status nogo"><i></i>{e["status"]}</span></div>
<div class="nums"><div><small>You called</small><b>{e["felt"]}</b></div><div><small>You measured</small><b>{e["measured"]}</b></div><div><small>Insight Gap</small><b>{e["gap"]}</b></div></div>
<div class="gap"><div class="track"></div><div class="span" style="left:{e["m"]}%;width:{e["f"]-e["m"]}%"></div><div class="m" style="left:{e["m"]}%;background:var(--nogo)"></div><div class="m" style="left:{e["f"]}%;background:var(--accent)"></div><div class="t" style="left:{e["m"]}%">Measured</div><div class="t" style="left:{e["f"]}%">Felt</div></div>
<p class="note">{e["note"]}</p><div class="src">{e["cap"]}</div></div>'''
    return frame(3, s['kicker'], head(s) + f'<div class="body"><div class="col">{steps(s["steps"])}</div><div class="col" style="flex:1.05">{card}</div></div>', foot=s['foot'])

def s4(s):
    return frame(4, s['kicker'], head(s) + f'<div class="body">{shot(s, "1.3")}<div class="col">{steps(s["steps"], " tight")}</div></div>', foot=s['foot'])

def s5(s):
    pts = ''.join(f'<div class="card{PH}" style="padding:13px 18px"><div class="tag">{a}</div><p style="margin-top:4px;font-size:16px;line-height:1.35">{b}</p></div>' for a, b in s['points'])
    return frame(5, s['kicker'], head(s) + f'<div class="body">{shot(s, "1.5")}<div class="col" style="gap:10px">{pts}</div></div>', foot=s['foot'])

def s6(s):
    cards = ''.join(f'<div class="card col{PH}" style="gap:8px;padding:20px 24px"><div class="tag">{tag}</div><h3>{h}</h3><p style="font-size:18px;color:var(--mute)">{t}</p></div>' for tag, h, t in s['cards'])
    return frame(6, s['kicker'], head(s) + f'<div class="body"><div class="grid2">{cards}</div></div><div class="strip" style="margin-top:16px;padding:12px 22px;font-size:16px">{s["strip"]}</div>', foot=s['foot'])

def s7(s):
    cols = ''.join(f'<div class="card col{PH}" style="gap:12px"><div class="tag">{h}</div><ul class="plain">' + ''.join(f'<li>{x}</li>' for x in items) + '</ul></div>' for h, items in s['cols'])
    links = ''.join(f'<div><b>{a}</b>{b}</div>' for a, b in s['links'])
    return frame(7, s['kicker'], head(s) + f'<div class="body">{cols}</div><div class="links" style="margin-top:22px">{links}</div>', True, s['foot'])

html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>BlindSpot demo</title><link rel="stylesheet" href="deck.css"></head><body>' + \
    ''.join(f(C[i]) for i, f in enumerate([s1, s2, s3, s4, s5, s6, s7])) + '</body></html>'
out = HERE / f'{mode}.html'
out.write_text(html)
pdf = HERE / ('BlindSpot-template.pdf' if mode == 'template' else 'BlindSpot-demo.pdf')
subprocess.run(['google-chrome', '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=4000',
                f'--print-to-pdf={pdf}', f'file://{out}'], check=True, capture_output=True)
print(pdf)
