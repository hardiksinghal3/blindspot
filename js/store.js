// Local-only storage. Nothing leaves the browser.
const KEY = 'blindspot.v1';

export const emptyState = () => ({
  v: 1,
  profile: { name: '' },
  mission: { profile: 'mars', start: new Date().toISOString().slice(0, 10), priorCareer: 0, dosimeter: null },
  checks: [], // {id, t, type, felt, values, detail, quick}
  vitals: [], // {t, sys, dia, glucose, temp, spo2, sleep, mood, exercise, co2, symptoms}
  settings: { focus: 'auto', calibration: null, onboarded: false },
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 1) return { ...emptyState(), ...s, settings: { ...emptyState().settings, ...s.settings }, mission: { ...emptyState().mission, ...s.mission } };
    }
  } catch { /* corrupt or unavailable storage: start clean */ }
  return emptyState();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ }
  listeners.forEach((fn) => fn(state));
}

export const getState = () => state;
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export function update(fn) { fn(state); save(); }

export function addCheck(check) {
  update((s) => s.checks.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, t: new Date().toISOString(), ...check }));
}

export function addVitals(v) {
  update((s) => s.vitals.push({ t: new Date().toISOString(), ...v }));
}

export function resetAll() { state = emptyState(); save(); }

export function exportJson() { return JSON.stringify(state, null, 2); }

export function importJson(text) {
  const s = JSON.parse(text);
  if (!s || s.v !== 1 || !Array.isArray(s.checks)) throw new Error('Not a BlindSpot export');
  state = { ...emptyState(), ...s };
  save();
}
