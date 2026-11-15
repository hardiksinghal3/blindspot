// Pointing test: tap highlighted targets around a ring. The next target is random, at least MIN_HOP places away,
// so it cannot be anticipated. Each move is scored on its own distance, so throughput stays comparable.
// Modelled on the pointing task of NASA's Fine Motor Skills battery; scored as Fitts throughput.
import { useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { pointingMetrics } from '../lib/scoring.js';
import { STAGE, LINE, SURFACE, ACCENT } from './stage.js';

const N = 11, MIN_HOP = 3, SIZE = 460, C = SIZE / 2;
const anyTarget = () => Math.floor(Math.random() * N);
function nextTarget(from) {
  const far = [...Array(N).keys()].filter((i) => Math.min((i - from + N) % N, (from - i + N) % N) >= MIN_HOP);
  return far[Math.floor(Math.random() * far.length)];
}
const ROUNDS = [{ radius: 150, width: 56 }, { radius: 185, width: 30 }];
const pos = (i, r) => [C + r * Math.sin((2 * Math.PI * i) / N), C - r * Math.cos((2 * Math.PI * i) / N)];

export default function Motor({ onDone }) {
  const svg = useRef(null);
  const [first] = useState(anyTarget);
  const run = useRef({ taps: [], round: 0, idx: first, prev: first, count: 0, last: 0, done: false });
  const [view, setView] = useState({ round: 0, idx: first, count: 0 });
  const { radius, width } = ROUNDS[view.round];

  const down = (e) => {
    const s = run.current;
    if (s.done) return;
    e.preventDefault();
    const rect = svg.current.getBoundingClientRect(), k = SIZE / rect.width;
    const px = (e.clientX - rect.left) * k, py = (e.clientY - rect.top) * k;
    const r = ROUNDS[s.round];
    const [tx, ty] = pos(s.idx, r.radius);
    const hit = Math.hypot(px - tx, py - ty) <= r.width / 2;
    if (s.count === 0 && !hit) return; // the first tap of a round must land to start the clock
    if (s.count > 0) {
      const [sx, sy] = pos(s.prev, r.radius);
      s.taps.push({ dist: Math.hypot(tx - sx, ty - sy), width: r.width, time: e.timeStamp - s.last, hit });
    }
    s.last = e.timeStamp; s.count++; s.prev = s.idx; s.idx = nextTarget(s.idx);
    if (s.count > N) {
      s.round++; s.count = 0; s.idx = anyTarget(); s.prev = s.idx;
      if (s.round >= ROUNDS.length) { s.done = true; return onDone({ taps: s.taps, metrics: pointingMetrics(s.taps) }); }
    }
    setView({ round: s.round, idx: s.idx, count: s.count });
  };

  return (
    <VStack gap={3}>
      <ProgressBar label="Test progress" isLabelHidden variant="neutral" value={((view.round * (N + 1) + view.count) / (ROUNDS.length * (N + 1))) * 100} />
      <VStack hAlign="center">
        <svg ref={svg} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ ...STAGE, maxWidth: SIZE, cursor: 'crosshair' }} role="application" aria-label="Pointing test. Tap each highlighted target." onPointerDown={down}>
          {Array.from({ length: N }, (_, i) => {
            const [x, y] = pos(i, radius), on = i === view.idx;
            return <circle key={i} cx={x} cy={y} r={width / 2} fill={on ? ACCENT : SURFACE} stroke={on ? ACCENT : LINE} strokeWidth={1.5} />;
          })}
        </svg>
      </VStack>
      <Text as="p" color="secondary" justify="center">{view.round ? 'Now smaller targets.' : 'Tap the filled target. Be fast and accurate.'}</Text>
    </VStack>
  );
}
