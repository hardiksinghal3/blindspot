// The custom graphics. Astryx has no chart or figure component, so these are SVG drawn with theme tokens.
import { useId, useState } from 'react';
import { STATUS_WORD } from './Status.jsx';
import { useAnimatedNumber, useAppear, prefersReducedMotion } from './motion.jsx';

const C = {
  go: 'var(--color-success)', watch: 'var(--color-warning)', nogo: 'var(--color-error)', nodata: 'var(--color-text-disabled)',
  track: 'var(--color-track)', band: 'var(--color-background-muted)', felt: 'var(--color-accent)', surface: 'var(--color-background-surface)',
  label: 'var(--color-text-secondary)', axis: 'var(--color-border-emphasized)', quiet: 'var(--color-text-secondary)',
};
const FONT = { fontFamily: 'var(--font-family-body)', fill: C.label };
const FLUID = { display: 'block', width: '100%', height: 'auto' };

// Status is never colour alone: circle, triangle, square, dashed ring.
export function Shape({ status, size = 12, x = 0, y = 0 }) {
  const s = size, c = C[status];
  if (status === 'go') return <circle cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={c} />;
  if (status === 'watch') return <polygon points={`${x + s / 2},${y} ${x + s},${y + s} ${x},${y + s}`} fill={c} />;
  if (status === 'nogo') return <rect x={x} y={y} width={s} height={s} rx={1.5} fill={c} />;
  return <circle cx={x + s / 2} cy={y + s / 2} r={s / 2 - 1} fill="none" stroke={c} strokeWidth={1.5} strokeDasharray="2 2" />;
}

export function Logo({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx={8} cy={12} r={5} fill="none" stroke={C.felt} strokeWidth={2.4} />
      <line x1={13} x2={17} y1={12} y2={12} stroke={C.nogo} strokeWidth={2.4} />
      <circle cx={19.5} cy={12} r={3.5} fill={C.nogo} />
    </svg>
  );
}

// The signature graphic: hollow marker = felt, solid marker = measured, joined by the gap.
export function GapBar({ felt, measured, status = 'go' }) {
  const W = 600, H = 66, pad = 16, y = 22, x = (v) => pad + (v / 100) * (W - 2 * pad);
  const col = C[status];
  const feltAt = useAnimatedNumber(felt, { from: felt });
  const measuredAt = useAnimatedNumber(measured, { from: felt ?? 50, ms: 1000 });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={FLUID} role="img" aria-label={`Felt ${felt ?? 'not given'}, measured ${measured ?? 'not yet'}, on a scale of 0 to 100 where 50 is your normal`}>
      <rect x={pad} y={y - 3} width={W - 2 * pad} height={6} rx={3} fill={C.track} />
      <rect x={x(30)} y={y - 3} width={x(70) - x(30)} height={6} fill={C.axis} />
      {[0, 30, 50, 70, 100].map((t) => <line key={t} x1={x(t)} x2={x(t)} y1={y + 9} y2={y + 14} stroke={C.axis} />)}
      <text x={x(0)} y={y + 32} textAnchor="start" fontSize={12} style={FONT}>0</text>
      <text x={x(50)} y={y + 32} textAnchor="middle" fontSize={12} style={FONT}>50 · my normal</text>
      <text x={x(100)} y={y + 32} textAnchor="end" fontSize={12} style={FONT}>100</text>
      {felt != null && measured != null && <line x1={x(feltAt)} x2={x(measuredAt)} y1={y} y2={y} stroke={col} strokeWidth={4} strokeLinecap="round" />}
      {measured != null && <circle cx={x(measuredAt)} cy={y} r={10} fill={col} />}
      {felt != null && <circle cx={x(feltAt)} cy={y} r={9} fill={C.surface} stroke={C.felt} strokeWidth={3} />}
    </svg>
  );
}

export function LegendMark({ kind }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
      {kind === 'felt' ? <circle cx={7} cy={7} r={5} fill={C.surface} stroke={C.felt} strokeWidth={2.4} /> : <circle cx={7} cy={7} r={6} fill={C.quiet} />}
    </svg>
  );
}

const scaleLin = (d0, d1, r0, r1) => (v) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

