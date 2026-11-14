import { h, chip, gapBar, legend, signed } from '../ui.js';
import { app, context, go } from '../app.js';
import { addCheck, addVitals, getState } from '../store.js';
import { TEST_METRIC, TEST_NAME } from '../model.js';
import { gapLabel, MIN_BASELINE } from '../scoring.js';
import { formatDelay, isoDate } from '../mission.js';
import { runPvt } from '../tests/pvt.js';
import { runMotor } from '../tests/motor.js';
import { runVision } from '../tests/vision.js';
import { runPulse } from '../tests/pulse.js';
import { ruleCard } from './body.js';

export const title = 'Check';
export const keepOnSoft = true;

const TESTS = {
  pvt: { name: 'Alertness', what: 'Reaction test', time: '1 or 3 min', tag: 'Flown on ISS as Reaction Self-Test', system: 'brain', ask: 'How alert are you right now?', needs: 'Keyboard or touch' },
  vision: { name: 'Vision', what: 'Near acuity and grid, each eye', time: '2 min', tag: 'Modelled on ISS vision checks', system: 'eyes', ask: 'How well are you seeing right now?', needs: 'A bank card, once, to size the screen' },
  motor: { name: 'Hands', what: 'Pointing test', time: '30 s', tag: 'Modelled on NASA Fine Motor Skills', system: 'hands', ask: 'How quick and steady are your hands right now?', needs: 'Mouse, trackpad or touch' },
  pulse: { name: 'Pulse', what: 'Tap along or camera', time: '30 s', tag: 'Screening grade', system: 'heart', ask: null, needs: 'Nothing, or a camera' },
};

export default function check(ctx, args) {
  const type = args[0];
  if (ctx.replay) return h('div', { class: 'panel stack', style: 'max-width:640px;margin:0 auto' }, h('h2', null, 'Checks are paused in the replay'), h('p', { class: 'dim' }, 'The replay shows a simulated crew member. Exit the replay to test yourself.'), h('div', null, h('a', { class: 'btn', href: '#/today' }, 'Back to the replay')));
  if (type === 'vitals') return vitals(ctx);
  if (TESTS[type]) return flow(type);
  return hub(ctx);
}

function hub(ctx) {
  const { state, now } = ctx;
  const done = (t) => state.checks.some((c) => c.type === t && isoDate(c.t) === isoDate(now));
  const vitalsDone = state.vitals.some((v) => isoDate(v.t) === isoDate(now));
  const card = (id, t) => h('a', { class: 'panel click stack', href: `#/check/${id}`, style: '--gap:8px' },
    h('div', { class: 'row between' }, h('h3', { style: 'font-size:1.15rem' }, t.name), done(id) ? h('span', { class: 'tag', style: 'color:var(--go);border-color:rgba(63,220,155,.35)' }, 'Done today') : h('span', { class: 'tag' }, t.time)),
    h('p', { class: 'dim' }, t.what), h('p', { class: 'tiny faint' }, `${t.tag} · ${t.needs}`));
  return h('div', { class: 'stack', style: '--gap:20px' },
    h('div', null, h('h2', null, 'Daily check'), h('p', { class: 'dim', style: 'margin-top:6px;max-width:68ch' }, 'For each test you first call your result, then the device measures it. Start with Alertness: it takes a minute and shows the whole idea.')),
    getState().settings.onboarded ? null : h('p', { class: 'note' }, 'You are on the default mission (Mars, day 1). ', h('a', { href: '#/setup' }, 'Set up your mission'), ' to change it.'),
    h('div', { class: 'grid g2' }, Object.entries(TESTS).map(([id, t]) => card(id, t)),
      h('a', { class: 'panel click stack', href: '#/check/vitals', style: '--gap:8px' }, h('div', { class: 'row between' }, h('h3', { style: 'font-size:1.15rem' }, 'Readings'), vitalsDone ? h('span', { class: 'tag', style: 'color:var(--go);border-color:rgba(63,220,155,.35)' }, 'Done today') : h('span', { class: 'tag' }, '1 min')),
        h('p', { class: 'dim' }, 'Sleep, mood, temperature, blood pressure, blood sugar, oxygen, exercise, cabin air'), h('p', { class: 'tiny faint' }, 'Typed in from your devices')),
      h('div', { class: 'panel stack', style: '--gap:8px;opacity:.6' }, h('div', { class: 'row between' }, h('h3', { style: 'font-size:1.15rem' }, 'Balance'), h('span', { class: 'tag' }, 'Planned')),
        h('p', { class: 'dim' }, 'Standing sway and sit-to-stand for surface stays and landing day'), h('p', { class: 'tiny faint' }, 'Not built yet. Balance tests do not apply in weightlessness.'))));
}

