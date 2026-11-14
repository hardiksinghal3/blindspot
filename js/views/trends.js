import { h, lineChart, gapChart, legend, chip } from '../ui.js';
import { missionDay } from '../mission.js';

export const title = 'Trends';
export default function trends(ctx) {
  const { d, state } = ctx;
  const dayOf = (t) => missionDay(state.mission.start, t);
  const card = (key, note, opts = {}) => {
    const m = d.metrics[key];
    if (!m) return null;
    return h('div', { class: 'panel stack', style: '--gap:10px' },
      h('div', { class: 'row between' }, h('h3', null, m.def.label), chip(m.last.status)),
      h('div', { class: 'row', style: 'gap:18px' },
        h('span', { class: 'num', style: 'font-size:1.5rem' }, m.last.value.toFixed(m.def.digits), h('span', { class: 'small dim' }, ` ${m.def.unit}`)),
        h('span', { class: 'small dim' }, `Your normal ${m.base.center.toFixed(m.def.digits)} ± ${m.base.spread.toFixed(2)}`, m.base.provisional ? ' (provisional reference)' : ` (first ${m.base.n} sessions)`)),
      lineChart({ points: m.points, base: m.base, digits: m.def.digits, dayOf, ...opts }),
      note ? h('p', { class: 'tiny dim' }, note) : null);
  };
  const cards = [
    card('pvt', 'Mean response speed in the reaction test. Higher is better.'), card('lapses', 'Responses of 355 ms or slower.'),
    card('vision', 'Near acuity, worse eye. Each 0.1 is one line on the chart; lower is better.'), card('motor', 'Pointing throughput. Higher is better.'),
    card('temp', 'Dashed line: expected for this mission day. Core temperature rises about 1 °C over the first 2.5 months of flight, so the band rises with it.', { showExpect: true }),
    card('sleep'), card('pulse'), card('mood'),
  ].filter(Boolean);
  return h('div', { class: 'stack', style: '--gap:20px' },
    h('div', null, h('h2', null, 'Trends'), h('p', { class: 'dim', style: 'margin-top:6px;max-width:70ch' }, 'Every reading is judged against your own normal, not an Earth average. The shaded band is your normal range: 1 and 2 spreads.')),
    h('div', { class: 'panel stack' },
      h('div', { class: 'row between' }, h('h3', null, 'Felt against measured'), legend()),
      d.gaps.length ? gapChart({ gaps: d.gaps, dayOf }) : h('p', { class: 'dim' }, 'Your predictions and results will be charted here.'),
      h('p', { class: 'tiny dim' }, 'Each check is one vertical line from what you called to what you measured. Red lines are checks where you were below normal and rated yourself 20 or more points too high.')),
    cards.length ? h('div', { class: 'grid g2' }, cards) : h('p', { class: 'note' }, 'No readings yet. ', h('a', { href: '#/check' }, 'Run a check'), ' or play the mission replay from the home page.'));
}