// A metric against the personal band. points: [{t, value, status, shift}], base: {center, spread}
export function LineChart({ points, base, digits = 1, height = 150, dayOf, showExpect = false, label = 'Trend chart' }) {
  const W = 560, H = height, L = 44, R = 10, T = 10, B = 22;
  if (!points.length) return null;
  const days = points.map((p) => dayOf(p.t)), vals = points.map((p) => p.value);
  const d0 = Math.min(...days), d1 = Math.max(...days, d0 + 1);
  const lo = Math.min(...vals, base.center - 2.4 * base.spread), hi = Math.max(...vals, base.center + 2.4 * base.spread + (showExpect ? 1 : 0));
  const x = scaleLin(d0, d1, L, W - R), y = scaleLin(lo, hi, H - B, T);
  const sh = (p) => (showExpect ? p.shift || 0 : 0);
  const band = (k) => points.map((p, i) => `${x(days[i])},${y(base.center + sh(p) + k * base.spread)}`).concat(points.map((p, i) => `${x(days[i])},${y(base.center + sh(p) - k * base.spread)}`).reverse()).join(' ');
  const dense = points.length > 60;
  const clip = useId(), shown = useAppear();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={FLUID} role="img" aria-label={label}>
      <clipPath id={clip}><rect x={0} y={0} width={L + (W - L) * shown} height={H} /></clipPath>
      {points.length > 1
        ? <><polygon points={band(2)} fill={C.band} opacity={0.6} /><polygon points={band(1)} fill={C.track} opacity={0.7} /></>
        : <rect x={L} width={W - L - R} y={y(base.center + base.spread)} height={y(base.center - base.spread) - y(base.center + base.spread)} fill={C.track} opacity={0.7} />}
      {showExpect && points.length > 1 && <polyline points={points.map((p, i) => `${x(days[i])},${y(base.center + (p.shift || 0))}`).join(' ')} fill="none" stroke={C.label} strokeDasharray="4 4" />}
      {[lo, base.center, hi].map((v, i) => <text key={i} x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={FONT}>{v.toFixed(digits)}</text>)}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke={C.axis} />
      <text x={L} y={H - 6} fontSize={11} style={FONT}>day {d0}</text>
      <text x={W - R} y={H - 6} textAnchor="end" fontSize={11} style={FONT}>day {Math.max(...days)}</text>
      <g clipPath={`url(#${clip})`}>
        {points.length > 1 && <polyline points={points.map((p, i) => `${x(days[i])},${y(p.value)}`).join(' ')} fill="none" stroke={C.quiet} strokeWidth={1.4} />}
        {points.map((p, i) => {
          if (dense && p.status === 'go' && i !== points.length - 1) return null;
          const s = dense ? 6 : 8;
          return <g key={i}><Shape status={p.status} size={s} x={x(days[i]) - s / 2} y={y(p.value) - s / 2} /><title>{`Day ${days[i]}: ${p.value.toFixed(digits)}`}</title></g>;
        })}
      </g>
    </svg>
  );
}

// Insight Gap over time: each check is one vertical line from felt (hollow) to measured (solid).
export function GapChart({ gaps, dayOf, height = 220 }) {
  const W = 560, H = height, L = 34, R = 10, T = 10, B = 22;
  if (!gaps.length) return null;
  const days = gaps.map((g) => dayOf(g.t));
  const d0 = Math.min(...days), d1 = Math.max(...days, d0 + 1);
  const x = scaleLin(d0, d1, L + 6, W - R - 6), y = scaleLin(0, 100, H - B, T);
  const dense = gaps.length > 50, r = dense ? 2.2 : 4;
  const clip = useId(), shown = useAppear(1100);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={FLUID} role="img" aria-label="Felt against measured for every check in the mission">
      <clipPath id={clip}><rect x={0} y={0} width={L + (W - L) * shown} height={H} /></clipPath>
      <rect x={L} width={W - L - R} y={y(70)} height={y(30) - y(70)} fill={C.band} />
      {[0, 30, 50, 70, 100].map((v) => <text key={v} x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} style={FONT}>{v}</text>)}
      <line x1={L} x2={W - R} y1={y(50)} y2={y(50)} stroke={C.axis} strokeDasharray="2 4" />
      <text x={L} y={H - 6} fontSize={11} style={FONT}>day {d0}</text>
      <text x={W - R} y={H - 6} textAnchor="end" fontSize={11} style={FONT}>day {Math.max(...days)}</text>
      <g clipPath={`url(#${clip})`}>
      {gaps.map((g, i) => {
        const c = g.unaware ? C.nogo : g.status === 'go' ? C.quiet : C[g.status];
        return (
          <g key={i}>
            <line x1={x(days[i])} x2={x(days[i])} y1={y(g.felt)} y2={y(g.score)} stroke={c} strokeWidth={g.unaware ? 2 : 1.2} opacity={g.unaware ? 1 : 0.7} />
            <circle cx={x(days[i])} cy={y(g.score)} r={r} fill={c} />
            <circle cx={x(days[i])} cy={y(g.felt)} r={r} fill={C.surface} stroke={C.felt} strokeWidth={1.4} />
            <title>{`Day ${days[i]}: felt ${g.felt}, measured ${g.score}, gap ${g.gap > 0 ? '+' : ''}${g.gap}`}</title>
          </g>
        );
      })}
      </g>
    </svg>
  );
}

