// Small DOM and SVG helpers shared by every screen.
const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'text', 'ellipse', 'title', 'defs', 'linearGradient', 'stop']);

export function h(tag, attrs, ...kids) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.setAttribute('class', v);
    else if (k === 'html') el.innerHTML = v;
    else if (k in el && !SVG_TAGS.has(tag) && k !== 'list') { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export const STATUS_WORD = { go: 'GO', watch: 'WATCH', nogo: 'NO-GO', nodata: 'NO DATA' };
const VAR = { go: 'var(--go)', watch: 'var(--watch)', nogo: 'var(--nogo)', nodata: 'var(--nodata)' };

// Status is never colour alone: circle, triangle, square, dashed ring.
export function shape(status, size = 12, x = 0, y = 0) {
  const s = size, c = VAR[status];
  if (status === 'go') return h('circle', { cx: x + s / 2, cy: y + s / 2, r: s / 2, fill: c });
  if (status === 'watch') return h('polygon', { points: `${x + s / 2},${y} ${x + s},${y + s} ${x},${y + s}`, fill: c });
  if (status === 'nogo') return h('rect', { x, y, width: s, height: s, rx: 1.5, fill: c });
  return h('circle', { cx: x + s / 2, cy: y + s / 2, r: s / 2 - 1, fill: 'none', stroke: c, 'stroke-width': 1.5, 'stroke-dasharray': '2 2' });
}
export function chip(status, large = false) {
  const s = large ? 15 : 11;
  return h('span', { class: `st ${status}${large ? ' lg' : ''}` }, h('svg', { width: s, height: s, viewBox: `0 0 ${s} ${s}`, 'aria-hidden': 'true' }, shape(status, s)), STATUS_WORD[status]);
}

// The signature graphic: hollow marker = felt, solid marker = measured, joined by the gap.
export function gapBar({ felt, measured, status = 'go', animate = false, height = 74 }) {
  const W = 600, pad = 16, y = 30, x = (v) => pad + (v / 100) * (W - 2 * pad);
  const col = VAR[status];
  const svg = h('svg', { class: 'gapbar', viewBox: `0 0 ${W} ${height}`, role: 'img', 'aria-label': `Felt ${felt ?? 'not given'}, measured ${measured ?? 'not yet'}` });
  svg.append(h('rect', { x: pad, y: y - 3, width: W - 2 * pad, height: 6, rx: 3, fill: '#1c2430' }));
  svg.append(h('rect', { x: x(30), y: y - 3, width: x(70) - x(30), height: 6, fill: '#27313f' }));
  for (const t of [0, 10, 30, 50, 70, 100]) svg.append(h('line', { x1: x(t), x2: x(t), y1: y + 8, y2: y + 13, stroke: '#3a4658' }));
  svg.append(h('text', { x: x(0), y: y + 28, 'text-anchor': 'start' }, '0'), h('text', { x: x(50), y: y + 28, 'text-anchor': 'middle' }, '50 my normal'), h('text', { x: x(100), y: y + 28, 'text-anchor': 'end' }, '100'));
  if (felt != null && measured != null) {
    const ln = h('line', { x1: x(felt), x2: x(animate ? felt : measured), y1: y, y2: y, stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .9 });
    svg.append(ln);
    if (animate) requestAnimationFrame(() => { ln.style.transition = 'all .9s cubic-bezier(.2,.8,.2,1)'; ln.setAttribute('x2', x(measured)); });
  }
  if (measured != null) {
    const g = h('g', { transform: `translate(${x(animate ? felt ?? measured : measured)},${y})` }, h('circle', { r: 10, fill: col }), h('circle', { r: 16, fill: 'none', stroke: col, opacity: .25 }));
    svg.append(g);
    if (animate) requestAnimationFrame(() => { g.style.transition = 'transform .9s cubic-bezier(.2,.8,.2,1)'; g.setAttribute('transform', `translate(${x(measured)},${y})`); });
  }
  if (felt != null) svg.append(h('circle', { cx: x(felt), cy: y, r: 9, fill: '#07090d', stroke: 'var(--accent)', 'stroke-width': 3 }));
  return svg;
}

export const legend = () => h('div', { class: 'legend' },
  h('span', null, h('svg', { width: 16, height: 16 }, h('circle', { cx: 8, cy: 8, r: 5.5, fill: '#07090d', stroke: 'var(--accent)', 'stroke-width': 2.5 })), 'Felt (your call)'),
  h('span', null, h('svg', { width: 16, height: 16 }, h('circle', { cx: 8, cy: 8, r: 6, fill: 'var(--dim)' })), 'Measured'));

const scaleLin = (d0, d1, r0, r1) => (v) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

// Line chart of a metric against the personal band. points: [{t, value, status, shift}], base: {center, spread}
export function lineChart({ points, base, digits = 1, height = 150, dayOf, showExpect = false }) {
  const W = 560, H = height, L = 40, R = 10, T = 10, B = 22;
  const svg = h('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Trend chart' });
  if (!points.length) return svg;
  const days = points.map((p) => dayOf(p.t));
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals, base.center - 2.4 * base.spread), hi = Math.max(...vals, base.center + 2.4 * base.spread + (showExpect ? 1 : 0));
  const x = scaleLin(Math.min(...days), Math.max(...days, Math.min(...days) + 1), L, W - R), y = scaleLin(lo, hi, H - B, T);
  const bandAt = (k, shiftOf) => { const top = points.map((p, i) => `${x(days[i])},${y(base.center + shiftOf(p) + k * base.spread)}`); const bot = points.map((p, i) => `${x(days[i])},${y(base.center + shiftOf(p) - k * base.spread)}`).reverse(); return top.concat(bot).join(' '); };
  const sh = (p) => (showExpect ? p.shift || 0 : 0);
  if (points.length > 1) { svg.append(h('polygon', { class: 'band2', points: bandAt(2, sh) }), h('polygon', { class: 'band', points: bandAt(1, sh) })); }
  else { svg.append(h('rect', { class: 'band', x: L, width: W - L - R, y: y(base.center + base.spread), height: y(base.center - base.spread) - y(base.center + base.spread) })); }
  if (showExpect && points.length > 1) svg.append(h('polyline', { class: 'expect', points: points.map((p, i) => `${x(days[i])},${y(base.center + (p.shift || 0))}`).join(' ') }));
  for (const v of [lo, base.center, hi]) svg.append(h('text', { x: L - 6, y: y(v) + 3, 'text-anchor': 'end' }, v.toFixed(digits)));
  svg.append(h('line', { class: 'axis', x1: L, x2: W - R, y1: H - B, y2: H - B }));
  svg.append(h('text', { x: L, y: H - 6 }, `day ${Math.min(...days)}`), h('text', { x: W - R, y: H - 6, 'text-anchor': 'end' }, `day ${Math.max(...days)}`));
  if (points.length > 1) svg.append(h('polyline', { class: 'line', points: points.map((p, i) => `${x(days[i])},${y(p.value)}`).join(' ') }));
  const dense = points.length > 60;
  points.forEach((p, i) => { if (dense && p.status === 'go' && i !== points.length - 1) return; const s = dense ? 6 : 8; const g = h('g', null, shape(p.status, s, x(days[i]) - s / 2, y(p.value) - s / 2)); g.append(h('title', null, `Day ${days[i]}: ${p.value.toFixed(digits)}`)); svg.append(g); });
  return svg;
}

