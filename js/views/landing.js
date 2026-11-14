import { h, gapBar, legend, chip } from '../ui.js';
import { startReplay } from '../app.js';
import { getState } from '../store.js';

export const title = '';
export default function landing() {
  const viz = h('div', { class: 'heroviz stack', style: '--gap:14px' },
    h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Alertness check'), chip('nogo')),
    h('div', { class: 'row', style: 'gap:28px;align-items:flex-end' },
      h('div', null, h('div', { class: 'eyebrow' }, 'You called'), h('div', { class: 'num', style: 'font-size:2.4rem;color:var(--accent);line-height:1.1' }, '82')),
      h('div', null, h('div', { class: 'eyebrow' }, 'You measured'), h('div', { class: 'num c-nogo', style: 'font-size:2.4rem;line-height:1.1' }, '9')),
      h('div', null, h('div', { class: 'eyebrow' }, 'Insight Gap'), h('div', { class: 'num', style: 'font-size:2.4rem;line-height:1.1' }, '+73'))),
    gapBar({ felt: 82, measured: 9, status: 'nogo', animate: true }), legend(),
    h('hr', { class: 'hr' }),
    h('p', null, h('b', null, 'Impaired and unaware. '), 'Do not self-certify. Hand over critical tasks and ask a crewmate to cross-check.'),
    h('p', { class: 'small dim' }, 'Earth cannot answer for 38 min 12 s.'),
    h('p', { class: 'tiny faint' }, 'Example screen with illustrative numbers.'));

  return h('div', { class: 'stack', style: '--gap:56px' },
    h('section', { class: 'hero split', style: 'align-items:center;gap:40px' },
      h('div', null,
        h('p', { class: 'eyebrow' }, 'Astronaut health monitoring · research prototype'),
        h('h1', { style: 'margin-top:18px' }, 'The health monitor that does not trust how you feel.'),
        h('p', { class: 'lead' }, 'On the way to Mars, astronauts have to spot changes in themselves. But a tired brain rates itself as fine. BlindSpot asks how you feel, measures how you are, and acts on the gap.'),
        h('div', { class: 'row cta' },
          h('a', { class: 'btn primary big', href: getState().settings.onboarded ? '#/check' : '#/setup' }, 'Run today\'s check'),
          h('button', { class: 'btn big', onClick: () => startReplay(1, true) }, 'Play a 180-day mission')),
        h('p', { class: 'small faint', style: 'margin-top:14px' }, 'The check takes about a minute and uses only this device. The mission replay is simulated and labelled.')),
      viz),
    h('section', { class: 'grid g3' },
      fact('14 days', 'of sleep limited to 6 hours or less cut performance as much as up to two nights with no sleep, and the subjects were largely unaware of it.', 'Van Dongen and others, Sleep, 2003', 'https://pubmed.ncbi.nlm.nih.gov/12683469/'),
      fact('22 min', 'is the longest one-way signal time between Earth and Mars. A question and its answer take up to 44.', 'NASA / JPL Horizons, bundled in this app', '#/mission'),
      fact('70 %', 'of space station astronauts get some swelling at the back of the eye. Vision is one thing BlindSpot tests.', 'NASA Human Research Program', 'https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/')),
    h('section', { class: 'stack' },
      h('h2', null, 'How it works'),
      h('div', { class: 'grid g4' },
        step('01', 'Call it', 'Before each test you predict your result on a slider.'),
        step('02', 'Test it', 'Reaction time, near vision, pointing and pulse, measured on this device against your own baseline.'),
        step('03', 'See the gap', 'Felt minus measured. A large gap while impaired is the most dangerous state, and it gets its own alarm.'),
        step('04', 'Act without Earth', 'Each body system reports GO, WATCH or NO-GO from written rules, with the source of every number.'))),
    h('section', { class: 'grid g2' },
      h('div', { class: 'panel stack' }, h('span', { class: 'tag nasa' }, 'NASA data inside'), h('h3', null, 'Real ephemeris, real dose rates, real limits'),
        h('p', { class: 'dim small' }, 'Light-time and communication blackouts come from the JPL Horizons system. Radiation dose uses rates measured around the Solar System and NASA\'s 600 mSv career limit. Cabin air uses NASA\'s 3 mmHg carbon dioxide limit.'),
        h('a', { href: '#/sources' }, 'Sources and limits')),
      h('div', { class: 'panel stack' }, h('span', { class: 'tag' }, 'Honest by design'), h('h3', null, 'What this is not'),
        h('p', { class: 'dim small' }, 'Not a medical device and not validated in flight. The Insight Gap is a hypothesis built on sleep research. Thresholds that are not NASA\'s are marked as this prototype\'s own on every rule.'),
        h('a', { href: '#/rules' }, 'Read the flight rules'))));
}
const fact = (big, text, src, href) => h('div', { class: 'fact' }, h('b', null, big), h('p', { class: 'dim' }, text), h('p', { class: 'tiny', style: 'margin-top:8px' }, h('a', { href, target: href.startsWith('#') ? null : '_blank', rel: 'noopener' }, src)));
const step = (n, t, p) => h('div', { class: 'panel howstep stack', style: '--gap:8px' }, h('span', { class: 'n' }, n), h('h3', null, t), h('p', { class: 'dim small' }, p));
