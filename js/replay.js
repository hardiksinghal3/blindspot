// Mission replay: a SIMULATED crew member on a 180-day Mars transit. Deterministic.
// The story follows published effects: sleep restriction slows reactions while self-rating barely moves.
import { DAY_MS, isoDate } from './mission.js';
import { emptyState } from './store.js';

export const REPLAY_DAYS = 180;
export const REPLAY_START = '2028-11-20';
export const REPLAY_EVENTS = [
  { day: 1, label: 'Departure. Baselines begin.' },
  { day: 58, label: 'Heavy workload begins. Sleep drops to about 5 hours.' },
  { day: 63, label: 'First impaired and unaware finding. Self-rating has barely moved.' },
  { day: 73, label: 'Normal sleep resumes.' },
  { day: 97, label: 'Solar particle event. Shelter.' },
  { day: 121, label: 'Scrubber fault. Carbon dioxide above 3 mmHg.' },
  { day: 150, label: 'Near vision one line worse than baseline.' },
  { day: 180, label: 'Mars landing day.' },
];
export const SPE_DAYS = [97, 98];

function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function buildReplay(upToDay = REPLAY_DAYS) {
  const r = rng(20261115);
  const n = () => (r() + r() + r() - 1.5) / 1.5; // roughly -1..1, bell shaped
  const s = emptyState();
  s.profile.name = 'Crew member (simulated)';
  s.mission = { profile: 'mars', start: REPLAY_START, priorCareer: 85, dosimeter: null };
  s.settings.onboarded = true;
  const t0 = Date.parse(REPLAY_START);
  let debt = 0;
  for (let d = 1; d <= REPLAY_DAYS; d++) {
    const short = d >= 58 && d <= 72;
    const sleep = short ? 5 + 0.4 * n() : 7.4 + 0.5 * n();
    debt = Math.max(0, debt + (short ? 1 : -1.6));
    const speed = 3.45 + 0.1 * n() - 0.03 * debt;
    const lapses = Math.max(0, Math.round(1.5 + 0.9 * n() + 0.4 * debt));
    const vis = d < 110 ? 0 : d < 150 ? (r() < (d - 110) / 60 ? 0.1 : 0) : 0.1;
    const motor = 4.1 + 0.25 * n() - (d <= 6 ? 0.9 - 0.14 * d : 0);
    const temp = 36.8 + Math.min(1, d / 75) * 0.95 + 0.12 * n();
    const co2 = d >= 121 && d <= 122 ? 3.4 + 0.2 * n() : 2.0 + 0.25 * n();
    const mood = Math.max(1, Math.min(5, Math.round(4 - (short ? 0.8 : 0) + 0.7 * n())));
    const v = { speed, lapses, sleep, vis, motor, temp, co2, mood, debt, feltNoise: n(), n2: n(), n3: n(), ex: r() };
    if (d > upToDay) continue;
    const t = (hh) => new Date(t0 + (d - 1) * DAY_MS + hh * 3600000).toISOString();
    // Felt tracks reality only loosely once sleep debt builds (subjective rating plateaus).
    const feltAlert = Math.round(Math.max(5, Math.min(95, 52 + 6 * v.feltNoise - 2.2 * Math.min(debt, 4))));
    s.checks.push({ id: `p${d}`, t: t(8), type: 'pvt', felt: feltAlert, values: { pvt_speed: +speed.toFixed(3), pvt_lapses: lapses } });
    if (d % 3 === 1) s.checks.push({ id: `m${d}`, t: t(8.2), type: 'motor', felt: Math.round(50 + 8 * v.n2 - (d <= 6 ? 4 : 0)), values: { motor_tp: +motor.toFixed(2) } });
    if (d % 7 === 1 || d === 150) s.checks.push({ id: `v${d}`, t: t(8.4), type: 'vision', felt: Math.round(50 + 6 * v.n3), values: { acuity: vis }, detail: { amsler: 0 } });
    s.vitals.push({ t: t(7.5), sleep: +sleep.toFixed(1), mood, temp: +temp.toFixed(1), co2: +co2.toFixed(1), exercise: short ? 55 + Math.round(20 * v.ex) : 85 + Math.round(15 * v.ex),
      sys: 116 + Math.round(6 * v.n2), dia: 74 + Math.round(4 * v.n3), pulse: 58 + Math.round(4 * v.n2), spo2: 97 + Math.round(v.ex), glucose: 92 + Math.round(8 * v.n3) });
  }
  return s;
}

export const replayNow = (day) => new Date(Date.parse(REPLAY_START) + (day - 1) * DAY_MS + 9 * 3600000).toISOString();
export const replaySpe = (day) => (SPE_DAYS.includes(day) ? { label: 'simulated for this replay' } : null);
export const replayDate = (day) => isoDate(Date.parse(REPLAY_START) + (day - 1) * DAY_MS);
