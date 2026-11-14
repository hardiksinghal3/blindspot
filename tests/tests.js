import * as S from '../js/scoring.js';
import * as M from '../js/mission.js';
import { evaluate, RULES, SYSTEMS } from '../js/rules.js';
import { SOURCES } from '../js/sources.js';
import { derive } from '../js/model.js';
import { emptyState } from '../js/store.js';

const results = [];
const test = (name, fn) => { try { fn(); results.push({ name, ok: true }); } catch (e) { results.push({ name, ok: false, err: String(e.message || e) }); } };
const eq = (a, b, msg = '') => { if (a !== b) throw new Error(`${msg} expected ${b}, got ${a}`); };
const near = (a, b, tol, msg = '') => { if (!(Math.abs(a - b) <= tol)) throw new Error(`${msg} expected ${b} +/- ${tol}, got ${a}`); };
const ok = (c, msg = 'assertion failed') => { if (!c) throw new Error(msg); };

test('median and spread', () => {
  eq(S.median([3, 1, 2]), 2); eq(S.median([4, 1, 2, 3]), 2.5);
  near(S.spread([1, 2, 3, 4, 5]), 1.4826, 1e-9);
});
test('baseline is provisional under 3 sessions', () => {
  const b = S.baseline('pvt_speed', [3.1, 3.2]);
  ok(b.provisional); eq(b.center, 3.3);
});
test('baseline uses the first 5 sessions and a spread floor', () => {
  const b = S.baseline('pvt_speed', [3.0, 3.0, 3.0, 3.0, 3.0, 9, 9, 9]);
  ok(!b.provisional); eq(b.center, 3.0); eq(b.spread, 0.15); eq(b.n, 5);
});
test('screen and pointer dependent metrics are self-referenced until a baseline exists', () => {
  const b = S.baseline('acuity', [0.3]);
  ok(b.forming && b.provisional); eq(b.center, 0.3); eq(S.statusFromZ(S.zScore('acuity', 0.3, b)), 'go');
  ok(!S.baseline('acuity', [0.3, 0.3, 0.3]).forming);
  ok(!S.baseline('pvt_speed', [3]).forming);
});
test('z score direction', () => {
  const b = { center: 3, spread: 0.5 };
  eq(S.zScore('pvt_speed', 2.5, b), -1);
  eq(S.zScore('pvt_lapses', 3.5, b), -1);
  eq(S.zScore('pulse', 3.5, b), -1); eq(S.zScore('pulse', 2.5, b), -1);
  eq(S.zScore('temp', 37.8, { center: 36.8, spread: 0.25 }, 1), -0);
});
test('measured score and status thresholds', () => {
  eq(S.measuredScore(0), 50); eq(S.measuredScore(-1), 30); eq(S.measuredScore(-2), 10); eq(S.measuredScore(-9), 0); eq(S.measuredScore(9), 100);
  eq(S.statusFromZ(-0.99), 'go'); eq(S.statusFromZ(-1), 'watch'); eq(S.statusFromZ(-2), 'nogo');
});
test('insight gap and unaware flag', () => {
  eq(S.insightGap(90, 60), 30);
  ok(S.isUnaware('watch', 20)); ok(!S.isUnaware('go', 40)); ok(!S.isUnaware('nogo', 19));
  eq(S.gapLabel(4), 'Calibrated');
});
test('calibration score uses the last 7 gaps', () => {
  eq(S.calibrationScore([]), null);
  eq(S.calibrationScore([100, 10, -10, 10, -10, 10, -10, 10]), 90);
});
test('reaction metrics follow PVT-B definitions', () => {
  const m = S.pvtMetrics([{ rt: 250 }, { rt: 354 }, { rt: 355 }, { rt: 500 }, { rt: 90 }, { rt: null, falseStart: true }]);
  eq(m.n, 4); eq(m.lapses, 2); eq(m.falseStarts, 2);
  near(m.speed, (4 + 1000 / 354 + 1000 / 355 + 2) / 4, 1e-9);
  eq(m.medianRt, 354.5);
});
test('pointing throughput', () => {
  const m = S.pointingMetrics([{ dist: 300, width: 100, time: 1000, hit: true }, { dist: 300, width: 100, time: 500, hit: false }]);
  near(m.throughput, 3, 1e-9); eq(m.errorRate, 0.5);
});
test('optotype size: logMAR 0 at 400 mm is 0.58 mm', () => {
  near(S.optotypeMm(0, 400), 0.5818, 0.001);
  near(S.optotypeMm(1, 400), 5.818, 0.01);
});
test('pulse from a synthetic 72 bpm signal with drift and noise', () => {
  const fs = 30, x = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  for (let i = 0; i < fs * 30; i++) x.push(120 + 0.02 * i + 0.6 * Math.sin(2 * Math.PI * 1.2 * i / fs) + 0.3 * rnd());
  const r = S.pulseFromSignal(x, fs);
  near(r.bpm, 72, 2); ok(r.quality > 0.5, 'quality ' + r.quality);
});
test('pulse refuses pure noise', () => {
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const x = Array.from({ length: 900 }, () => 100 + rnd());
  ok(S.pulseFromSignal(x, 30).quality < 0.3);
});
test('pulse from taps', () => {
  const t = Array.from({ length: 12 }, (_, i) => i * 1000);
  const r = S.pulseFromTaps(t); eq(r.bpm, 60); eq(r.quality, 1);
});

