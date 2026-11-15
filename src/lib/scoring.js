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
  // Seconds for five sit-to-stands. Judged only against the person's own baseline.
  sts: { label: 'Five sit-to-stands', unit: 's', dir: -1, ref: [10, 1.5], floor: 1, digits: 1, selfRef: true },
  // Until a baseline exists, 2 spreads either side of the reference is the general adult range of 50 to 100.
  pulse: { label: 'Resting pulse', unit: 'bpm', dir: 0, ref: [75, 12.6], floor: 5, digits: 0 },
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

// The band each verdict covers for this person, in the metric's own units. Mirrors the flight rules.
export function safeRange(metricId, base) {
  const def = METRICS[metricId], f = (v) => v.toFixed(def.digits), u = def.unit ? ` ${def.unit}` : '';
  const at = (k) => base.center + k * base.spread;
  if (metricId === 'pulse') return `GO from ${f(Math.max(50, at(-2)))} to ${f(Math.min(100, at(2)))}${u}. Outside that: WATCH.`;
  if (metricId === 'acuity') return `GO up to ${f(at(1))}${u} (lower is sharper). WATCH above that. NO-GO at ${f(at(2))} or worse on two checks in a row.`;
  if (def.dir === -1) return `GO below ${f(at(1))}${u}. WATCH from ${f(at(1))} to ${f(at(2))}. NO-GO at ${f(at(2))} or above.`;
  if (def.dir === 1) return `GO above ${f(at(-1))}${u}. WATCH from ${f(at(-2))} to ${f(at(-1))}. NO-GO at ${f(at(-2))} or below.`;
  return null;
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
  const near = powers.filter(([b]) => Math.abs(b - best.f) <= 5).reduce((s, [, p]) => s + p, 0);
  return { bpm: best.f, quality: total > 0 ? near / total : 0 };
}

// Camera pulse from mean skin colour per frame.
// frames: [r, g, b] means; times: ms. Frames arrive unevenly, so they are binned onto a steady clock.
// The colour signal is combined with the POS method (Wang and others, 2017), which cancels
// brightness changes that hit all three channels alike, such as small movements.
export const CAMERA_FS = 30;
export function pulseSignalFromRgb(frames, times, fs = CAMERA_FS) {
  if (frames.length < 2) return [];
  const n = Math.floor(((times[times.length - 1] - times[0]) / 1000) * fs);
  const rgb = [[], [], []];
  let j = 0, last = frames[0];
  for (let i = 0; i < n; i++) {
    const end = times[0] + ((i + 1) * 1000) / fs;
    let c = 0; const sum = [0, 0, 0];
    while (j < frames.length && times[j] < end) { for (let k = 0; k < 3; k++) sum[k] += frames[j][k]; c++; j++; }
    if (c) last = sum.map((v) => v / c);
    for (let k = 0; k < 3; k++) rgb[k].push(last[k]);
  }
  const len = Math.round(fs * 1.6), out = new Array(n).fill(0);
  for (let start = 0; start + len <= n; start++) {
    const mean = rgb.map((ch) => { let m = 0; for (let i = start; i < start + len; i++) m += ch[i]; return m / len || 1; });
    const s1 = [], s2 = [];
    for (let i = start; i < start + len; i++) {
      const r = rgb[0][i] / mean[0], g = rgb[1][i] / mean[1], b = rgb[2][i] / mean[2];
      s1.push(g - b); s2.push(g + b - 2 * r);
    }
    const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
    const alpha = sd(s2) > 0 ? sd(s1) / sd(s2) : 0;
    const h = s1.map((v, i) => v + alpha * s2[i]);
    const hm = h.reduce((x, y) => x + y, 0) / len;
    for (let i = 0; i < len; i++) out[start + i] += h[i] - hm;
  }
  return out;
}

