// Pointing test: tap highlighted targets around a ring, alternating across it.
// Modelled on the pointing task of NASA's Fine Motor Skills battery; scored as Fitts throughput.
import { h } from '../ui.js';
import { pointingMetrics } from '../scoring.js';

const N = 11, STEP = 5;
const ROUNDS = [{ radius: 150, width: 56 }, { radius: 185, width: 30 }];

export function runMotor(mount, { onDone, register }) {
  const size = 460, c = size / 2;
  const svg = h('svg', { viewBox: `0 0 ${size} ${size}`, style: 'width:min(100%,460px);height:auto;touch-action:none;cursor:crosshair', role: 'application', 'aria-label': 'Pointing test. Tap each highlighted target.' });
  const msg = h('p', { class: 'msg' }, 'Tap the bright target. Be fast and accurate.');
  const bar = h('i');
  mount.replaceChildren(h('div', { class: 'stack', style: '--gap:10px' }, h('div', { class: 'progress' }, bar), h('div', { class: 'stage', style: 'padding:12px' }, h('div', { class: 'stack', style: 'display:grid;justify-items:center;--gap:6px' }, svg, msg))));
  const taps = [];
  let round = 0, idx = 0, count = 0, last = 0, done = false;
  const pos = (i, r) => [c + r * Math.sin((2 * Math.PI * i) / N), c - r * Math.cos((2 * Math.PI * i) / N)];
  const draw = () => {
    const { radius, width } = ROUNDS[round];
    svg.replaceChildren(...Array.from({ length: N }, (_, i) => { const [x, y] = pos(i, radius); return h('circle', { cx: x, cy: y, r: width / 2, fill: i === idx ? '#a9bcff' : '#141b26', stroke: i === idx ? '#fff' : '#2c384a', 'stroke-width': 1.5 }); }));
    bar.style.width = `${((round * (N + 1) + count) / (ROUNDS.length * (N + 1))) * 100}%`;
  };
  const down = (e) => {
    if (done) return;
    e.preventDefault();
    const rect = svg.getBoundingClientRect(), k = size / rect.width;
    const px = (e.clientX - rect.left) * k, py = (e.clientY - rect.top) * k;
    const { radius, width } = ROUNDS[round];
    const [tx, ty] = pos(idx, radius);
    const hit = Math.hypot(px - tx, py - ty) <= width / 2;
    if (count === 0 && !hit) return; // the first tap of a round must land to start the clock
    if (count > 0) {
      const [sx, sy] = pos((idx - STEP + N) % N, radius);
      taps.push({ dist: Math.hypot(tx - sx, ty - sy), width, time: e.timeStamp - last, hit });
    }
    last = e.timeStamp; count++; idx = (idx + STEP) % N;
    if (count > N) { round++; count = 0; idx = 0; if (round >= ROUNDS.length) { done = true; svg.removeEventListener('pointerdown', down); return onDone({ taps, metrics: pointingMetrics(taps) }); } msg.textContent = 'Now smaller targets.'; }
    draw();
  };
  svg.addEventListener('pointerdown', down);
  register(() => { done = true; svg.removeEventListener('pointerdown', down); });
  draw();
}
