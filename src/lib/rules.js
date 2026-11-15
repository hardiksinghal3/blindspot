// Flight rules: transparent, pre-agreed triggers. Each returns null (no data) or a finding.
// origin: 'nasa' (the number is NASA's) | 'clinical' (clinical convention) | 'prototype' (our own setting).
import { worst } from './scoring.js';

export const SYSTEMS = {
  brain: { name: 'Alertness and mind', part: 'Brain', does: 'Attention, judgement, mood and sleep.', hazards: ['isolation', 'distance', 'environment'], affects: 'NASA lists behavioural change from isolation and confinement as a hazard. In sleep-loss studies, performance kept falling while people felt only slightly worse.' },
  eyes: { name: 'Vision', part: 'Eyes', does: 'Reading displays, procedures and the world outside.', hazards: ['gravity'], affects: 'Without gravity, fluid shifts toward the head. NASA says about 70 percent of station astronauts get some swelling at the back of the eye.' },
  hands: { name: 'Fine motor control', part: 'Hands', does: 'Touchscreens, tools, switches, suit connectors.', hazards: ['gravity'], affects: 'NASA found fine motor skills are disturbed while adapting to weightlessness and again after landing, where it can last up to a month.' },
  heart: { name: 'Heart and circulation', part: 'Heart', does: 'Moves blood and oxygen to brain and muscle.', hazards: ['gravity'], affects: 'NASA notes that muscles, bones, inner ear and organs all have to adjust to each new gravity. Pulse and blood pressure are tracked against your own baseline.' },
  core: { name: 'Temperature and metabolism', part: 'Core', does: 'Body temperature, blood sugar, energy.', hazards: ['gravity', 'environment'], affects: 'Resting core temperature rises about 1 °C over the first 2.5 months of flight, so Earth-normal ranges mislead.' },
  frame: { name: 'Bone and muscle', part: 'Frame', does: 'Strength to work, to land and to walk away.', hazards: ['gravity'], affects: 'NASA reports 1 to 1.5 percent bone density loss per month in flight. Daily exercise is the countermeasure.' },
  dose: { name: 'Radiation dose', part: 'Whole body', does: 'Lifetime exposure to space radiation.', hazards: ['radiation'], affects: 'NASA calls radiation one of the most hazardous parts of spaceflight. Measured dose rates in Mars transit are more than twice those on the station.' },
  cabin: { name: 'Cabin air', part: 'Environment', does: 'The air the crew breathes.', hazards: ['environment'], affects: 'In a closed cabin the crew breathes its own carbon dioxide. NASA links higher levels on the station to crew headaches.' },
};

export const HAZARDS = {
  radiation: 'Space radiation',
  isolation: 'Isolation and confinement',
  distance: 'Distance from Earth',
  gravity: 'Gravity fields',
  environment: 'Hostile, closed environments',
};

const F = (status, why, action) => ({ status, why, action });

