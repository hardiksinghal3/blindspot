import { h } from '../ui.js';
import { SOURCES } from '../sources.js';

export const title = 'Sources and limits';
export default function sources(ctx) {
  const all = Object.values(SOURCES).filter((s) => s.url);
  const row = (s) => h('tr', null, h('td', null, h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.title)), h('td', { class: 'dim small' }, s.org));
  const table = (list) => h('table', { class: 't' }, h('thead', null, h('tr', null, h('th', null, 'Source'), h('th', null, 'From'))), h('tbody', null, list.map(row)));
  const lim = (t, p) => h('div', { class: 'panel tight stack', style: '--gap:6px' }, h('h3', null, t), h('p', { class: 'small dim' }, p));
  return h('div', { class: 'stack', style: '--gap:22px' },
    h('div', null, h('h2', null, 'Sources and limits'), h('p', { class: 'dim', style: 'margin-top:6px;max-width:70ch' }, 'Where every number comes from, and what this prototype cannot claim.')),
    h('section', { class: 'panel stack' }, h('div', { class: 'row between' }, h('h3', null, 'Data used inside the app'), h('span', { class: 'tag nasa' }, 'NASA and partner data')),
      table(all.filter((s) => s.data)),
      h('p', { class: 'small dim' }, ctx.data ? `Horizons data retrieved ${ctx.data.retrieved}: daily Earth to Mars and Earth to Moon range and Sun angle, 2023 to 2040, bundled so the app works with no link to Earth.` : 'Ephemeris file not loaded.'),
      h('p', { class: 'small dim' }, ctx.sep ? `DONKI data retrieved ${ctx.sep.retrieved}: ${ctx.sep.events.length} solar energetic particle records since ${ctx.sep.from}. The mission replay flies real calendar dates (departure 20 November 2023), so its light-time and solar events are the real record for those dates.` : 'Solar event file not loaded.')),
    h('section', { class: 'panel stack' }, h('h3', null, 'References'), table(all.filter((s) => !s.data))),
    h('section', { class: 'stack' }, h('h3', null, 'Limits'),
      h('div', { class: 'grid g2' },
        lim('Not a medical device', 'BlindSpot does not diagnose or treat. It has not been tested in flight or in a clinical study.'),
        lim('The Insight Gap is a hypothesis', 'It is built on sleep-restriction research showing people are largely unaware of their own deficits. It has not been validated as a spaceflight measure.'),
        lim('Thresholds', 'Only the 600 mSv dose limit and the 3 and 2.5 mmHg carbon dioxide levels are NASA\'s. Blood pressure, blood sugar and oxygen thresholds are common clinical conventions and were not checked against a cited source. Everything else is a prototype setting.'),
        lim('Browser tests are screening grade', 'Browsers add timing delay to reaction tests, so results are compared with your own baseline on the same device. Screen vision tests cannot draw letters smaller than the pixels allow. The camera pulse reading has not been checked against a reference device.'),
        lim('Simulated data', 'In the 180-day mission replay the crew member and the cabin readings are simulated, and every screen is stamped. Light-time and solar events in the replay are real NASA data. Live mode uses only what you measure or type in.'),
        lim('Solar events', 'DONKI records come from instruments near Earth and on STEREO A, not from the ship\'s position. The 24-hour window and the split at 100 MeV are prototype settings.'),
        lim('Radiation ledger', 'A rough comparison: it sets dose-equivalent rates measured in one period of the solar cycle against a limit expressed in effective dose.'))),
    h('section', { class: 'panel stack' }, h('h3', null, 'Use of SI (AI) tools'),
      h('p', { class: 'small dim' }, 'The code, text and graphics of this prototype were produced with SI coding tools. No SI-generated images, video or audio are used, and no NASA logos or insignia appear. BlindSpot is not endorsed by NASA.')),
    h('section', { class: 'panel stack' }, h('h3', null, 'Privacy'), h('p', { class: 'small dim' }, 'Readings are stored only in this browser. Camera frames are processed on the device and never saved or sent.')));
}