const SPOTS = [
  ['brain', 150, 42, 20, 'Brain', 150, 12, 'middle'], ['eyes', 150, 70, 12, 'Eyes', 194, 74, 'start'], ['heart', 162, 150, 22, 'Heart', 236, 136, 'start'],
  ['core', 150, 216, 24, 'Core', 62, 206, 'end'], ['hands', 84, 252, 18, 'Hands', 46, 292, 'middle'], ['frame', 118, 372, 22, 'Bone, muscle', 90, 410, 'end'],
  ['dose', 262, 336, 22, 'Radiation', 262, 376, 'middle'], ['cabin', 262, 420, 22, 'Cabin air', 262, 460, 'middle'],
];

// Outline figure with one hotspot per body system.
export function BodyFigure({ systems, selected, onSelect }) {
  const key = (id) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } };
  const [hover, setHover] = useState(null);
  const still = prefersReducedMotion();
  return (
    <svg viewBox="0 0 300 480" style={FLUID} role="group" aria-label="Body systems. Select one for details.">
      <circle cx={150} cy={56} r={34} fill={C.band} stroke={C.axis} />
      <path fill={C.band} stroke={C.axis} d="M136 88 H164 V102 C196 106 212 122 216 150 L226 250 C228 264 210 268 207 254 L196 176 V246 L202 436 C203 454 179 456 176 438 L150 300 L124 438 C121 456 97 454 98 436 L104 246 V176 L93 254 C90 268 72 264 74 250 L84 150 C88 122 104 106 136 102 Z" />
      {SPOTS.map(([id, cx, cy, r, label, lx, ly, anchor]) => {
        const st = systems[id].status, on = selected === id, grow = hover === id && !still;
        return (
          <g key={id} tabIndex={0} role="button" aria-label={`${label}: ${STATUS_WORD[st]}`} aria-pressed={on} onClick={() => onSelect(id)} onKeyDown={key(id)}
            onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(id)} onBlur={() => setHover(null)} style={{ cursor: 'pointer' }}>
            {st === 'nogo' && !still && (
              <circle cx={cx} cy={cy} r={10} fill="none" stroke={C.nogo} strokeWidth={2}>
                <animate attributeName="r" values={`10;${r + 12}`} dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <g style={{ transform: grow ? 'scale(1.25)' : 'scale(1)', transformOrigin: `${cx}px ${cy}px`, transition: 'transform var(--duration-fast) var(--ease-move)' }}>
              <circle cx={cx} cy={cy} r={r + 4} fill={on ? C.surface : 'transparent'} stroke={on ? C.felt : grow ? C.axis : 'transparent'} strokeWidth={2} />
              <Shape status={st} size={14} x={cx - 7} y={cy - 7} />
            </g>
            <text x={lx} y={ly} textAnchor={anchor} fontSize={12} style={{ ...FONT, fill: on ? 'var(--color-text-primary)' : C.label, fontWeight: on ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)' }}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// A signal crossing from Earth to Mars. The travelling dot is decoration; the time printed beside it is the real figure.
export function SignalPath({ label }) {
  const W = 600, H = 56, y = 22, a = 34, b = W - 34;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={FLUID} role="img" aria-label={label}>
      <line x1={a} x2={b} y1={y} y2={y} stroke={C.axis} strokeDasharray="2 7" strokeLinecap="round" strokeWidth={2} />
      {!prefersReducedMotion() && (
        <circle cy={y} r={4} fill={C.felt}>
          <animate attributeName="cx" values={`${a};${b}`} dur="4.2s" repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.6 1" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.9;1" dur="4.2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle cx={a - 14} cy={y} r={11} fill={C.felt} />
      <circle cx={b + 16} cy={y} r={8} fill={C.nogo} />
      <text x={a - 25} y={H - 4} fontSize={12} style={FONT}>Earth</text>
      <text x={b + 24} y={H - 4} textAnchor="end" fontSize={12} style={FONT}>Mars</text>
    </svg>
  );
}

export const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
export const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