// Insight Gap over time: each check is a dumbbell from felt (hollow) to measured (solid).
export function gapChart({ gaps, dayOf, height = 210 }) {
  const W = 560, H = height, L = 34, R = 10, T = 10, B = 22;
  const svg = h('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Felt against measured over the mission' });
  if (!gaps.length) return svg;
  const days = gaps.map((g) => dayOf(g.t));
  const x = scaleLin(Math.min(...days), Math.max(...days, Math.min(...days) + 1), L + 6, W - R - 6), y = scaleLin(0, 100, H - B, T);
  svg.append(h('rect', { class: 'band', x: L, width: W - L - R, y: y(70), height: y(30) - y(70) }));
  for (const v of [0, 30, 50, 70, 100]) svg.append(h('text', { x: L - 6, y: y(v) + 3, 'text-anchor': 'end' }, v));
  svg.append(h('line', { class: 'axis', x1: L, x2: W - R, y1: y(50), y2: y(50), 'stroke-dasharray': '2 4' }));
  svg.append(h('text', { x: L, y: H - 6 }, `day ${Math.min(...days)}`), h('text', { x: W - R, y: H - 6, 'text-anchor': 'end' }, `day ${Math.max(...days)}`));
  const dense = gaps.length > 50, r = dense ? 2.2 : 4;
  gaps.forEach((g, i) => {
    const c = g.unaware ? VAR.nogo : g.status === 'go' ? '#7f8da3' : VAR[g.status];
    const grp = h('g', null,
      h('line', { x1: x(days[i]), x2: x(days[i]), y1: y(g.felt), y2: y(g.score), stroke: c, 'stroke-width': g.unaware ? 2 : 1.2, opacity: g.unaware ? 1 : .75 }),
      h('circle', { cx: x(days[i]), cy: y(g.score), r, fill: c }),
      h('circle', { cx: x(days[i]), cy: y(g.felt), r, fill: '#07090d', stroke: 'var(--accent)', 'stroke-width': 1.4 }),
      h('title', null, `Day ${days[i]}: felt ${g.felt}, measured ${g.score}, gap ${g.gap > 0 ? '+' : ''}${g.gap}`));
    svg.append(grp);
  });
  return svg;
}