function flow(type) {
  const t = TESTS[type];
  const mount = h('div');
  const steps = (n) => h('div', { class: 'steps' }, ...['Call it', 'Test it', 'See the gap'].flatMap((s, i) => [i ? h('i') : null, i === n ? h('b', null, s) : h('span', null, s)]));
  const head = (n) => h('div', { class: 'row between' }, h('div', null, h('p', { class: 'eyebrow' }, t.what), h('h2', { style: 'margin-top:6px' }, t.name)), t.ask ? steps(n) : null);
  const root = h('div', { class: 'stack', style: '--gap:18px;max-width:820px;margin:0 auto' });
  const cleanups = [];
  const register = (fn) => cleanups.push(fn);
  app.cleanup = () => cleanups.splice(0).forEach((fn) => fn());
  let felt = null, quick = true;

  const predict = () => {
    let touched = false;
    const out = h('div', { class: 'num', style: 'font-size:3.4rem;line-height:1;color:var(--accent)' }, '50');
    const lock = h('button', { class: 'btn primary big', disabled: true, onClick: () => { felt = +slider.value; test(); } }, 'Lock in my call');
    const slider = h('input', { class: 'felt', type: 'range', min: 0, max: 100, step: 1, value: 50, 'aria-label': t.ask,
      onInput: () => { out.textContent = slider.value; touch(); }, onPointerdown: () => touch(), onKeydown: () => touch() });
    const touch = () => { if (!touched) { touched = true; lock.disabled = false; } };
    const mode = type === 'pvt' ? h('div', { class: 'row', role: 'radiogroup', 'aria-label': 'Test length' },
      ...[[true, 'Quick, 60 s', 'demo grade'], [false, 'Standard, 3 min', 'PVT-B length']].map(([q, label, sub]) => { const b = h('button', { class: 'btn sm', role: 'radio', 'aria-checked': String(q === quick), style: q === quick ? 'border-color:var(--accent)' : '', onClick: () => { quick = q; predict(); } }, label, h('span', { class: 'faint' }, ` · ${sub}`)); return b; })) : null;
    root.replaceChildren(head(0), h('div', { class: 'panel stack', style: '--gap:18px' },
      h('h3', { style: 'font-size:1.3rem' }, t.ask),
      h('p', { class: 'dim' }, 'Commit before you test. 50 is your normal. Move the slider, even if only to confirm 50.'),
      out, slider, h('div', { class: 'scale' }, h('span', null, '0 far below my normal'), h('span', null, '50 my normal'), h('span', null, '100 my best')),
      mode, h('div', { class: 'row' }, lock, h('a', { class: 'btn ghost', href: '#/check' }, 'Cancel'))));
  };

  const test = () => {
    root.replaceChildren(head(1), mount);
    const onDone = (r) => reveal(r);
    if (type === 'pvt') runPvt(mount, { seconds: quick ? 60 : 180, onDone, register });
    else if (type === 'motor') runMotor(mount, { onDone, register });
    else if (type === 'vision') runVision(mount, { onDone, register });
    else runPulse(mount, { onDone, register });
  };

  const reveal = (r) => {
    let values, detail, lines;
    if (type === 'pvt') {
      const m = r.metrics;
      if (m.n < 5) return invalid('Not enough responses to score. The test needs at least 5.');
      values = { pvt_speed: +m.speed.toFixed(3), pvt_lapses: m.lapses };
      detail = { medianRt: Math.round(m.medianRt), falseStarts: m.falseStarts, n: m.n, seconds: r.seconds };
      lines = [['Median reaction time', `${Math.round(m.medianRt)} ms`], ['Response speed', `${m.speed.toFixed(2)} per second`], ['Lapses (355 ms or slower)', m.lapses], ['False starts', m.falseStarts], ['Responses', m.n]];
    } else if (type === 'motor') {
      const m = r.metrics;
      if (!(m.n >= 10)) return invalid('Not enough taps to score.');
      values = { motor_tp: +m.throughput.toFixed(2) }; detail = { errorRate: m.errorRate, meanTime: Math.round(m.meanTime) };
      lines = [['Throughput', `${m.throughput.toFixed(2)} bits per second`], ['Missed targets', `${Math.round(m.errorRate * 100)} %`], ['Mean time per target', `${Math.round(m.meanTime)} ms`]];
    } else if (type === 'vision') {
      const worstEye = Math.max(r.right, r.left);
      values = { acuity: worstEye }; detail = { right: r.right, left: r.left, floor: r.floor, amsler: r.amsler };
      const f = (v) => (v > 1 ? 'worse than 1.0' : `${v.toFixed(2)}${v <= r.floor ? ' (smallest this screen can draw)' : ''}`);
      lines = [['Right eye, logMAR', f(r.right)], ['Left eye, logMAR', f(r.left)], ['Grid squares marked', r.amsler]];
    } else {
      values = { pulse: r.bpm }; detail = { method: r.method, quality: +r.quality.toFixed(2) };
      lines = [['Resting pulse', `${r.bpm} beats per minute`], ['Method', r.method === 'tap' ? 'Tapped along' : 'Camera'], [r.method === 'tap' ? 'Tap regularity' : 'Signal quality', `${Math.round(r.quality * 100)} %`]];
    }
    addCheck({ type, felt, values, detail, quick: type === 'pvt' ? quick : undefined });
    const { d } = context();
    const key = type === 'pvt' ? 'pvt' : type;
    const m = d.metrics[key], p = m.last;
    const findings = d.result.systems[t.system].findings.filter((f) => f.status !== 'go');
    const lt = d.lt;
    const reply = lt ? (lt.blackout ? 'Earth is out of contact. This call is yours.' : `Earth's reply would take at least ${formatDelay(lt.seconds * 2)}. This call is yours.`) : '';
    const baseNote = m.base.provisional ? `Scored against a provisional reference. Your personal baseline starts after ${MIN_BASELINE} checks (you have ${m.base.n}).` : `Scored against your own baseline from your first ${m.base.n} checks.`;
    const st = p.unaware ? 'nogo' : p.status;
    const gapBlock = p.gap != null ? h('div', { class: `panel stack edge-${st}`, style: '--gap:14px' },
      h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Insight Gap'), chip(p.status, true)),
      h('div', { class: 'row', style: 'gap:30px;align-items:flex-end' },
        h('div', { class: `gap-big ${p.unaware ? 'c-nogo' : ''}` }, signed(p.gap)),
        h('div', { style: 'padding-bottom:10px' }, h('div', { style: 'font-size:1.15rem;font-weight:600' }, p.unaware ? 'Impaired and unaware' : gapLabel(p.gap)), h('div', { class: 'dim small' }, `You called ${felt}. You measured ${p.score}.`))),
      gapBar({ felt, measured: p.score, status: st, animate: true }), legend(),
      h('p', { class: 'small dim' }, baseNote, type === 'pvt' && quick ? ' Quick mode is demo grade; the standard test is 3 minutes.' : ''))
      : h('div', { class: `panel stack edge-${p.status}` }, h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, m.base.forming ? `Baseline reading ${m.base.n} of ${MIN_BASELINE}` : 'Result'), chip(p.status, true)),
        h('div', { class: 'gap-big' }, p.value.toFixed(m.def.digits), h('span', { class: 'dim', style: 'font-size:1.2rem' }, ` ${m.def.unit}`)),
        h('p', { class: 'small dim' }, m.base.forming ? `This result depends on your screen or pointing device, so it is not judged against anyone else. It becomes part of your own baseline, and the Insight Gap for this test starts after ${MIN_BASELINE} readings.${felt != null ? ` Your call of ${felt} is saved.` : ''}` : baseNote));
    root.replaceChildren(...[head(2), gapBlock,
      findings.length ? h('div', { class: 'stack' }, findings.map((f) => ruleCard(f.rule, f))) : h('p', { class: 'note' }, 'No rule fired for this system.'),
      findings.length ? h('p', { class: 'note warn' }, reply) : null,
      h('div', { class: 'panel tight' }, h('dl', { class: 'kv' }, lines.flatMap(([k, v]) => [h('dt', null, k), h('dd', null, v)]))),
      h('div', { class: 'row' }, h('a', { class: 'btn primary big', href: '#/today' }, 'See today'), h('a', { class: 'btn big', href: '#/check' }, 'Next check'), h('a', { class: 'btn ghost', href: '#/trends' }, 'Trends'))].filter(Boolean));
    window.scrollTo(0, 0);
  };

  const invalid = (why) => root.replaceChildren(head(1), h('div', { class: 'panel stack' }, h('h3', null, 'No result'), h('p', { class: 'dim' }, why, ' Nothing was saved.'), h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: predict }, 'Try again'), h('a', { class: 'btn ghost', href: '#/check' }, 'Back'))));

  if (t.ask) predict(); else test();
  return root;
}

