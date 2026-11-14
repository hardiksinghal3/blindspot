// Scoring: personal baselines, measured score, Insight Gap. Pure functions, no DOM.

export const POINTS_PER_SPREAD = 20; // 1 spread = 20 points on the 0-100 scale
export const UNAWARE_GAP = 20;
export const MIN_BASELINE = 3;
export const BASELINE_SESSIONS = 5;

// dir: 1 higher is better, -1 lower is better, 0 both directions matter.
// ref: provisional reference used until a personal baseline exists (prototype placeholders).
// selfRef: the result depends on the screen or pointing device, so a generic reference would mislead.
// Until a baseline exists these are compared with the person's own readings so far and no gap is scored.
export const METRICS = {
  pvt_speed: { label: 'Response speed', unit: '1/s', dir: 1, ref: [3.3, 0.45], floor: 0.15, digits: 2 },
  pvt_lapses: { label: 'Lapses', unit: '', dir: -1, ref: [2, 2], floor: 1.5, digits: 0 },
  acuity: { label: 'Near acuity', unit: 'logMAR', dir: -1, ref: [0.0, 0.1], floor: 0.1, digits: 2, selfRef: true },
  motor_tp: { label: 'Pointing throughput', unit: 'bits/s', dir: 1, ref: [4.0, 0.6], floor: 0.3, digits: 2, selfRef: true },
  pulse: { label: 'Resting pulse', unit: 'bpm', dir: 0, ref: [65, 8], floor: 5, digits: 0 },
  temp: { label: 'Body temperature', unit: '°C', dir: 0, ref: [36.8, 0.3], floor: 0.25, digits: 1 },
  sleep: { label: 'Sleep', unit: 'h', dir: 1, ref: [7.5, 0.8], floor: 0.6, digits: 1 },
  mood: { label: 'Mood', unit: '/5', dir: 1, ref: [4, 0.8], floor: 0.7, digits: 0 },
};

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);

export function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Robust spread: median absolute deviation scaled to match a standard deviation.
export function spread(a) {
  const m = median(a);
  return 1.4826 * median(a.map((x) => Math.abs(x - m)));
}

// Baseline from the first sessions of a metric. Falls back to the reference until 3 exist.
export function baseline(metricId, values) {
  const def = METRICS[metricId];
  const first = values.filter((v) => Number.isFinite(v)).slice(0, BASELINE_SESSIONS);
  if (first.length < MIN_BASELINE) {
    if (def.selfRef && first.length) return { center: median(first), spread: def.ref[1], n: first.length, provisional: true, forming: true };
    return { center: def.ref[0], spread: def.ref[1], n: first.length, provisional: true };
  }
  return { center: median(first), spread: Math.max(spread(first), def.floor), n: first.length, provisional: false };
}

// Signed distance from normal in spreads. Negative is always "worse".
// shift moves the expected centre (e.g. expected spaceflight adaptation).
export function zScore(metricId, value, base, shift = 0) {
  const def = METRICS[metricId];
  const d = (value - (base.center + shift)) / base.spread;
  if (def.dir === 0) return -Math.abs(d);
  return def.dir * d;
}

export const measuredScore = (z) => Math.round(clamp(50 + POINTS_PER_SPREAD * z, 0, 100));

export function statusFromZ(z) {
  if (z <= -2) return 'nogo';
  if (z <= -1) return 'watch';
  return 'go';
}

export const worst = (...s) => (s.includes('nogo') ? 'nogo' : s.includes('watch') ? 'watch' : 'go');

export function insightGap(felt, measured) {
  return Math.round(felt - measured);
}

// Impaired and unaware: measured is degraded and the person called it at least 20 points too high.
export function isUnaware(status, gap) {
  return status !== 'go' && gap >= UNAWARE_GAP;
}

export function gapLabel(gap) {
  const a = Math.abs(gap);
  if (a < 10) return 'Calibrated';
  if (gap > 0) return a >= UNAWARE_GAP ? 'Felt much better than measured' : 'Felt better than measured';
  return a >= UNAWARE_GAP ? 'Felt much worse than measured' : 'Felt worse than measured';
}

// Game score: how well you know yourself over the last 7 checks.
export function calibrationScore(gaps) {
  const last = gaps.slice(-7);
  if (!last.length) return null;
  return Math.round(clamp(100 - mean(last.map(Math.abs)), 0, 100));
}

