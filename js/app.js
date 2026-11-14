// App shell: routing, header, mission bar, replay bar, focus bar.
import { h, chip, logo } from './ui.js';
import { getState, subscribe, update } from './store.js';
import { derive } from './model.js';
import { formatDelay, ENVIRONMENTS } from './mission.js';
import { buildReplay, replayNow, replaySpe, REPLAY_DAYS, REPLAY_EVENTS } from './replay.js';

const NAV = [['today', 'Today'], ['check', 'Check'], ['body', 'Body'], ['trends', 'Trends'], ['mission', 'Mission'], ['rules', 'Flight rules'], ['packet', 'Surgeon packet'], ['sources', 'Sources']];
const VIEWS = {
  '': () => import('./views/landing.js'), today: () => import('./views/today.js'), check: () => import('./views/check.js'), body: () => import('./views/body.js'),
  trends: () => import('./views/trends.js'), mission: () => import('./views/mission.js'), rules: () => import('./views/rules.js'), packet: () => import('./views/packet.js'),
  sources: () => import('./views/sources.js'), setup: () => import('./views/setup.js'),
};

export const app = { data: null, replay: null, timer: null, cleanup: null };

// Everything a screen needs. In replay, state is simulated and "now" is the replay day.
export function context() {
  if (app.replay) {
    const state = buildReplay(app.replay.day);
    state.settings.focus = getState().settings.focus;
    return { state, now: replayNow(app.replay.day), d: derive(state, replayNow(app.replay.day), app.data, { spe: replaySpe(app.replay.day) }), replay: app.replay, data: app.data };
  }
  const state = getState(), now = new Date().toISOString();
  return { state, now, d: derive(state, now, app.data), replay: null, data: app.data };
}

export function startReplay(day = 1, autoplay = true) {
  app.replay = { day, playing: false };
  location.hash = '#/today';
  if (autoplay) play(); else render();
}
export function stopReplay() { pause(); app.replay = null; location.hash = '#/'; render(); }
function play() {
  if (!app.replay) return;
  if (app.replay.day >= REPLAY_DAYS) app.replay.day = 1;
  app.replay.playing = true;
  clearInterval(app.timer);
  app.timer = setInterval(() => { if (!app.replay || app.replay.day >= REPLAY_DAYS) return pause(); app.replay.day++; render(true); }, 420);
  render(true);
}
function pause() { clearInterval(app.timer); if (app.replay) app.replay.playing = false; render(true); }

export const route = () => { const [name = '', ...rest] = location.hash.replace(/^#\/?/, '').split('/'); return { name, args: rest }; };
export const go = (path) => { location.hash = '#/' + path; };

function renderChrome(ctx, r) {
  const { d } = ctx;
  const el = document.getElementById('chrome');
  const landing = r.name === '';
  const lt = d.lt;
  const kids = [
    h('header', { class: 'top' }, h('div', { class: 'wrap' },
      h('a', { class: 'brand', href: '#/' }, logo(), 'BlindSpot'),
      h('nav', { class: 'main', 'aria-label': 'Main' }, NAV.map(([p, label]) => h('a', { href: `#/${p}`, 'aria-current': r.name === p ? 'page' : null }, label))),
      h('div', { class: 'grow' }),
      !landing && d.result.overall !== 'nodata' ? chip(d.result.overall) : null)),
  ];
  if (ctx.replay) {
    const ev = [...REPLAY_EVENTS].reverse().find((e) => e.day <= ctx.replay.day);
    kids.push(h('div', { class: 'replay', role: 'region', 'aria-label': 'Mission replay controls' }, h('div', { class: 'wrap' },
      h('span', { class: 'stamp' }, 'SIMULATED'),
      h('button', { class: 'btn sm', onClick: () => (ctx.replay.playing ? pause() : play()) }, ctx.replay.playing ? 'Pause' : 'Play'),
      h('input', { type: 'range', min: 1, max: REPLAY_DAYS, value: ctx.replay.day, 'aria-label': 'Mission day', onInput: (e) => { clearInterval(app.timer); app.replay.playing = false; app.replay.day = +e.target.value; render(true); } }),
      h('span', { class: 'num small' }, `Day ${ctx.replay.day} of ${REPLAY_DAYS}`),
      h('span', { class: 'small', style: 'flex-basis:100%;order:9' }, ev ? `Day ${ev.day}: ${ev.label}` : ''),
      h('button', { class: 'btn sm ghost', onClick: stopReplay }, 'Exit replay'))));
  }
  if (!landing) {
    kids.push(h('div', { class: 'missionbar' }, h('div', { class: 'wrap' },
      mb('Environment', d.env.name), mb('Mission day', String(d.mday), ` of ${d.dose.missionDays}`),
      mb(d.nextEvent.label, `${d.nextEvent.days}`, d.nextEvent.days === 1 ? ' day' : ' days'),
      mb('Light-time to Earth', lt ? (lt.blackout ? 'No contact' : formatDelay(lt.seconds)) : 'no data', lt && lt.estimate ? ' est.' : ''),
      mb('Earliest reply', lt ? (lt.blackout ? 'After conjunction' : formatDelay(lt.seconds * 2)) : 'no data'),
      mb('Career dose', `${Math.round(d.dose.career)}`, ` of ${d.dose.limit} mSv`))));
    if (d.focus) kids.push(h('div', { class: 'focusbar', role: 'status' }, h('div', { class: 'wrap' },
      h('span', null, getState().settings.focus === 'on' ? 'Focus mode is on: one instruction at a time.' : 'Focus mode turned itself on because you measured below your normal. One instruction at a time.'),
      h('button', { class: 'btn sm', onClick: () => update((s) => { s.settings.focus = 'off'; }) }, 'Turn off'))));
  }
  el.replaceChildren(...kids);
  document.body.classList.toggle('focus', !landing && d.focus);
}
const mb = (k, v, small = '') => h('div', { class: 'mb' }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v, small ? h('small', null, small) : null));

let lastRoute = null;
export async function render(soft = false) {
  const r = route();
  if (r.name === 'replay') return startReplay(Math.min(REPLAY_DAYS, Math.max(1, +r.args[0] || 1)), !r.args[0]); // #/replay or #/replay/66
  const loader = VIEWS[r.name] || VIEWS[''];
  const ctx = context();
  renderChrome(ctx, r);
  const key = location.hash;
  const view = document.getElementById('view');
  const mod = await loader();
  if (soft && key === lastRoute && mod.keepOnSoft) return; // a running test must not be redrawn
  if (app.cleanup) { try { app.cleanup(); } catch { /* ignore */ } app.cleanup = null; }
  const node = mod.default(ctx, r.args);
  view.replaceChildren(node);
  if (!soft || key !== lastRoute) { node.classList.add('fade'); window.scrollTo(0, 0); }
  lastRoute = key;
  document.title = (mod.title ? mod.title + ' · ' : '') + 'BlindSpot';
}

async function boot() {
  try { app.data = await (await fetch('data/lighttime.json')).json(); } catch { app.data = null; }
  window.addEventListener('hashchange', () => render());
  subscribe(() => render(true));
  render();
}
boot();