// Accept a camera reading only when the spectrum has one clear peak, or a fair peak that
// both halves of the recording agree on. Anything else is refused rather than guessed.
export const CAMERA_CLEAR = 0.3, CAMERA_FAIR = 0.2, CAMERA_AGREE_BPM = 5;
export function pulseFromRgb(frames, times, fs = CAMERA_FS) {
  const x = pulseSignalFromRgb(frames, times, fs);
  const whole = pulseFromSignal(x, fs);
  if (!Number.isFinite(whole.bpm)) return { bpm: NaN, quality: 0, ok: false };
  const half = Math.floor(x.length / 2);
  const a = pulseFromSignal(x.slice(0, half), fs), b = pulseFromSignal(x.slice(half), fs);
  const agree = Math.abs(a.bpm - whole.bpm) <= CAMERA_AGREE_BPM && Math.abs(b.bpm - whole.bpm) <= CAMERA_AGREE_BPM;
  const ok = whole.quality >= CAMERA_CLEAR || (agree && whole.quality >= CAMERA_FAIR);
  return { bpm: whole.bpm, quality: whole.quality, agree, ok };
}

// Skin is found by colour only: redder than it is green or blue, and neither black nor blown out.
export const isSkin = (r, g, b) => r > 50 && r < 250 && r > g && r > b;
export const SKIN_CELL = 16;

// The largest connected patch of skin-coloured cells in an RGBA picture, so the reading follows the palm or face
// and ignores the wall behind it. Returns the cells, their share of the picture and the box around them (0 to 1).
export function skinRegion(px, w, h, cell = SKIN_CELL) {
  const cols = Math.floor(w / cell), rows = Math.floor(h / cell), on = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let n = 0;
    for (let y = cy * cell; y < (cy + 1) * cell; y++) for (let x = cx * cell; x < (cx + 1) * cell; x++) {
      const i = (y * w + x) * 4;
      if (isSkin(px[i], px[i + 1], px[i + 2])) n++;
    }
    if (n >= 0.7 * cell * cell) on[cy * cols + cx] = 1;
  }
  let best = [];
  const seen = new Uint8Array(cols * rows);
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || seen[start]) continue;
    const patch = [start]; seen[start] = 1;
    for (let k = 0; k < patch.length; k++) {
      const c = patch[k], cx = c % cols;
      for (const n of [cx > 0 ? c - 1 : -1, cx < cols - 1 ? c + 1 : -1, c - cols, c + cols]) {
        if (n >= 0 && n < on.length && on[n] && !seen[n]) { seen[n] = 1; patch.push(n); }
      }
    }
    if (patch.length > best.length) best = patch;
  }
  if (!best.length) return null;
  let x0 = cols, x1 = 0, y0 = rows, y1 = 0, sx = 0, sy = 0;
  for (const c of best) { const cx = c % cols, cy = Math.floor(c / cols); x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy); sx += cx + 0.5; sy += cy + 0.5; }
  return { cells: best, cols, share: best.length / (cols * rows), x: sx / best.length / cols, y: sy / best.length / rows, box: [x0 / cols, y0 / rows, (x1 + 1) / cols, (y1 + 1) / rows] };
}

// Mean colour of the skin pixels inside the given cells, and how much of that area is still skin.
export function regionRgb(px, w, cells, cols, cell = SKIN_CELL) {
  const skin = [0, 0, 0], all = [0, 0, 0];
  let n = 0, total = 0;
  for (const c of cells) {
    const cx = c % cols, cy = Math.floor(c / cols);
    for (let y = cy * cell; y < (cy + 1) * cell; y++) for (let x = cx * cell; x < (cx + 1) * cell; x++) {
      const i = (y * w + x) * 4, r = px[i], g = px[i + 1], b = px[i + 2];
      all[0] += r; all[1] += g; all[2] += b; total++;
      if (isSkin(r, g, b)) { skin[0] += r; skin[1] += g; skin[2] += b; n++; }
    }
  }
  const share = total ? n / total : 0;
  return { rgb: share >= 0.2 ? skin.map((v) => v / n) : all.map((v) => v / (total || 1)), share, light: total ? all[1] / total : 0 };
}

// Pulse from tap timestamps (ms): median interval, quality from interval regularity.
export function pulseFromTaps(times) {
  if (times.length < 6) return { bpm: NaN, quality: 0 };
  const iv = times.slice(1).map((t, i) => t - times[i]);
  const m = median(iv);
  const sp = spread(iv);
  return { bpm: Math.round(60000 / m), quality: clamp(1 - sp / m / 0.25, 0, 1) };
}