export function usualBias(gaps) {
  return gaps.length >= 5 ? Math.round(median(gaps.slice(-10))) : null;
}

// Reaction test metrics from raw trials: [{rt: ms | null, falseStart: bool}].
// Definitions from Basner, Mollicone and Dinges 2011 (PVT-B).
export const LAPSE_MS = 355;
export const FALSE_START_MS = 100;
export function pvtMetrics(trials) {
  const falseStarts = trials.filter((t) => t.falseStart || (t.rt != null && t.rt < FALSE_START_MS)).length;
  const valid = trials.filter((t) => !t.falseStart && t.rt != null && t.rt >= FALSE_START_MS).map((t) => t.rt);
  if (!valid.length) return { n: 0, falseStarts, lapses: 0, speed: NaN, medianRt: NaN, meanRt: NaN, slowest10Speed: NaN, fastest10Rt: NaN };
  const sorted = [...valid].sort((a, b) => a - b);
  const k = Math.max(1, Math.round(valid.length * 0.1));
  return {
    n: valid.length,
    falseStarts,
    lapses: valid.filter((r) => r >= LAPSE_MS).length,
    speed: mean(valid.map((r) => 1000 / r)),
    medianRt: median(valid),
    meanRt: mean(valid),
    slowest10Speed: mean(sorted.slice(-k).map((r) => 1000 / r)),
    fastest10Rt: mean(sorted.slice(0, k)),
  };
}

// Pointing throughput (Fitts): effective index of difficulty over movement time.
// taps: [{dist: px from start to target centre, width: px, time: ms, hit: bool}]
export function pointingMetrics(taps) {
  const ok = taps.filter((t) => t.time > 0);
  if (!ok.length) return { throughput: NaN, errorRate: NaN, meanTime: NaN, n: 0 };
  const tp = ok.map((t) => Math.log2(t.dist / t.width + 1) / (t.time / 1000));
  return {
    throughput: mean(tp),
    errorRate: ok.filter((t) => !t.hit).length / ok.length,
    meanTime: mean(ok.map((t) => t.time)),
    n: ok.length,
  };
}

// Near acuity: optotype height in mm for a logMAR line at a viewing distance in mm.
// A logMAR 0.0 letter subtends 5 arcminutes.
export function optotypeMm(logmar, distanceMm) {
  const arcmin = 5 * Math.pow(10, logmar);
  return 2 * distanceMm * Math.tan((arcmin / 60) * (Math.PI / 180) / 2);
}

// Pulse from a brightness signal: detrend, band-limit to 0.7-3 Hz, pick the dominant frequency.
// Returns bpm and a quality figure (share of band power inside the peak). Refuse below 0.3.
export function pulseFromSignal(samples, fs) {
  const n = samples.length;
  if (n < fs * 8) return { bpm: NaN, quality: 0 };
  const win = Math.max(3, Math.round(fs));
  const x = samples.map((v, i) => {
    const a = Math.max(0, i - win), b = Math.min(n, i + win + 1);
    let s = 0;
    for (let j = a; j < b; j++) s += samples[j];
    return v - s / (b - a);
  });
  for (let i = 0; i < n; i++) x[i] *= 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  let best = { f: 0, p: 0 }, total = 0;
  const powers = [];
  for (let bpm = 42; bpm <= 180; bpm += 1) {
    const f = bpm / 60;
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) {
      const ph = (2 * Math.PI * f * i) / fs;
      re += x[i] * Math.cos(ph);
      im -= x[i] * Math.sin(ph);
    }
    const p = re * re + im * im;
    powers.push([bpm, p]);
    total += p;
    if (p > best.p) best = { f: bpm, p };
  }
  const near = powers.filter(([b]) => Math.abs(b - best.f) <= 4).reduce((s, [, p]) => s + p, 0);
  return { bpm: best.f, quality: total > 0 ? near / total : 0 };
}

// Pulse from tap timestamps (ms): median interval, quality from interval regularity.
export function pulseFromTaps(times) {
  if (times.length < 6) return { bpm: NaN, quality: 0 };
  const iv = times.slice(1).map((t, i) => t - times[i]);
  const m = median(iv);
  const sp = spread(iv);
  return { bpm: Math.round(60000 / m), quality: clamp(1 - sp / m / 0.25, 0, 1) };
}