// Hand-drawn figure with one hotspot per body system.
export function bodyFigure({ systems, selected, onSelect }) {
  const svg = h('svg', { class: 'body-svg', viewBox: '0 0 300 480', role: 'group', 'aria-label': 'Body systems. Select one for details.' });
  svg.append(
    h('circle', { class: 'fig', cx: 150, cy: 56, r: 34 }),
    h('path', { class: 'fig', d: 'M136 88 H164 V102 C196 106 212 122 216 150 L226 250 C228 264 210 268 207 254 L196 176 V246 L202 436 C203 454 179 456 176 438 L150 300 L124 438 C121 456 97 454 98 436 L104 246 V176 L93 254 C90 268 72 264 74 250 L84 150 C88 122 104 106 136 102 Z' }),
  );
  const spots = [
    ['brain', 150, 42, 20, 'Brain', 150, 12, 'middle'], ['eyes', 150, 70, 12, 'Eyes', 194, 74, 'start'], ['heart', 162, 150, 22, 'Heart', 236, 136, 'start'],
    ['core', 150, 216, 24, 'Core', 62, 206, 'end'], ['hands', 84, 252, 18, 'Hands', 46, 292, 'middle'], ['frame', 118, 372, 22, 'Bone, muscle', 90, 410, 'end'],
    ['dose', 262, 336, 22, 'Radiation', 262, 376, 'middle'], ['cabin', 262, 420, 22, 'Cabin air', 262, 460, 'middle'],
  ];
  for (const [id, cx, cy, r, label, lx, ly, anchor] of spots) {
    const st = systems[id].status;
    const g = h('g', { class: `hot${selected === id ? ' sel' : ''}`, tabindex: 0, role: 'button', 'aria-label': `${label}: ${STATUS_WORD[st]}`, 'aria-pressed': selected === id ? 'true' : 'false',
      onClick: () => onSelect(id), onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } } },
    h('circle', { class: 'ring', cx, cy, r: r + 4 }), shape(st, 14, cx - 7, cy - 7), h('text', { x: lx, y: ly, 'text-anchor': anchor }, label));
    svg.append(g);
  }
  return svg;
}

export const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
export const logo = (size = 22) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true' },
  h('circle', { cx: 8, cy: 12, r: 5, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2.4 }), h('line', { x1: 13, x2: 17, y1: 12, y2: 12, stroke: 'var(--nogo)', 'stroke-width': 2.4 }), h('circle', { cx: 19.5, cy: 12, r: 3.5, fill: 'var(--nogo)' }));
