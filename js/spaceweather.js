// Solar energetic particle (SEP) records from NASA DONKI, bundled in data/sep.json.
// Each record is an onset seen by one instrument, or a model forecast.
const HOUR = 3600000;
export const ACTIVE_HOURS = 24;

export const isMeasured = (e) => !e.inst.some((i) => i.startsWith('MODEL'));
const isHighEnergy = (e) => e.inst.some((i) => i.includes('>100 MeV'));

// The event to act on at a given time, or null. Prototype setting: an onset counts for 24 hours;
// protons above 100 MeV mean shelter (NO-GO), other measured onsets mean stand by (WATCH).
export function activeSpe(sep, nowIso) {
  if (!sep) return null;
  const now = Date.parse(nowIso);
  const live = sep.events.filter((e) => isMeasured(e) && now - Date.parse(e.t) >= 0 && now - Date.parse(e.t) <= ACTIVE_HOURS * HOUR);
  if (!live.length) return null;
  const top = live.find(isHighEnergy) || live[live.length - 1];
  return { level: isHighEnergy(top) ? 'nogo' : 'watch', t: top.t, inst: top.inst.join(', '), link: top.link, count: live.length };
}

// Measured onsets in the days before a time, newest first.
export function recentEvents(sep, nowIso, days = 30) {
  if (!sep) return [];
  const now = Date.parse(nowIso);
  return sep.events.filter((e) => isMeasured(e) && now - Date.parse(e.t) >= 0 && now - Date.parse(e.t) <= days * 24 * HOUR).reverse();
}
