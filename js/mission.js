// Mission context: environments, light-time to Earth, radiation ledger. Pure functions.

export const CAREER_LIMIT_MSV = 600; // NASA-STD-3001 Vol. 1 Rev. B
export const BLACKOUT_DEG = 2; // Mars within 2 degrees of the Sun as seen from Earth
export const DAY_MS = 86400000;

// Dose-equivalent rates (mSv per day) from Table 2 of "Space radiation measurements during the
// Artemis I lunar mission" (Nature, 2024). Values are for December 2022 solar conditions.
export const ENVIRONMENTS = {
  iss: { name: 'Low Earth orbit', short: 'LEO', body: null, gravity: 'micro', g: 0, dose: 0.68, doseNote: 'International Space Station' },
  lunar_orbit: { name: 'Lunar orbit', short: 'Lunar orbit', body: 'moon', gravity: 'micro', g: 0, dose: 1.55, doseNote: 'Low lunar orbit' },
  lunar_surface: { name: 'Lunar surface', short: 'Moon', body: 'moon', gravity: 'partial', g: 0.17, dose: 0.81, doseNote: 'Lunar surface' },
  mars_transit: { name: 'Mars transit', short: 'Transit', body: 'mars', gravity: 'micro', g: 0, dose: 1.58, doseNote: 'Mars transit', transit: true },
  mars_surface: { name: 'Mars surface', short: 'Mars', body: 'mars', gravity: 'partial', g: 0.38, dose: 0.65, doseNote: 'Mars surface' },
};

export const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((Date.parse(isoDate(b)) - Date.parse(isoDate(a))) / DAY_MS);
export const missionDay = (startIso, nowIso) => daysBetween(startIso, nowIso) + 1;

function sample(series, start, dateIso) {
  const i = daysBetween(start, dateIso);
  if (i < 0 || i >= series.length) return null;
  return series[i];
}

// One-way light-time in seconds between Earth and the crew.
// transitFraction (0-1) scales the range for a ship on its way: an estimate, not ephemeris.
export function lightTime(data, envId, dateIso, transitFraction = 1) {
  const env = ENVIRONMENTS[envId];
  if (!env.body) return { seconds: 0.003, estimate: false, blackout: false, sunAngle: null, source: 'About 400 km altitude' };
  const b = data.bodies[env.body];
  const au = sample(b.range_au, b.start, dateIso);
  if (au == null) return null;
  const sunAngle = sample(b.sun_angle_deg, b.start, dateIso);
  const frac = env.transit ? clamp01(transitFraction) : 1;
  return {
    seconds: (au * frac * data.au_km) / data.c_km_s,
    estimate: !!env.transit,
    blackout: env.body === 'mars' && !env.transit && sunAngle < BLACKOUT_DEG,
    sunAngle,
    source: 'JPL Horizons',
  };
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Next solar-conjunction blackout window on or after a date: {start, end, days} or null.
export function nextBlackout(data, dateIso) {
  const b = data.bodies.mars;
  let i = Math.max(0, daysBetween(b.start, dateIso));
  const a = b.sun_angle_deg;
  while (i < a.length && a[i] >= BLACKOUT_DEG) i++;
  if (i >= a.length) return null;
  let s = i;
  while (s > 0 && a[s - 1] < BLACKOUT_DEG) s--;
  let e = i;
  while (e + 1 < a.length && a[e + 1] < BLACKOUT_DEG) e++;
  const t0 = Date.parse(b.start);
  return { start: isoDate(t0 + s * DAY_MS), end: isoDate(t0 + e * DAY_MS), days: e - s + 1 };
}

export function formatDelay(seconds) {
  if (seconds < 1) return '< 1 s';
  if (seconds < 90) return `${seconds.toFixed(1)} s`;
  const m = Math.floor(seconds / 60), s = Math.round(seconds % 60);
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

// Radiation ledger. phases: [{env, days}] in order; day: current mission day (1-based).
// measured: optional dosimeter total for this mission in mSv (overrides the estimate so far).
export function doseLedger({ phases, day, priorCareer = 0, measured = null }) {
  let soFar = 0, total = 0, d = 0;
  for (const p of phases) {
    const rate = ENVIRONMENTS[p.env].dose;
    const done = clampN(day - d, 0, p.days);
    soFar += done * rate;
    total += p.days * rate;
    d += p.days;
  }
  const mission = measured != null ? measured : soFar;
  const remaining = total - soFar;
  const projected = priorCareer + mission + remaining;
  return {
    mission, estimated: measured == null, career: priorCareer + mission, projected,
    limit: CAREER_LIMIT_MSV, shareNow: (priorCareer + mission) / CAREER_LIMIT_MSV,
    shareProjected: projected / CAREER_LIMIT_MSV, missionDays: d,
  };
}
const clampN = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Which phase is a mission day in.
export function phaseAt(phases, day) {
  let d = 0;
  for (let i = 0; i < phases.length; i++) {
    if (day <= d + phases[i].days) return { index: i, env: phases[i].env, dayInPhase: day - d, daysLeft: d + phases[i].days - day, fraction: (day - d) / phases[i].days };
    d += phases[i].days;
  }
  const last = phases[phases.length - 1];
  return { index: phases.length - 1, env: last.env, dayInPhase: last.days, daysLeft: 0, fraction: 1 };
}

export const PROFILES = {
  iss: { name: 'Six months in low Earth orbit', phases: [{ env: 'iss', days: 180 }] },
  moon: { name: 'Lunar surface stay', phases: [{ env: 'lunar_orbit', days: 5 }, { env: 'lunar_surface', days: 30 }, { env: 'lunar_orbit', days: 5 }] },
  mars: { name: 'Mars, long stay', phases: [{ env: 'mars_transit', days: 180 }, { env: 'mars_surface', days: 500 }, { env: 'mars_transit', days: 180 }] },
};

// Expected resting core temperature rise in flight: about 1 degC, developing over 2.5 months (Stahn 2017).
export function expectedTempShift(envGravity, dayInFlight) {
  if (envGravity === 'earth') return 0;
  return Math.min(1, Math.max(0, dayInFlight / 75));
}
