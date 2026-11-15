// Turns raw records (live or simulated) into everything the screens show.
import { METRICS, baseline, zScore, measuredScore, statusFromZ, insightGap, isUnaware, calibrationScore, usualBias } from './scoring.js';
import { ENVIRONMENTS, PROFILES, missionDay, phaseAt, lightTime, nextBlackout, doseLedger, expectedTempShift, isoDate, DAY_MS } from './mission.js';
import { evaluate } from './rules.js';

export const TEST_METRIC = { pvt: 'pvt_speed', vision: 'acuity', motor: 'motor_tp', pulse: 'pulse', balance: 'sts' };
export const TEST_NAME = { pvt: 'Alertness', vision: 'Vision', motor: 'Hands', pulse: 'Pulse', balance: 'Balance' };

const day = (t) => isoDate(t);

// Series of {t, value} for a metric from checks and vitals, oldest first.
export function series(state, metricId) {
  const out = [];
  for (const c of state.checks) if (c.values && Number.isFinite(c.values[metricId])) out.push({ t: c.t, value: c.values[metricId], felt: c.felt, quick: c.quick });
  for (const v of state.vitals) if (Number.isFinite(v[metricId])) out.push({ t: v.t, value: v[metricId] });
  return out.sort((a, b) => (a.t < b.t ? -1 : 1));
}

function scored(state, metricId, shiftFn) {
  const s = series(state, metricId);
  if (!s.length) return null;
  const base = baseline(metricId, s.map((x) => x.value));
  const points = s.map((x) => {
    const shift = shiftFn ? shiftFn(x.t) : 0;
    const z = zScore(metricId, x.value, base, shift);
    const score = measuredScore(z);
    const gap = x.felt != null && !base.forming ? insightGap(x.felt, score) : null;
    const status = statusFromZ(z);
    return { ...x, z, score, status, gap, shift, unaware: gap != null && isUnaware(status, gap) };
  });
  return { metricId, def: METRICS[metricId], base, points, last: { ...points[points.length - 1], base } };
}

export function derive(state, nowIso, data, extra = {}) {
  const profile = PROFILES[state.mission.profile] || PROFILES.mars;
  const mday = Math.max(1, missionDay(state.mission.start, nowIso));
  const phase = phaseAt(profile.phases, mday);
  const env = ENVIRONMENTS[phase.env];
  const outbound = phase.index === 0;
  const transitFraction = env.transit ? (outbound ? phase.fraction : 1 - phase.fraction) : 1;
  const lt = data ? lightTime(data, phase.env, day(nowIso), transitFraction) : null;
  const blackout = data && env.body === 'mars' ? nextBlackout(data, day(nowIso)) : null;
  const dose = doseLedger({ phases: profile.phases, day: mday, priorCareer: state.mission.priorCareer || 0, measured: state.mission.dosimeter });

  const startMs = Date.parse(state.mission.start);
  const tempShift = (t) => expectedTempShift(env.gravity, Math.max(0, (Date.parse(day(t)) - startMs) / DAY_MS));

  const m = {
    pvt: scored(state, 'pvt_speed'),
    lapses: scored(state, 'pvt_lapses'),
    vision: scored(state, 'acuity'),
    motor: scored(state, 'motor_tp'),
    pulse: scored(state, 'pulse'),
    balance: scored(state, 'sts'),
    temp: scored(state, 'temp', tempShift),
    sleep: scored(state, 'sleep'),
    mood: scored(state, 'mood'),
  };

  const lastVital = (k) => { for (let i = state.vitals.length - 1; i >= 0; i--) if (state.vitals[i][k] != null && state.vitals[i][k] !== '') return state.vitals[i]; return null; };
  const lastCheck = (type) => { for (let i = state.checks.length - 1; i >= 0; i--) if (state.checks[i].type === type) return state.checks[i]; return null; };
  const bpRec = lastVital('sys');
  const co2Vals = state.vitals.filter((v) => Number.isFinite(v.co2));
  const week = co2Vals.filter((v) => Date.parse(nowIso) - Date.parse(v.t) <= 7 * DAY_MS);
  const exVals = state.vitals.filter((v) => Number.isFinite(v.exercise) && Date.parse(nowIso) - Date.parse(v.t) <= 7 * DAY_MS).map((v) => v.exercise);
  const visionCheck = lastCheck('vision');

  const gaps = [];
  for (const k of ['pvt', 'vision', 'motor', 'balance']) if (m[k]) for (const p of m[k].points) if (p.gap != null) gaps.push({ t: p.t, gap: p.gap, test: k, status: p.status, unaware: p.unaware, felt: p.felt, score: p.score });
  gaps.sort((a, b) => (a.t < b.t ? -1 : 1));

  const daysSinceGravityChange = phase.dayInPhase;
  const ctx = {
    pvt: m.pvt && { ...m.pvt.last, lapses: m.lapses ? m.lapses.last.value : null, lapsesZ: m.lapses && !m.lapses.base.provisional ? m.lapses.last.z : null },
    vision: m.vision && { ...m.vision.last, prevZ: m.vision.points.length > 1 ? m.vision.points[m.vision.points.length - 2].z : null, amsler: visionCheck && visionCheck.detail ? visionCheck.detail.amsler ?? null : null },
    motor: m.motor && m.motor.last,
    pulse: m.pulse && m.pulse.last,
    balance: m.balance && m.balance.last,
    temp: m.temp && m.temp.last,
    sleep: m.sleep ? m.sleep.points.map((p) => p.value) : null,
    mood: m.mood ? m.mood.points.map((p) => p.value) : null,
    bp: bpRec ? { sys: bpRec.sys, dia: bpRec.dia } : null,
    spo2: lastVital('spo2')?.spo2 ?? null,
    glucose: lastVital('glucose')?.glucose ?? null,
    exercise: exVals.length ? Math.min(1, exVals.reduce((a, b) => a + b, 0) / (exVals.length * 100)) : null,
    co2: co2Vals.length ? { h1: co2Vals[co2Vals.length - 1].co2, d7: week.length ? week.reduce((a, v) => a + v.co2, 0) / week.length : co2Vals[co2Vals.length - 1].co2 } : null,
    dose,
    spe: extra.spe || null,
    daysSinceGravityChange,
  };
  const result = evaluate(ctx);
  const impaired = !!(ctx.pvt && ctx.pvt.status !== 'go');

  return {
    now: nowIso, mday, profile, phase, env, envId: phase.env, lt, blackout, dose, metrics: m, gaps,
    calibration: calibrationScore(gaps.map((g) => g.gap)), bias: usualBias(gaps.map((g) => g.gap)),
    ctx, result, impaired,
    focus: state.settings.focus === 'on' || (state.settings.focus === 'auto' && impaired),
    daysLeftInPhase: phase.daysLeft,
    nextEvent: nextEvent(profile, phase),
  };
}

function nextEvent(profile, phase) {
  const next = profile.phases[phase.index + 1];
  if (!next) return { label: 'Return to Earth', days: phase.daysLeft };
  const to = ENVIRONMENTS[next.env];
  const label = to.gravity === 'partial' ? `Landing: ${to.name}` : `Departure: ${to.name}`;
  return { label, days: phase.daysLeft };
}
