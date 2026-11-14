import { h, chip, bodyFigure } from '../ui.js';
import { SYSTEMS, HAZARDS, RULES } from '../rules.js';
import { SOURCES } from '../sources.js';
import { go } from '../app.js';

export const title = 'Body';
export const ORIGIN = { nasa: ['NASA number', 'nasa'], clinical: ['Clinical convention', ''], prototype: ['Prototype setting', ''] };
export const srcLinks = (ids) => ids.map((id) => { const s = SOURCES[id]; return h('li', null, s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title) : s.title, h('span', { class: 'faint' }, ` · ${s.org}`)); });

export function ruleCard(rule, finding) {
  const [label, cls] = ORIGIN[rule.origin];
  return h('div', { class: `panel tight stack ${finding && finding.status !== 'go' ? 'edge-' + finding.status : ''}`, style: '--gap:8px' },
    h('div', { class: 'row between' }, h('h3', null, rule.title), h('div', { class: 'row', style: 'gap:6px' }, h('span', { class: `tag ${cls}` }, label), finding ? chip(finding.status) : null)),
    finding ? h('p', null, finding.why) : null,
    finding && finding.action ? h('p', null, h('b', null, 'Do now: '), finding.action) : null,
    h('p', { class: 'small dim' }, h('b', null, 'Rule: '), rule.trigger),
    h('ul', { class: 'tiny dim', style: 'margin:0;padding-left:18px' }, srcLinks(rule.sources)));
}

export default function body(ctx, args) {
  const { d } = ctx;
  const order = { nogo: 0, watch: 1, go: 2, nodata: 3 };
  const sel = SYSTEMS[args[0]] ? args[0] : Object.keys(SYSTEMS).sort((a, b) => order[d.result.systems[a].status] - order[d.result.systems[b].status])[0];
  const sys = SYSTEMS[sel], res = d.result.systems[sel];
  const rules = RULES.filter((r) => r.system === sel);
  const detail = h('div', { class: 'stack' },
    h('div', { class: 'panel stack' },
      h('div', { class: 'row between' }, h('div', null, h('p', { class: 'eyebrow' }, sys.part), h('h2', { style: 'margin-top:6px' }, sys.name)), chip(res.status, true)),
      h('p', null, sys.does),
      h('p', { class: 'dim small' }, h('b', null, 'In space: '), sys.affects),
      h('div', { class: 'row', style: 'gap:6px' }, sys.hazards.map((x) => h('span', { class: 'tag' }, HAZARDS[x])))),
    rules.map((r) => ruleCard(r, res.findings.find((f) => f.rule.id === r.id))),
    res.status === 'nodata' ? h('p', { class: 'note' }, 'No data yet for this system. ', h('a', { href: '#/check' }, 'Run a check or enter readings.')) : null);
  return h('div', { class: 'stack', style: '--gap:20px' },
    h('div', null, h('h2', null, 'Body poll'), h('p', { class: 'dim', style: 'margin-top:6px' }, 'Like a launch poll, each system answers GO, WATCH or NO-GO. Select a system to see the rule behind its answer.')),
    h('div', { class: 'split', style: 'grid-template-columns:minmax(0,340px) minmax(0,1fr)' },
      h('div', { class: 'panel' }, bodyFigure({ systems: d.result.systems, selected: sel, onSelect: (id) => go(`body/${id}`) })),
      detail));
}
