import { h, chip, fmtDate, STATUS_WORD, signed } from '../ui.js';
import { SYSTEMS } from '../rules.js';
import { formatDelay } from '../mission.js';
import { exportJson } from '../store.js';

export const title = 'Surgeon packet';
export default function packet(ctx) {
  const { d, state, now, replay } = ctx;
  const lt = d.lt;
  const open = d.result.findings.filter((f) => f.status !== 'go');
  const todays = d.gaps.filter((g) => g.t.slice(0, 10) === now.slice(0, 10));
  const lastGap = todays.length ? todays.reduce((a, b) => (b.gap > a.gap ? b : a)) : d.gaps[d.gaps.length - 1];
  const lines = [
    `BLINDSPOT PACKET${replay ? ' (SIMULATED DATA)' : ''}`,
    `Crew: ${state.profile.name || 'not named'} | ${d.env.name}, mission day ${d.mday} | sent ${new Date(now).toISOString().slice(0, 16)}Z`,
    `Overall: ${STATUS_WORD[d.result.overall]}`,
    lastGap ? `Self-assessment: felt ${lastGap.felt}, measured ${lastGap.score}, gap ${signed(lastGap.gap)}${lastGap.unaware ? ' (IMPAIRED AND UNAWARE)' : ''}. Calibration ${d.calibration ?? 'n/a'}/100.` : 'Self-assessment: no checks yet.',
    ...Object.entries(SYSTEMS).map(([id, s]) => `${s.name}: ${STATUS_WORD[d.result.systems[id].status]}`),
    ...open.map((f) => `FINDING [${STATUS_WORD[f.status]}] ${f.why}${f.action ? ' ON-BOARD ACTION ADVISED: ' + f.action : ''}`),
    `Career dose ${Math.round(d.dose.career)} of ${d.dose.limit} mSv (${d.dose.estimated ? 'estimated' : 'dosimeter'}).`,
    'Prototype output. Not a medical device.',
  ];
  const text = lines.join('\n');
  const download = (name, body, type) => { const a = h('a', { href: URL.createObjectURL(new Blob([body], { type })), download: name }); document.body.append(a); a.click(); a.remove(); };
  const copied = h('span', { class: 'small dim', role: 'status' });
  return h('div', { class: 'stack', style: '--gap:20px' },
    h('div', null, h('h2', null, 'Flight surgeon packet'), h('p', { class: 'dim', style: 'margin-top:6px;max-width:70ch' }, 'A short message built for a slow link: what was measured, what the on-board rules advise, and what needs an answer.')),
    h('div', { class: 'split' },
      h('div', { class: 'panel stack' },
        h('div', { class: 'row between' }, h('span', { class: 'eyebrow' }, 'Message'), chip(d.result.overall)),
        h('pre', { style: 'white-space:pre-wrap;font:.84rem/1.6 var(--mono);margin:0;color:var(--text)' }, text),
        h('div', { class: 'row noprint' },
          h('button', { class: 'btn primary', onClick: async () => { try { await navigator.clipboard.writeText(text); copied.textContent = 'Copied.'; } catch { copied.textContent = 'Copy failed. Select the text instead.'; } } }, 'Copy message'),
          h('button', { class: 'btn', onClick: () => download(`blindspot-packet-day-${d.mday}.txt`, text, 'text/plain') }, 'Download text'),
          h('button', { class: 'btn', onClick: () => window.print() }, 'Print'),
          replay ? null : h('button', { class: 'btn', onClick: () => download('blindspot-data.json', exportJson(), 'application/json') }, 'Export all data'),
          copied)),
      h('div', { class: 'stack' },
        h('div', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, 'If sent now'),
          h('dl', { class: 'kv' },
            h('dt', null, 'Reaches Earth in'), h('dd', null, lt ? (lt.blackout ? 'no contact' : formatDelay(lt.seconds)) : 'no data'),
            h('dt', null, 'Earliest reply in'), h('dd', null, lt ? (lt.blackout ? 'after conjunction' : formatDelay(lt.seconds * 2)) : 'no data'),
            h('dt', null, 'Size'), h('dd', null, `${new Blob([text]).size} bytes`)),
          lt && lt.blackout ? h('p', { class: 'note warn' }, 'Earth is out of contact. Follow the on-board action for each finding.') : h('p', { class: 'small dim' }, 'The reply time is physics only. Until it arrives, the on-board action for each finding stands.')),
        h('div', { class: 'panel stack' }, h('span', { class: 'eyebrow' }, 'Open findings'),
          open.length ? open.map((f) => h('div', { class: 'row between', style: 'align-items:flex-start;flex-wrap:nowrap' }, h('span', { class: 'small' }, f.why), chip(f.status))) : h('p', { class: 'dim small' }, 'None.')))));
}
