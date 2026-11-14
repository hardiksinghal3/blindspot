// Near vision: tumbling E staircase per eye at 50 cm, then an Amsler-style grid.
// Modelled on the vision checks NASA uses for SANS monitoring. Screening grade.
import { h } from '../ui.js';
import { getState, update } from '../store.js';

const DIST_MM = 500, CARD_MM = 85.6, PER_LINE = 4, PASS = 3, START = 0.5, MAX = 1.0;
const DIRS = ['right', 'down', 'left', 'up'];
const ARROW = { ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', ArrowUp: 'up' };

export function runVision(mount, { onDone, register }) {
  let cleanup = () => {};
  register(() => cleanup());
  const result = { right: null, left: null, floor: null, amsler: 0 };

  const calibrate = () => {
    let ppm = getState().settings.calibration?.pxPerMm || 3.78;
    const card = h('div', { style: 'height:120px;border-radius:10px;background:linear-gradient(135deg,#2a3550,#1a2236);border:1px solid #4a5a7a;margin:0 auto' });
    const slider = h('input', { type: 'range', min: 2.2, max: 7, step: 0.01, value: ppm, style: 'width:100%;accent-color:#a9bcff', 'aria-label': 'Card width on screen' });
    const set = () => { ppm = +slider.value; card.style.width = `${CARD_MM * ppm}px`; };
    slider.addEventListener('input', set); set();
    mount.replaceChildren(h('div', { class: 'panel stack' }, h('h3', null, 'Set the screen size'),
      h('p', { class: 'dim' }, 'Hold a bank card or ID card against the screen. Drag until the box is exactly as wide as the card.'),
      h('div', { style: 'overflow-x:auto;padding:8px 0' }, card), slider,
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => { update((s) => { s.settings.calibration = { pxPerMm: ppm }; }); position(ppm); } }, 'It matches'))));
  };

  const position = (ppm) => {
    mount.replaceChildren(h('div', { class: 'panel stack' }, h('h3', null, 'Get in position'),
      h('p', null, 'Sit with your eyes 50 cm from the screen, about one arm\'s length. Wear the glasses or lenses you normally use for a screen.'),
      h('p', { class: 'dim' }, 'An E will appear. Press the arrow key, or the button, for the direction its legs point. Guess if unsure.'),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => eye('right', ppm) }, 'Cover your LEFT eye and start'),
        h('button', { class: 'btn ghost sm', onClick: calibrate }, 'Redo screen size'))));
  };

  const eye = (which, ppm) => {
    const dpr = window.devicePixelRatio || 1;
    // Letters are drawn on whole device pixels only, so each stroke width u is one true line.
    const lmOf = (u) => { const mm = (5 * u) / dpr / ppm; const arcmin = 2 * Math.atan(mm / (2 * DIST_MM)) * (180 / Math.PI) * 60; return Math.round(Math.log10(arcmin / 5) * 100) / 100; };
    let maxU = 1; while (lmOf(maxU + 1) <= MAX) maxU++;
    result.floor = lmOf(1);
    const canvas = h('canvas', { style: 'display:block;margin:0 auto', 'aria-hidden': 'true' });
    const info = h('p', { class: 'msg small' }, '');
    let u = 1; while (u < maxU && lmOf(u) < START) u++;
    let shown = 0, correct = 0, dir = null, best = null, goingUp = false;
    const draw = () => {
      const s = 5 * u, box = Math.max(140, Math.ceil((s / dpr) * 2.2));
      canvas.width = Math.round(box * dpr); canvas.height = Math.round(box * dpr); canvas.style.width = `${box}px`; canvas.style.height = `${box}px`;
      const g = canvas.getContext('2d'), x0 = Math.round((canvas.width - s) / 2), y0 = Math.round((canvas.height - s) / 2);
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, canvas.width, canvas.height); g.fillStyle = '#000';
      const horizontal = dir === 'right' || dir === 'left';
      if (horizontal) { g.fillRect(dir === 'right' ? x0 : x0 + 4 * u, y0, u, s); for (let k = 0; k < 3; k++) g.fillRect(x0, y0 + 2 * k * u, s, u); }
      else { g.fillRect(x0, dir === 'down' ? y0 : y0 + 4 * u, s, u); for (let k = 0; k < 3; k++) g.fillRect(x0 + 2 * k * u, y0, u, s); }
      info.textContent = `${which === 'right' ? 'Right' : 'Left'} eye · line ${lmOf(u).toFixed(2)} logMAR · ${shown + 1} of ${PER_LINE}`;
    };
    const next = () => { let d; do { d = DIRS[Math.floor(Math.random() * 4)]; } while (d === dir && Math.random() < 0.7); dir = d; draw(); };
    const finishEye = (value) => {
      cleanup(); result[which] = value;
      if (which === 'right') mount.replaceChildren(h('div', { class: 'panel stack' }, h('h3', null, 'Right eye done'), h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => eye('left', ppm) }, 'Cover your RIGHT eye and continue'))));
      else amsler(ppm);
    };
    const answer = (a) => {
      if (a === dir) correct++;
      shown++;
      if (shown < PER_LINE) return next();
      const passed = correct >= PASS;
      shown = 0; correct = 0;
      if (passed) {
        best = lmOf(u);
        if (goingUp || u <= 1) return finishEye(best);
        u--;
      } else {
        if (best != null) return finishEye(best);
        if (u >= maxU) return finishEye(1.1);
        goingUp = true; u++;
      }
      next();
    };
    const key = (e) => { if (ARROW[e.key]) { e.preventDefault(); answer(ARROW[e.key]); } };
    window.addEventListener('keydown', key);
    cleanup = () => window.removeEventListener('keydown', key);
    const btn = (d, label) => h('button', { class: 'btn', style: 'min-width:64px', onClick: () => answer(d), 'aria-label': `Legs point ${d}` }, label);
    mount.replaceChildren(h('div', { class: 'stack', style: '--gap:12px' },
      h('div', { class: 'stage', style: 'background:#f2f2f2;min-height:300px' }, canvas),
      h('div', { class: 'row', style: 'justify-content:center' }, btn('left', '←'), btn('up', '↑'), btn('down', '↓'), btn('right', '→')), h('div', { style: 'text-align:center' }, info)));
    next();
  };

  const amsler = (ppm) => {
    const marked = { right: new Set(), left: new Set() };
    const grid = (which) => {
      const n = 10, cell = Math.min(34, (100 * ppm) / n), size = n * cell;
      const svg = h('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: 'background:#f2f2f2;border-radius:4px;max-width:100%;height:auto', role: 'group', 'aria-label': `${which} eye grid` });
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const id = r * n + c;
        const rect = h('rect', { x: c * cell, y: r * cell, width: cell, height: cell, fill: 'transparent', stroke: '#111', 'stroke-width': 1, style: 'cursor:pointer' });
        rect.addEventListener('click', () => { if (marked[which].has(id)) { marked[which].delete(id); rect.setAttribute('fill', 'transparent'); } else { marked[which].add(id); rect.setAttribute('fill', 'rgba(255,60,60,.55)'); } });
        svg.append(rect);
      }
      svg.append(h('circle', { cx: size / 2, cy: size / 2, r: 4, fill: '#000', style: 'pointer-events:none' }));
      return h('div', { class: 'stack', style: '--gap:8px;text-align:center' }, h('span', { class: 'eyebrow' }, `${which} eye`), svg);
    };
    mount.replaceChildren(h('div', { class: 'panel stack' }, h('h3', null, 'Grid check'),
      h('p', null, 'Cover one eye and stare at the centre dot of that eye\'s grid. Without moving your eye, notice whether any lines look wavy, blurred or missing, and click those squares. Then do the other eye.'),
      h('div', { class: 'row', style: 'justify-content:center;gap:28px' }, grid('right'), grid('left')),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onClick: () => { result.amsler = marked.right.size + marked.left.size; onDone(result); } }, 'Done. Score my vision'))));
  };

  if (getState().settings.calibration) position(getState().settings.calibration.pxPerMm); else calibrate();
}
