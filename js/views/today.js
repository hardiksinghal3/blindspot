import { h, chip, gapBar, legend, signed } from '../ui.js';
import { SYSTEMS } from '../rules.js';
import { TEST_NAME } from '../model.js';
import { formatDelay, isoDate } from '../mission.js';
import { gapLabel } from '../scoring.js';

export const title = 'Today';
export default function today(ctx) {
  const { d, state, replay } = ctx;
  const top = d.result.top[0];
  // Show today's most over-confident call if there is one, otherwise the latest check.
  const todays = d.gaps.filter((g) => isoDate(g.t) === isoDate(ctx.now));
  const last = todays.length ? todays.reduce((a, b) => (b.gap > a.gap ? b : a)) : d.gaps[d.gaps.length - 1];
  const reply = d.lt ? (d.lt.blackout ? 'Earth is out of contact until the Sun moves clear.' : `Earth's reply would take at least ${formatDelay(d.lt.seconds * 2)}.`) : '';

  if (d.focus && top) {
    return h('div', { class: 'panel focus-card stack', style: '--gap:18px' },
      h('div', null, chip(top.status, true)),
      h('h2', null, top.why),
      top.action ? h('p', { class: 'do' }, top.action) : null,
      h('p', { class: 'dim' }, reply),
      h('div', { class: 'row', style: 'justify-content:center;margin-top:10px' }, h('a', { class: 'btn primary big', href: '#/check' }, 'Retest'), h('a', { class: 'btn big', href: '#/packet' }, 'Tell the flight surgeon')));
  }

  const doneToday = (type) => state.checks.some((c) => c.type === type && isoDate(c.t) === isoDate(ctx.now));
  const due = ['pvt', 'vision', 'motor', 'pulse'].filter((t) => !doneToday(t));
  const head = h('div', { class: 'row between' },
    h('div', null, h('p', { class: 'eyebrow' }, replay ? 'Simulated crew member' : state.profile.name || 'Crew member'), h('h2', { style: 'margin-top:8px' }, d.result.overall === 'nodata' ? 'No checks yet today' : d.result.overall === 'go' ? 'Cleared for critical tasks' : d.result.overall === 'watch' ? 'Cleared with caution' : 'Not cleared for critical tasks')),
    replay ? null : h('a', { class: 'btn primary', href: '#/check' }, due.length ? `Run check (${due.length} due)` : 'Run another check'));

  const finding = top
    ? h('div', { class: `panel edge-${top.status} stack` }, h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Top finding'), chip(top.status)), h('h3', { style: 'font-size:1.25rem' }, top.why), top.action ? h('p', null, top.action) : null,
      h('p', { class: 'small dim' }, top.advisory ? 'A long-term caution. It does not hold up today\'s tasks. ' : reply + ' ', h('a', { href: `#/body/${top.rule.system}` }, 'Why this rule fired')))
    : h('div', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, 'Top finding'), h('p', { class: 'dim' }, d.result.overall === 'nodata' ? 'Run a check to get your first reading. Until you have 3, results are judged against a provisional reference.' : 'Nothing needs action. Every system with data is inside your normal band.'));

  const gapPanel = h('div', { class: 'panel stack' },
    h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Insight Gap'), last ? h('span', { class: 'tag' }, TEST_NAME[last.test]) : null),
    last ? [h('div', { class: 'row', style: 'gap:26px;align-items:flex-end' },
      h('div', { class: `gap-big ${last.unaware ? 'c-nogo' : ''}` }, signed(last.gap)),
      h('div', { class: 'small dim', style: 'padding-bottom:8px' }, h('div', null, `Felt ${last.felt} · measured ${last.score}`), h('div', null, gapLabel(last.gap)))),
    gapBar({ felt: last.felt, measured: last.score, status: last.unaware ? 'nogo' : last.status }), legend()]
      : h('p', { class: 'dim' }, 'The gap between how you feel and how you measure appears here after your first check.'),
    h('hr', { class: 'hr' }),
    h('div', { class: 'row between' },
      h('div', null, h('div', { class: 'eyebrow' }, 'Calibration score'), h('div', { class: 'num', style: 'font-size:1.7rem;margin-top:4px' }, d.calibration == null ? 'n/a' : d.calibration, d.calibration == null ? null : h('span', { class: 'dim small' }, ' / 100'))),
      h('div', { class: 'small dim', style: 'max-width:26ch;text-align:right' }, d.bias == null ? 'How well you know yourself, over your last 7 checks.' : `You usually call it ${Math.abs(d.bias)} points ${d.bias >= 0 ? 'high' : 'low'}.`)));

  const poll = h('div', { class: 'panel stack' }, h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Body poll'), h('a', { class: 'small', href: '#/body' }, 'Open')),
    h('div', { class: 'grid g2', style: 'gap:8px' }, Object.entries(SYSTEMS).map(([id, s]) => h('a', { class: 'row between', href: `#/body/${id}`, style: 'flex-wrap:nowrap;padding:9px 10px;border:1px solid var(--line);border-radius:9px;text-decoration:none;color:inherit' }, h('span', { class: 'small' }, s.name), chip(d.result.systems[id].status)))));

  return h('div', { class: 'stack', style: '--gap:20px' }, head, h('div', { class: 'split' }, h('div', { class: 'stack' }, finding, gapPanel), poll));
}
