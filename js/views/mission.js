import { h, fmtDate } from '../ui.js';
import { ENVIRONMENTS, PROFILES, formatDelay, lightTime, isoDate, DAY_MS, BLACKOUT_DEG } from '../mission.js';
import { HAZARDS } from '../rules.js';

export const title = 'Mission';
export default function mission(ctx) {
  const { d, data, state, now } = ctx;
  const lt = d.lt, dose = d.dose;
  const bar = (share, cls) => h('div', { class: 'progress', style: 'height:10px' }, h('i', { style: `width:${Math.min(100, share * 100)}%;background:var(--${cls})` }));
  // Light-time over the next 26 months for Mars, from Horizons.
  let spark = null;
  if (data && d.env.body === 'mars') {
    const pts = [];
    for (let i = 0; i <= 780; i += 6) { const day = isoDate(Date.parse(now) + i * DAY_MS); const v = lightTime(data, 'mars_surface', day); if (v) pts.push([i, v.seconds / 60, v.sunAngle < BLACKOUT_DEG]); }
    const W = 560, H = 120, x = (i) => 30 + (i / 780) * (W - 40), y = (m) => H - 20 - (m / 23) * (H - 34);
    spark = h('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Earth to Mars light-time over the next 26 months' },
      pts.filter((p) => p[2]).map((p) => h('rect', { x: x(p[0]) - 2, y: 8, width: 5, height: H - 28, fill: 'var(--nogo-bg)' })),
      h('polyline', { class: 'line', style: 'stroke:var(--accent)', points: pts.map((p) => `${x(p[0])},${y(p[1])}`).join(' ') }),
      [5, 10, 15, 20].map((m) => h('text', { x: 24, y: y(m) + 3, 'text-anchor': 'end' }, m)),
      h('text', { x: 30, y: H - 5 }, 'today'), h('text', { x: W - 10, y: H - 5, 'text-anchor': 'end' }, '+26 months'), h('circle', { cx: x(0), cy: y(pts[0][1]), r: 4, fill: 'var(--accent)' }));
  }
  return h('div', { class: 'stack', style: '--gap:20px' },
    h('div', { class: 'row between' }, h('div', null, h('h2', null, d.profile.name), h('p', { class: 'dim', style: 'margin-top:6px' }, `${d.env.name} · mission day ${d.mday} of ${dose.missionDays} · started ${fmtDate(state.mission.start)}`)),
      ctx.replay ? null : h('a', { class: 'btn', href: '#/setup' }, 'Change mission')),
    h('div', { class: 'grid g2' },
      h('div', { class: 'panel stack' }, h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Distance from Earth'), h('span', { class: 'tag nasa' }, 'JPL Horizons')),
        h('div', { class: 'num', style: 'font-size:2.6rem;line-height:1' }, lt ? (lt.blackout ? 'No contact' : formatDelay(lt.seconds)) : 'no data'),
        h('p', { class: 'dim small' }, lt ? (lt.blackout ? 'Mars is within 2 degrees of the Sun as seen from Earth. Radio contact is unreliable, so the crew decides alone.' : `One way. Ask a question now and the earliest answer arrives in ${formatDelay(lt.seconds * 2)}, plus the time the flight surgeon needs.`) : 'Ephemeris data did not load.'),
        lt && lt.estimate ? h('p', { class: 'note' }, 'Estimate. Horizons gives the Earth to Mars distance for today; the ship is assumed to cover it evenly during transit.') : null,
        spark, spark ? h('p', { class: 'tiny dim' }, 'Earth to Mars one-way light-time in minutes. Red bands: solar conjunction, no reliable contact.') : null,
        d.blackout ? h('p', { class: 'small' }, h('b', null, 'Next blackout at Mars: '), `${fmtDate(d.blackout.start)} to ${fmtDate(d.blackout.end)} (${d.blackout.days} days).`) : null),
      h('div', { class: 'panel stack' }, h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Radiation ledger'), h('span', { class: 'tag nasa' }, 'NASA limit')),
        h('div', { class: 'num', style: 'font-size:2.6rem;line-height:1' }, Math.round(dose.career), h('span', { class: 'dim', style: 'font-size:1rem' }, ` of ${dose.limit} mSv career`)),
        bar(dose.shareNow, dose.shareNow >= 1 ? 'nogo' : 'accent'),
        h('dl', { class: 'kv' },
          h('dt', null, 'Before this mission'), h('dd', null, `${Math.round(state.mission.priorCareer || 0)} mSv`),
          h('dt', null, dose.estimated ? 'This mission so far (estimate)' : 'This mission (dosimeter)'), h('dd', null, `${dose.mission.toFixed(1)} mSv`),
          h('dt', null, 'Rate here'), h('dd', null, `${d.env.dose} mSv/day`),
          h('dt', null, 'Projected at mission end'), h('dd', { class: dose.projected >= dose.limit ? 'c-watch' : '' }, `${Math.round(dose.projected)} mSv`)),
        bar(dose.shareProjected, dose.shareProjected >= 1 ? 'watch' : 'accent'),
        h('p', { class: 'note' }, 'Rough comparison. Rates are dose equivalent measured around the Solar System for December 2022 solar conditions; the 600 mSv limit is in effective dose. Solar storm dose depends on shielding, so enter the dosimeter reading instead of trusting the estimate.'))),
    h('div', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, 'Mission plan'),
      h('table', { class: 't' }, h('thead', null, h('tr', null, ['Phase', 'Days', 'Gravity', 'Dose rate', 'Tests that apply'].map((x) => h('th', null, x)))),
        h('tbody', null, d.profile.phases.map((p, i) => { const e = ENVIRONMENTS[p.env]; return h('tr', { style: i === d.phase.index ? 'background:rgba(169,188,255,.06)' : '' },
          h('td', null, e.name, i === d.phase.index ? h('span', { class: 'tag', style: 'margin-left:8px' }, 'now') : null), h('td', { class: 'num' }, p.days), h('td', null, e.gravity === 'micro' ? 'Weightless' : `${e.g} g`), h('td', { class: 'num' }, `${e.dose} mSv/day`),
          h('td', { class: 'small dim' }, e.gravity === 'micro' ? 'Reaction, vision, pointing, pulse' : 'Reaction, vision, pointing, pulse; balance tests planned')); }))),
      h('p', { class: 'tiny dim' }, 'Phase lengths are illustrative. Dose rates: Table 2 of the Artemis I radiation paper (Nature, 2024).')),
    h('div', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, 'The five hazards NASA tracks'), h('div', { class: 'row' }, Object.values(HAZARDS).map((x) => h('span', { class: 'tag' }, x))),
      h('p', { class: 'small dim' }, 'Each body system in the ', h('a', { href: '#/body' }, 'body poll'), ' shows which of these act on it.')));
}