const data = await (await fetch('../data/lighttime.json')).json();
test('light-time: Mars surface matches range / c', () => {
  const lt = M.lightTime(data, 'mars_surface', '2026-11-14');
  near(lt.seconds, 1.32436201800863 * 149597870.7 / 299792.458, 0.01);
  ok(!lt.estimate);
});
test('light-time: Mars range stays within 3 to 23 minutes; Moon about 1.3 s', () => {
  const b = data.bodies.mars.range_au.map((au) => au * data.au_km / data.c_km_s / 60);
  ok(Math.min(...b) > 3 && Math.max(...b) < 23);
  near(M.lightTime(data, 'lunar_surface', '2027-01-01').seconds, 1.28, 0.1);
});
test('light-time: transit is a scaled estimate', () => {
  const full = M.lightTime(data, 'mars_surface', '2027-03-01').seconds;
  const half = M.lightTime(data, 'mars_transit', '2027-03-01', 0.5);
  near(half.seconds, full / 2, 1e-6); ok(half.estimate);
});
test('blackout windows are found and are days to weeks long', () => {
  const w = M.nextBlackout(data, '2026-11-14');
  ok(w && w.days >= 5 && w.days <= 30, JSON.stringify(w));
  ok(M.lightTime(data, 'mars_surface', w.start).blackout);
});
test('dose ledger', () => {
  const d = M.doseLedger({ phases: M.PROFILES.mars.phases, day: 90, priorCareer: 50 });
  near(d.mission, 90 * 1.58, 1e-9); near(d.career, 50 + 142.2, 1e-9);
  near(d.projected, 50 + 360 * 1.58 + 500 * 0.65, 1e-9);
  ok(d.projected > 600);
  eq(M.doseLedger({ phases: M.PROFILES.iss.phases, day: 10, measured: 9 }).mission, 9);
});
test('phaseAt and mission day', () => {
  eq(M.missionDay('2026-11-14', '2026-11-14'), 1);
  const p = M.phaseAt(M.PROFILES.mars.phases, 181); eq(p.env, 'mars_surface'); eq(p.dayInPhase, 1);
  eq(M.phaseAt(M.PROFILES.mars.phases, 180).daysLeft, 0);
});
test('expected temperature shift reaches 1 degC by day 75', () => {
  eq(M.expectedTempShift('micro', 0), 0); eq(M.expectedTempShift('micro', 75), 1); eq(M.expectedTempShift('micro', 300), 1);
});
test('rules: every rule cites known sources and a known system', () => {
  for (const r of RULES) { ok(SYSTEMS[r.system], r.id); ok(r.sources.length, r.id); for (const s of r.sources) ok(SOURCES[s], `${r.id}: ${s}`); }
});
test('rules: no data gives no findings', () => {
  const r = evaluate({}); eq(r.findings.length, 0); eq(r.overall, 'nodata');
});
test('rules: CO2 limits', () => {
  eq(evaluate({ co2: { h1: 3.4, d7: 2 } }).systems.cabin.status, 'nogo');
  eq(evaluate({ co2: { h1: 2.8, d7: 2.7 } }).systems.cabin.status, 'watch');
  eq(evaluate({ co2: { h1: 2.0, d7: 2.0 } }).systems.cabin.status, 'go');
});
test('rules: vision NO-GO needs two checks in a row', () => {
  const base = { center: 0.26, spread: 0.1 };
  eq(evaluate({ vision: { value: 0.56, z: -3, prevZ: null, base } }).systems.eyes.status, 'watch');
  eq(evaluate({ vision: { value: 0.56, z: -3, prevZ: -3, base } }).systems.eyes.status, 'nogo');
  eq(evaluate({ vision: { value: 0.26, z: 0, prevZ: -3, base, amsler: 1 } }).systems.eyes.status, 'watch');
});
test('rules: impaired and unaware is the top finding', () => {
  const pvt = { status: 'watch', value: 2.8, z: -1.4, base: { center: 3.3 }, felt: 80, score: 22, gap: 58, unaware: true };
  const r = evaluate({ pvt });
  eq(r.systems.brain.status, 'watch'); ok(r.top.some((f) => f.rule.id === 'unaware'));
});
test('rules: a projected dose over the limit is advisory and does not block today', () => {
  const r = evaluate({ dose: { career: 100, projected: 900, limit: 600, shareNow: 0.17 } });
  eq(r.systems.dose.status, 'watch'); eq(r.overall, 'nodata'); ok(r.top[0].advisory);
  eq(evaluate({ dose: { career: 610, projected: 900, limit: 600, shareNow: 1.02 } }).overall, 'nogo');
});
test('model: a first check scores against the provisional reference', () => {
  const s = emptyState(); s.mission.start = '2026-11-14';
  s.checks.push({ id: 'a', t: '2026-11-14T10:00:00Z', type: 'pvt', felt: 80, values: { pvt_speed: 2.2, pvt_lapses: 6 } });
  const d = derive(s, '2026-11-14T10:05:00Z', data);
  ok(d.metrics.pvt.base.provisional); eq(d.metrics.pvt.last.score, 1); eq(d.metrics.pvt.last.gap, 79);
  ok(d.metrics.pvt.last.unaware); eq(d.result.systems.brain.status, 'nogo'); ok(d.focus);
  eq(d.envId, 'mars_transit'); ok(d.lt.estimate);
});
test('model: temperature is judged against the in-flight rise', () => {
  const s = emptyState(); s.mission.start = '2026-01-01';
  for (let i = 0; i < 5; i++) s.vitals.push({ t: `2026-01-0${i + 1}T08:00:00Z`, temp: 36.8 });
  s.vitals.push({ t: '2026-04-01T08:00:00Z', temp: 37.7 });
  const d = derive(s, '2026-04-01T09:00:00Z', data);
  eq(d.result.systems.core.status, 'go');
});