export const RULES = [
  {
    id: 'alert-speed', system: 'brain', title: 'Reaction speed against your own baseline', origin: 'prototype',
    trigger: 'WATCH at 1 spread slower than your baseline, NO-GO at 2.', sources: ['rst', 'pvtb'],
    check: (c) => c.pvt && (c.pvt.status === 'go' ? F('go', `Response speed ${c.pvt.value.toFixed(2)} per second, within your normal band.`, null)
      : F(c.pvt.status, `Response speed ${c.pvt.value.toFixed(2)} per second is ${Math.abs(c.pvt.z).toFixed(1)} spreads below your baseline of ${c.pvt.base.center.toFixed(2)}.`,
        c.pvt.status === 'nogo' ? 'Stop critical tasks. Sleep, then retest before any hazardous work.' : 'Avoid solo critical tasks. Take a break and retest in 2 hours.')),
  },
  {
    id: 'alert-lapses', system: 'brain', title: 'Lapses of attention', origin: 'prototype',
    trigger: 'WATCH when lapses (355 ms or slower) are 2 spreads above your baseline.', sources: ['pvtb'],
    check: (c) => c.pvt && c.pvt.lapsesZ != null && (c.pvt.lapsesZ <= -2 ? F('watch', `${c.pvt.lapses} lapses in this test, well above your usual.`, 'Do not rely on vigilance alone. Use a checklist and a second person.') : F('go', `${c.pvt.lapses} lapses, within your normal band.`, null)),
  },
  {
    id: 'unaware', system: 'brain', title: 'Impaired and unaware', origin: 'prototype',
    trigger: 'Measured below normal while you rated yourself 20 or more points higher.', sources: ['vandongen'],
    check: (c) => c.pvt && c.pvt.gap != null && (c.pvt.unaware ? F(worst(c.pvt.status, 'watch'), `You called ${c.pvt.felt}. You measured ${c.pvt.score}. Your own judgement is ${c.pvt.gap} points too high right now.`, 'Do not self-certify. Ask a crewmate to cross-check your work and hand over critical tasks.') : F('go', Math.abs(c.pvt.gap) < 20 ? `Felt ${c.pvt.felt}, measured ${c.pvt.score}. Your call was within ${Math.abs(c.pvt.gap)} points.` : `Felt ${c.pvt.felt}, measured ${c.pvt.score}. Your call was off by ${Math.abs(c.pvt.gap)} points, but you measured inside your normal band.`, null)),
  },
  {
    id: 'sleep', system: 'brain', title: 'Short sleep', origin: 'prototype',
    trigger: 'Under 6 hours on each of the last 2 nights.', sources: ['vandongen'],
    check: (c) => c.sleep && c.sleep.length >= 2 && (c.sleep.slice(-2).every((h) => h < 6) ? F('watch', `Last two nights: ${c.sleep.slice(-2).map((h) => h.toFixed(1)).join(' and ')} hours.`, 'Protect an 8-hour sleep period tonight. Expect to feel better than you perform.') : F('go', `Last night ${c.sleep[c.sleep.length - 1].toFixed(1)} hours.`, null)),
  },
  {
    id: 'mood', system: 'brain', title: 'Low mood', origin: 'prototype',
    trigger: 'Mood 2 of 5 or lower on 3 days running.', sources: ['hazards'],
    check: (c) => c.mood && c.mood.length >= 3 && (c.mood.slice(-3).every((m) => m <= 2) ? F('watch', 'Mood has been 2 of 5 or lower for 3 days.', 'Tell a crewmate. Schedule a private conference with the flight surgeon.') : F('go', `Mood today ${c.mood[c.mood.length - 1]} of 5.`, null)),
  },
  {
    id: 'vision-acuity', system: 'eyes', title: 'Near vision against your baseline', origin: 'prototype',
    trigger: 'WATCH at 1 line (0.1 logMAR) worse than baseline in either eye. NO-GO when 2 or more lines worse on two checks in a row.', sources: ['sans', 'sansmon'],
    check: (c) => {
      if (!c.vision) return null;
      const v = c.vision, lines = Math.round(Math.abs(v.z));
      if (v.z > -1) return F('go', `Near acuity ${fmtLog(v.value)} logMAR, at your baseline.`, null);
      const why = `Near acuity ${fmtLog(v.value)} logMAR is ${lines} line${lines === 1 ? '' : 's'} worse than your baseline of ${fmtLog(v.base.center)}.`;
      if (v.z <= -2 && v.prevZ != null && v.prevZ <= -2) return F('nogo', `${why} Confirmed on two checks.`, 'Report to the flight surgeon. Use larger display text and have a crewmate read critical displays.');
      return F('watch', why, 'Repeat the test to confirm. If confirmed, report to the flight surgeon and use larger display text.');
    },
  },
  {
    id: 'vision-amsler', system: 'eyes', title: 'Distortion on the Amsler grid', origin: 'prototype',
    trigger: 'Any wavy, missing or blurred area marked on the grid.', sources: ['sansmon'],
    check: (c) => c.vision && c.vision.amsler != null && (c.vision.amsler > 0 ? F('watch', `${c.vision.amsler} area${c.vision.amsler === 1 ? '' : 's'} marked as distorted or missing.`, 'Repeat with the other eye covered. Send the marked grid to the flight surgeon.') : F('go', 'No distortion marked.', null)),
  },
  {
    id: 'motor', system: 'hands', title: 'Pointing speed and accuracy', origin: 'prototype',
    trigger: 'WATCH at 1 spread below baseline, NO-GO at 2.', sources: ['fms'],
    check: (c) => c.motor && (c.motor.status === 'go' ? F('go', `Throughput ${c.motor.value.toFixed(2)} bits per second, within your normal band.`, null)
      : F(c.motor.status, `Throughput ${c.motor.value.toFixed(2)} bits per second is ${Math.abs(c.motor.z).toFixed(1)} spreads below your baseline.`, 'Slow down on touchscreens and connectors. Confirm each critical input with a second person.')),
  },
  {
    id: 'gravity-change', system: 'hands', title: 'Recent change of gravity', origin: 'prototype',
    trigger: 'First 7 days after entering weightlessness or landing.', sources: ['fms', 'fieldtest'],
    check: (c) => (c.daysSinceGravityChange != null && c.daysSinceGravityChange <= 7 ? F('watch', `Day ${c.daysSinceGravityChange} after a change of gravity.`, 'Expect clumsy hands and unsteady balance. Test before piloting or suited work.') : null),
  },
  {
    id: 'pulse', system: 'heart', title: 'Resting pulse against your baseline', origin: 'prototype',
    trigger: 'WATCH at 2 spreads from baseline, or outside 50 to 100 beats per minute.', sources: ['clinical'],
    check: (c) => c.pulse && (c.pulse.z <= -2 || c.pulse.value > 100 || c.pulse.value < 50 ? F('watch', `Resting pulse ${Math.round(c.pulse.value)} beats per minute; ${c.pulse.base.provisional ? 'the general range used until you have 3 readings is 50 to 100' : `your baseline is ${Math.round(c.pulse.base.center)}`}.`, 'Rest 5 minutes and measure again. Report if it persists.') : F('go', `Resting pulse ${Math.round(c.pulse.value)} beats per minute.`, null)),
  },
  {
    id: 'bp', system: 'heart', title: 'Blood pressure', origin: 'clinical',
    trigger: 'WATCH at 140/90 or above, or systolic under 90. NO-GO at 180/120 or above.', sources: ['clinical'],
    check: (c) => c.bp && (c.bp.sys >= 180 || c.bp.dia >= 120 ? F('nogo', `Blood pressure ${c.bp.sys}/${c.bp.dia} mmHg.`, 'Stop work, rest, measure again in 5 minutes and contact the flight surgeon now.')
      : c.bp.sys >= 140 || c.bp.dia >= 90 || c.bp.sys < 90 ? F('watch', `Blood pressure ${c.bp.sys}/${c.bp.dia} mmHg.`, 'Measure again after 5 minutes at rest. Log it for the flight surgeon.') : F('go', `Blood pressure ${c.bp.sys}/${c.bp.dia} mmHg.`, null)),
  },
  {
    id: 'spo2', system: 'heart', title: 'Blood oxygen', origin: 'clinical',
    trigger: 'WATCH under 95 percent, NO-GO under 92 percent.', sources: ['clinical'],
    check: (c) => c.spo2 != null && (c.spo2 < 92 ? F('nogo', `Oxygen saturation ${c.spo2} percent.`, 'Check cabin air and the sensor. Use supplemental oxygen per procedure and contact the flight surgeon.') : c.spo2 < 95 ? F('watch', `Oxygen saturation ${c.spo2} percent.`, 'Reseat the sensor and measure again.') : F('go', `Oxygen saturation ${c.spo2} percent.`, null)),
  },
  {
    id: 'temp', system: 'core', title: 'Temperature against space-normal', origin: 'prototype',
    trigger: 'Judged against your baseline plus the expected in-flight rise (about 1 °C by day 75). WATCH at 2 spreads, NO-GO at 4.', sources: ['temp'],
    check: (c) => c.temp && (c.temp.z <= -4 ? F('nogo', tempWhy(c), 'Rest, drink, cool or warm as needed, and contact the flight surgeon.') : c.temp.z <= -2 ? F('watch', tempWhy(c), 'Measure again in 30 minutes. Skip exercise until it settles.') : F('go', tempWhy(c), null)),
  },
  {
    id: 'glucose', system: 'core', title: 'Blood sugar', origin: 'clinical',
    trigger: 'WATCH under 70 or over 180 mg/dL. NO-GO under 54 or over 250 mg/dL.', sources: ['clinical'],
    check: (c) => c.glucose != null && (c.glucose < 54 || c.glucose > 250 ? F('nogo', `Blood sugar ${c.glucose} mg/dL.`, c.glucose < 54 ? 'Eat or drink something sugary now. Do not work alone. Retest in 15 minutes.' : 'Drink water, retest, and contact the flight surgeon.')
      : c.glucose < 70 || c.glucose > 180 ? F('watch', `Blood sugar ${c.glucose} mg/dL.`, c.glucose < 70 ? 'Eat, then retest in 15 minutes.' : 'Retest before the next meal and log it.') : F('go', `Blood sugar ${c.glucose} mg/dL.`, null)),
  },
  {
    id: 'balance', system: 'frame', title: 'Sit-to-stand against your baseline', origin: 'prototype',
    trigger: 'Time for five sit-to-stands under gravity. WATCH at 1 spread slower than your baseline, NO-GO at 2. No verdict until you have 3 readings.', sources: ['fieldtest'],
    check: (c) => c.balance && (c.balance.base.forming ? F('go', `Five sit-to-stands in ${c.balance.value.toFixed(1)} seconds. Baseline reading ${c.balance.base.n} of 3.`, null)
      : c.balance.status === 'go' ? F('go', `Five sit-to-stands in ${c.balance.value.toFixed(1)} seconds, within your normal band.`, null)
      : F(c.balance.status, `Five sit-to-stands took ${c.balance.value.toFixed(1)} seconds; your baseline is ${c.balance.base.center.toFixed(1)}.`,
        c.balance.status === 'nogo' ? 'No ladders, driving or suited work. Move with a hand on a rail and retest after rest.' : 'Keep a hand on a rail when you move. Retest before any work on foot.')),
  },
  {
    id: 'exercise', system: 'frame', title: 'Exercise countermeasure adherence', origin: 'prototype',
    trigger: 'Under 70 percent of prescribed exercise over the last 7 days.', sources: ['bone'],
    check: (c) => c.exercise != null && (c.exercise < 0.7 ? F('watch', `${Math.round(c.exercise * 100)} percent of prescribed exercise done over the last 7 days.`, 'Rebook the missed sessions. Bone and muscle loss does not hurt until it matters.') : F('go', `${Math.round(c.exercise * 100)} percent of prescribed exercise done over the last 7 days.`, null)),
  },
  {
    id: 'dose-career', system: 'dose', title: 'Career dose limit', origin: 'nasa', planning: true,
    trigger: 'WATCH when the projected end-of-mission total passes 600 mSv. NO-GO for optional exposure once the limit is reached.', sources: ['std1', 'artemis'],
    check: (c) => c.dose && (c.dose.career >= c.dose.limit ? F('nogo', `Career dose ${Math.round(c.dose.career)} mSv has reached the ${c.dose.limit} mSv limit.`, 'No optional time outside shielding. Plan work in the best-shielded areas.')
      : c.dose.projected >= c.dose.limit ? F('watch', `${Math.round(c.dose.career)} mSv so far. This mission is projected to end at ${Math.round(c.dose.projected)} mSv, above the ${c.dose.limit} mSv limit.`, 'Keep exposure as low as possible: sleep in the shielded area and plan outside work around solar activity.')
        : F('go', `${Math.round(c.dose.career)} mSv so far, ${Math.round(c.dose.shareNow * 100)} percent of the career limit.`, null)),
  },
  {
    id: 'spe', system: 'dose', title: 'Solar particle event', origin: 'prototype',
    trigger: 'A measured solar particle onset in NASA\'s DONKI record in the last 24 hours. NO-GO for protons above 100 MeV, WATCH for other onsets. The records come from instruments near Earth and on STEREO A, so the ship\'s own detector has the last word.', sources: ['donki'],
    check: (c) => (c.spe ? F(c.spe.level, `Solar particle event recorded by ${c.spe.inst} at ${c.spe.t.replace('T', ' ').replace('Z', ' UTC')} (NASA DONKI).`,
      c.spe.level === 'nogo' ? 'Go to the best-shielded area. No work outside. Enter your dosimeter reading when it has passed.' : 'Stay close to the shielded area and watch the ship\'s particle detector. Postpone work outside.') : null),
  },
  {
    id: 'co2', system: 'cabin', title: 'Cabin carbon dioxide', origin: 'nasa',
    trigger: 'NO-GO above 3 mmHg (1-hour average). WATCH above 2.5 mmHg (7-day average), NASA\'s level for keeping headache risk under 1 percent.', sources: ['std2', 'co2'],
    check: (c) => c.co2 && (c.co2.h1 > 3 ? F('nogo', `Carbon dioxide ${c.co2.h1.toFixed(1)} mmHg, above the 3 mmHg limit.`, 'Check the scrubber and airflow. Move to a ventilated module. Headache and poor focus are expected.')
      : c.co2.d7 > 2.5 ? F('watch', `7-day average carbon dioxide ${c.co2.d7.toFixed(1)} mmHg.`, 'Increase ventilation where the crew sleeps and exercises.') : F('go', `Carbon dioxide ${c.co2.h1.toFixed(1)} mmHg.`, null)),
  },
];