const FIELDS = [
  ['sleep', 'Sleep last night', 'h', 0, 16, 0.1], ['temp', 'Body temperature', '°C', 33, 42, 0.1], ['sys', 'Blood pressure, upper', 'mmHg', 60, 260, 1], ['dia', 'Blood pressure, lower', 'mmHg', 30, 160, 1],
  ['pulse', 'Resting pulse', 'bpm', 30, 220, 1], ['spo2', 'Blood oxygen', '%', 60, 100, 1], ['glucose', 'Blood sugar', 'mg/dL', 20, 600, 1], ['exercise', 'Prescribed exercise done today', '%', 0, 100, 1], ['co2', 'Cabin carbon dioxide', 'mmHg', 0, 20, 0.1],
];
function vitals() {
  const inputs = {};
  const err = h('p', { class: 'small c-watch', role: 'alert' });
  let mood = null;
  const moodBtns = [1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', style: 'min-width:48px', onClick: () => { mood = mood === n ? null : n; moodBtns.forEach((b, i) => { const on = i + 1 === mood; b.setAttribute('aria-pressed', String(on)); b.style.borderColor = on ? 'var(--accent)' : ''; }); } }, n));
  const save = (e) => {
    e.preventDefault();
    const rec = {};
    for (const [k, label, , lo, hi] of FIELDS) {
      const raw = inputs[k].value.trim();
      if (raw === '') continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v < lo || v > hi) { err.textContent = `${label}: enter a number from ${lo} to ${hi}, or leave it empty.`; inputs[k].focus(); return; }
      rec[k] = v;
    }
    if ((rec.sys == null) !== (rec.dia == null)) { err.textContent = 'Blood pressure needs both numbers.'; return; }
    if (mood != null) rec.mood = mood;
    if (!Object.keys(rec).length) { err.textContent = 'Enter at least one reading.'; return; }
    addVitals(rec); go('today');
  };
  return h('div', { class: 'stack', style: '--gap:18px;max-width:820px;margin:0 auto' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Typed in from your devices'), h('h2', { style: 'margin-top:6px' }, 'Readings')),
    h('form', { class: 'panel stack', onSubmit: save, novalidate: true },
      h('p', { class: 'dim small' }, 'Fill in what you have. Empty fields are skipped.'),
      h('div', { class: 'grid g3' }, FIELDS.map(([k, label, unit, lo, hi, step]) => h('label', { class: 'f' }, h('span', null, label), h('div', { class: 'unit' }, (inputs[k] = h('input', { class: 'in', type: 'number', inputMode: 'decimal', min: lo, max: hi, step })), h('em', null, unit))))),
      h('div', { class: 'f' }, h('span', { style: 'display:block;margin-bottom:6px;font-size:.86rem;color:var(--dim)' }, 'Mood today, 1 low to 5 good'), h('div', { class: 'row', role: 'group', 'aria-label': 'Mood' }, moodBtns)),
      err, h('div', { class: 'row' }, h('button', { class: 'btn primary big', type: 'submit' }, 'Save readings'), h('a', { class: 'btn ghost', href: '#/check' }, 'Cancel'))));
}
