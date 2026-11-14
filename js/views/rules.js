import { h } from '../ui.js';
import { RULES, SYSTEMS } from '../rules.js';
import { ruleCard } from './body.js';

export const title = 'Flight rules';
export default function rules(ctx) {
  const { d } = ctx;
  return h('div', { class: 'stack', style: '--gap:22px' },
    h('div', null, h('h2', null, 'Flight rules'), h('p', { class: 'dim', style: 'margin-top:6px;max-width:70ch' }, 'Decisions come from these written rules, agreed before the mission, not from a model you cannot inspect. Each rule shows where its number comes from.')),
    h('p', { class: 'note' }, 'Only the 600 mSv dose limit and the 3 and 2.5 mmHg carbon dioxide levels are NASA\'s numbers. Rules marked "Prototype setting" use thresholds chosen for this prototype; their sources are the evidence behind the idea, not approval of the threshold.'),
    Object.entries(SYSTEMS).map(([id, s]) => h('section', { class: 'stack' }, h('h3', { class: 'eyebrow' }, s.name),
      h('div', { class: 'grid g2' }, RULES.filter((r) => r.system === id).map((r) => ruleCard(r, d.result.findings.find((f) => f.rule.id === r.id)))))));
}