const { buildReplay, replayNow } = await import('../js/replay.js');
test('replay: impaired and unaware appears during short sleep and clears afterwards', () => {
  const at = (day) => derive(buildReplay(day), replayNow(day), data);
  eq(at(40).result.systems.brain.status, 'go');
  const bad = at(70); ok(bad.metrics.pvt.last.unaware, 'day 70 unaware'); ok(bad.metrics.pvt.last.score <= 15, 'score ' + bad.metrics.pvt.last.score);
  ok(bad.metrics.pvt.last.felt >= 30, 'felt stays moderate: ' + bad.metrics.pvt.last.felt);
  eq(at(100).metrics.pvt.last.status, 'go');
  eq(at(121).result.systems.cabin.status, 'nogo');
  eq(at(150).result.systems.eyes.status, 'watch');
  const firstUnaware = at(180).gaps.find((g) => g.unaware && g.test === 'pvt');
  ok(firstUnaware, 'has unaware'); 
  window.__FIRST_UNAWARE__ = firstUnaware.t;
});
const out = document.getElementById('out');
const failed = results.filter((r) => !r.ok);
out.innerHTML = results.map((r) => `<span class="${r.ok ? 'ok' : 'bad'}">${r.ok ? 'PASS' : 'FAIL'}</span> ${r.name}${r.ok ? '' : '\n     ' + r.err}`).join('\n') + `\n\n${results.length - failed.length} of ${results.length} passed`;
window.__TESTS__ = { total: results.length, failed };
