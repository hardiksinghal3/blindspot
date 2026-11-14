// Reaction test modelled on the 3-minute PVT-B: random 1-4 s gaps (including 1 s of feedback),
// a running millisecond counter as the stimulus, lapses at 355 ms or slower.
import { h } from '../ui.js';
import { pvtMetrics, FALSE_START_MS } from '../scoring.js';

const TIMEOUT_MS = 30000;

export function runPvt(mount, { seconds, onDone, register }) {
  const counter = h('div', { class: 'counter', 'aria-live': 'off' }, '');
  const msg = h('p', { class: 'msg' }, 'Press ', h('kbd', null, 'Space'), ' or tap here the moment the numbers start. Get ready.');
  const box = h('div', { class: 'box' }, counter);
  const bar = h('i');
  const stage = h('div', { class: 'stage armed', tabindex: 0, role: 'application', 'aria-label': 'Reaction test. Press space when the counter starts.' }, h('div', { class: 'stack', style: '--gap:22px;display:grid;justify-items:center' }, box, msg));
  mount.replaceChildren(h('div', { class: 'stack', style: '--gap:10px' }, h('div', { class: 'progress' }, bar), stage));
  stage.focus();

  const trials = [];
  let phase = 'wait', onset = 0, timer = null, raf = 0, done = false;
  const t0 = performance.now();
  const elapsed = () => performance.now() - t0;

  const schedule = (first) => {
    phase = 'wait';
    counter.textContent = '';
    box.style.borderColor = '#b33';
    const gap = first ? 1500 + Math.random() * 2000 : Math.random() * 3000; // plus the 1 s feedback already shown
    timer = setTimeout(show, gap);
  };
  const show = () => {
    raf = requestAnimationFrame((ts) => {
      onset = ts; phase = 'go';
      const tick = () => { if (phase !== 'go') return; const ms = performance.now() - onset; counter.textContent = Math.max(0, Math.round(ms)); if (ms > TIMEOUT_MS) return respond(onset + TIMEOUT_MS); raf = requestAnimationFrame(tick); };
      tick();
    });
  };
  const feedback = (text, color) => {
    phase = 'feedback'; counter.textContent = text; box.style.borderColor = color;
    bar.style.width = `${Math.min(100, (elapsed() / (seconds * 1000)) * 100)}%`;
    timer = setTimeout(() => (elapsed() >= seconds * 1000 ? finish() : schedule(false)), 1000);
  };
  const respond = (ts) => {
    if (done) return;
    if (phase === 'go') {
      cancelAnimationFrame(raf);
      const rt = Math.round(ts - onset);
      if (rt < FALSE_START_MS) { trials.push({ rt: null, falseStart: true }); return feedback('Too soon', '#ffb62e'); }
      trials.push({ rt, falseStart: false });
      msg.textContent = `${trials.filter((t) => !t.falseStart).length} responses`;
      feedback(String(rt), '#3a4658');
    } else if (phase === 'wait') {
      clearTimeout(timer); cancelAnimationFrame(raf);
      trials.push({ rt: null, falseStart: true });
      feedback('Too soon', '#ffb62e');
    }
  };
  const finish = () => { if (done) return; done = true; stop(); onDone({ trials, metrics: pvtMetrics(trials), seconds }); };
  const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) respond(e.timeStamp); } };
  const tap = (e) => { e.preventDefault(); respond(e.timeStamp); };
  const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); window.removeEventListener('keydown', key, true); stage.removeEventListener('pointerdown', tap); };
  window.addEventListener('keydown', key, true);
  stage.addEventListener('pointerdown', tap);
  register(() => { done = true; stop(); });
  schedule(true);
}
