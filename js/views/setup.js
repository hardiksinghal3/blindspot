import { h } from '../ui.js';
import { getState, update, resetAll, importJson } from '../store.js';
import { PROFILES, ENVIRONMENTS } from '../mission.js';
import { go } from '../app.js';

export const title = 'Mission setup';
export default function setup() {
  const s = getState();
  const name = h('input', { class: 'in', value: s.profile.name, placeholder: 'Call sign or name', maxLength: 40 });
  const profile = h('select', { class: 'in' }, Object.entries(PROFILES).map(([id, p]) => h('option', { value: id, selected: s.mission.profile === id }, p.name)));
  const start = h('input', { class: 'in', type: 'date', value: s.mission.start, min: '2026-01-01', max: '2039-12-31' });
  const prior = h('input', { class: 'in', type: 'number', min: 0, max: 2000, step: 1, value: s.mission.priorCareer || 0 });
  const dosi = h('input', { class: 'in', type: 'number', min: 0, max: 5000, step: 0.1, value: s.mission.dosimeter ?? '', placeholder: 'optional' });
  const focus = h('select', { class: 'in' }, [['auto', 'Automatic: when I measure below normal'], ['on', 'Always on'], ['off', 'Off']].map(([v, l]) => h('option', { value: v, selected: s.settings.focus === v }, l)));
  const msg = h('p', { class: 'small', role: 'status' });
  const plan = h('p', { class: 'small dim' });
  const showPlan = () => { plan.textContent = PROFILES[profile.value].phases.map((p) => `${ENVIRONMENTS[p.env].name} ${p.days} days`).join(' → '); };
  profile.addEventListener('change', showPlan); showPlan();
  const save = (e) => {
    e.preventDefault();
    update((st) => {
      st.profile.name = name.value.trim(); st.mission.profile = profile.value; st.mission.start = start.value || st.mission.start;
      st.mission.priorCareer = Math.max(0, +prior.value || 0); st.mission.dosimeter = dosi.value === '' ? null : Math.max(0, +dosi.value);
      st.settings.focus = focus.value; st.settings.onboarded = true;
    });
    go('check');
  };
  const file = h('input', { type: 'file', accept: 'application/json', class: 'sr', onChange: async (e) => { try { importJson(await e.target.files[0].text()); msg.textContent = 'Data imported.'; } catch (err) { msg.textContent = `Import failed: ${err.message}`; } } });
  return h('div', { class: 'stack', style: '--gap:20px;max-width:720px;margin:0 auto' },
    h('div', null, h('h2', null, 'Mission setup'), h('p', { class: 'dim', style: 'margin-top:6px' }, 'This sets which environment you are in, and so which rules and expected changes apply. Everything stays in this browser.')),
    h('form', { class: 'panel stack', onSubmit: save },
      h('label', { class: 'f' }, h('span', null, 'Crew member'), name),
      h('label', { class: 'f' }, h('span', null, 'Mission'), profile), plan,
      h('div', { class: 'grid g2' },
        h('label', { class: 'f' }, h('span', null, 'Mission day 1'), start),
        h('label', { class: 'f' }, h('span', null, 'Career dose before this mission'), h('div', { class: 'unit' }, prior, h('em', null, 'mSv')))),
      h('div', { class: 'grid g2' },
        h('label', { class: 'f' }, h('span', null, 'Dosimeter total, this mission'), h('div', { class: 'unit' }, dosi, h('em', null, 'mSv'))),
        h('label', { class: 'f' }, h('span', null, 'Focus mode'), focus)),
      h('div', { class: 'row' }, h('button', { class: 'btn primary big', type: 'submit' }, 'Save and run a check'))),
    h('div', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, 'Your data'),
      h('div', { class: 'row' }, h('label', { class: 'btn' }, 'Import a backup', file),
        h('button', { class: 'btn', onClick: () => { if (confirm('Delete every reading and setting stored in this browser?')) { resetAll(); msg.textContent = 'All data deleted.'; } } }, 'Delete all data')), msg));
}