function fmtLog(v) { return (v >= 0 ? '+' : '') + v.toFixed(2); }
function tempWhy(c) {
  const exp = c.temp.base.center + c.temp.shift;
  return `${c.temp.value.toFixed(1)} °C. Expected for you on this mission day: ${exp.toFixed(1)} °C${c.temp.shift > 0.05 ? ` (baseline ${c.temp.base.center.toFixed(1)} plus ${c.temp.shift.toFixed(1)} in-flight rise)` : ''}.`;
}

// Run every rule. Returns { findings: [{rule, status, why, action}], systems: {id: {status, findings}}, overall }.
export function evaluate(ctx) {
  const findings = [];
  for (const rule of RULES) {
    let r = null;
    try { r = rule.check(ctx) || null; } catch { r = null; }
    // A planning rule at WATCH is a long-term caution. It shows on its system but does not hold up today's tasks.
    if (r) findings.push({ rule, ...r, advisory: !!rule.planning && r.status === 'watch' });
  }
  const systems = {};
  for (const id of Object.keys(SYSTEMS)) {
    const f = findings.filter((x) => x.rule.system === id);
    systems[id] = { status: f.length ? worst(...f.map((x) => x.status)) : 'nodata', findings: f };
  }
  const acting = findings.filter((f) => !f.advisory);
  const order = { nogo: 0, watch: 1, go: 2 };
  const top = findings.filter((f) => f.status !== 'go').sort((a, b) => a.advisory - b.advisory || order[a.status] - order[b.status] || (b.rule.id === 'unaware') - (a.rule.id === 'unaware'));
  return { findings, systems, overall: acting.length ? worst(...acting.map((f) => f.status)) : 'nodata', top };
}
