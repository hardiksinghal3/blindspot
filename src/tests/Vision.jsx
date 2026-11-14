// Near vision: tumbling E staircase per eye at 50 cm, then an Amsler-style grid.
// Modelled on the vision checks NASA uses for SANS monitoring. Screening grade.
import { useEffect, useRef, useState } from 'react';
import { VStack, HStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Button } from '@astryxdesign/core/Button';
import { Slider } from '@astryxdesign/core/Slider';
import { getState, update } from '../lib/store.js';
import { LINE, BAD } from './stage.js';

const DIST_MM = 500, CARD_MM = 85.6, PER_LINE = 4, PASS = 3, START = 0.5, MAX = 1.0;
const DIRS = ['right', 'down', 'left', 'up'];
const ARROW = { ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left', ArrowUp: 'up' };
// A vision chart is black on near-white whatever the theme, so these two are fixed on purpose.
const PAPER = '#f2f2f2', PRINT = '#000';

function Calibrate({ onDone }) {
  const [ppm, setPpm] = useState(getState().settings.calibration?.pxPerMm || 3.78);
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <Heading level={3}>Set the screen size</Heading>
        <Text as="p" color="secondary">Hold a bank card or ID card against the screen. Drag until the box is exactly as wide as the card.</Text>
        <svg width={CARD_MM * ppm} height={120} role="img" aria-label="Box to match to your card">
          <rect x={1} y={1} width={CARD_MM * ppm - 2} height={118} rx={10} fill="var(--color-background-muted)" stroke={LINE} strokeWidth={2} />
        </svg>
        <Slider label="Card width on screen" isLabelHidden valueDisplay="none" value={ppm} min={2.2} max={7} step={0.01} onChange={setPpm} />
        <HStack><Button label="It matches" variant="primary" onClick={() => { update((s) => { s.settings.calibration = { pxPerMm: ppm }; }); onDone(ppm); }} /></HStack>
      </VStack>
    </Card>
  );
}

function Eye({ which, ppm, onDone }) {
  const canvas = useRef(null);
  const answerRef = useRef(null);
  const [info, setInfo] = useState('');

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    // Letters are drawn on whole device pixels only, so each stroke width u is one true line.
    const lmOf = (u) => { const mm = (5 * u) / dpr / ppm; const arcmin = 2 * Math.atan(mm / (2 * DIST_MM)) * (180 / Math.PI) * 60; return Math.round(Math.log10(arcmin / 5) * 100) / 100; };
    let maxU = 1; while (lmOf(maxU + 1) <= MAX) maxU++;
    const floor = lmOf(1);
    let u = 1; while (u < maxU && lmOf(u) < START) u++;
    let shown = 0, correct = 0, dir = null, best = null, goingUp = false, over = false;
    const draw = () => {
      const cv = canvas.current, s = 5 * u, box = Math.max(140, Math.ceil((s / dpr) * 2.2));
      cv.width = Math.round(box * dpr); cv.height = Math.round(box * dpr); cv.style.width = `${box}px`; cv.style.height = `${box}px`;
      const g = cv.getContext('2d'), x0 = Math.round((cv.width - s) / 2), y0 = Math.round((cv.height - s) / 2);
      g.fillStyle = PAPER; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = PRINT;
      if (dir === 'right' || dir === 'left') { g.fillRect(dir === 'right' ? x0 : x0 + 4 * u, y0, u, s); for (let k = 0; k < 3; k++) g.fillRect(x0, y0 + 2 * k * u, s, u); }
      else { g.fillRect(x0, dir === 'down' ? y0 : y0 + 4 * u, s, u); for (let k = 0; k < 3; k++) g.fillRect(x0 + 2 * k * u, y0, u, s); }
      setInfo(`${which === 'right' ? 'Right' : 'Left'} eye · line ${lmOf(u).toFixed(2)} logMAR · ${shown + 1} of ${PER_LINE}`);
    };
    const next = () => { let d; do { d = DIRS[Math.floor(Math.random() * 4)]; } while (d === dir && Math.random() < 0.7); dir = d; canvas.current.dataset.dir = d; draw(); };
    const finish = (value) => { over = true; onDone(value, floor); };
    const answer = (a) => {
      if (over) return;
      if (a === dir) correct++;
      shown++;
      if (shown < PER_LINE) return next();
      const passed = correct >= PASS;
      shown = 0; correct = 0;
      if (passed) {
        best = lmOf(u);
        if (goingUp || u <= 1) return finish(best);
        u--;
      } else {
        if (best != null) return finish(best);
        if (u >= maxU) return finish(1.1);
        goingUp = true; u++;
      }
      next();
    };
    answerRef.current = answer;
    const key = (e) => { if (ARROW[e.key]) { e.preventDefault(); answer(ARROW[e.key]); } };
    window.addEventListener('keydown', key);
    next();
    return () => { over = true; window.removeEventListener('keydown', key); };
  }, [which, ppm]);

  const btn = (d, label) => <Button label={label} aria-label={`Legs point ${d}`} onClick={() => answerRef.current(d)} />;
  return (
    <VStack gap={3} hAlign="center">
      <canvas ref={canvas} aria-hidden="true" />
      <HStack gap={2} hAlign="center">{btn('left', '←')}{btn('up', '↑')}{btn('down', '↓')}{btn('right', '→')}</HStack>
      <Text type="supporting" hasTabularNumbers>{info}</Text>
    </VStack>
  );
}

function Grid({ which, ppm, marked, toggle }) {
  const n = 10, cell = Math.min(34, (100 * ppm) / n), size = n * cell;
  return (
    <VStack gap={2} hAlign="center">
      <Text type="label">{which === 'right' ? 'Right eye' : 'Left eye'}</Text>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="group" aria-label={`${which} eye grid`}>
        <rect width={size} height={size} fill={PAPER} />
        {Array.from({ length: n * n }, (_, id) => (
          <rect key={id} x={(id % n) * cell} y={Math.floor(id / n) * cell} width={cell} height={cell} fill={marked.has(id) ? BAD : 'transparent'} fillOpacity={0.55} stroke={PRINT} strokeWidth={1} style={{ cursor: 'pointer' }} onClick={() => toggle(id)} />
        ))}
        <circle cx={size / 2} cy={size / 2} r={4} fill={PRINT} pointerEvents="none" />
      </svg>
    </VStack>
  );
}

export default function Vision({ onDone }) {
  const saved = getState().settings.calibration;
  const [step, setStep] = useState(saved ? 'position' : 'calibrate');
  const [ppm, setPpm] = useState(saved ? saved.pxPerMm : null);
  const result = useRef({ right: null, left: null, floor: null, amsler: 0 });
  const [marked, setMarked] = useState({ right: new Set(), left: new Set() });
  const toggle = (which) => (id) => setMarked((m) => { const s = new Set(m[which]); s.has(id) ? s.delete(id) : s.add(id); return { ...m, [which]: s }; });

  if (step === 'calibrate') return <Calibrate onDone={(v) => { setPpm(v); setStep('position'); }} />;
  if (step === 'position') {
    return (
      <Card padding={5}>
        <VStack gap={4}>
          <Heading level={3}>Get in position</Heading>
          <Text as="p">Sit with your eyes 50 cm from the screen, about one arm's length. Wear the glasses or lenses you normally use for a screen.</Text>
          <Text as="p" color="secondary">An E will appear. Press the arrow key, or the button, for the direction its legs point. Guess if unsure.</Text>
          <HStack gap={3} wrap="wrap">
            <Button label="Cover your LEFT eye and start" variant="primary" onClick={() => setStep('right')} />
            <Button label="Redo screen size" variant="ghost" onClick={() => setStep('calibrate')} />
          </HStack>
        </VStack>
      </Card>
    );
  }
  if (step === 'right' || step === 'left') {
    return <Eye key={step} which={step} ppm={ppm} onDone={(value, floor) => { result.current[step] = value; result.current.floor = floor; setStep(step === 'right' ? 'between' : 'amsler'); }} />;
  }
  if (step === 'between') {
    return (
      <Card padding={5}>
        <VStack gap={4}>
          <Heading level={3}>Right eye done</Heading>
          <HStack><Button label="Cover your RIGHT eye and continue" variant="primary" onClick={() => setStep('left')} /></HStack>
        </VStack>
      </Card>
    );
  }
  return (
    <Card padding={5}>
      <VStack gap={4}>
        <Heading level={3}>Grid check</Heading>
        <Text as="p">Cover one eye and stare at the centre dot of that eye's grid. Without moving your eye, notice whether any lines look wavy, blurred or missing, and click those squares. Then do the other eye.</Text>
        <HStack gap={8} hAlign="center" wrap="wrap">
          <Grid which="right" ppm={ppm} marked={marked.right} toggle={toggle('right')} />
          <Grid which="left" ppm={ppm} marked={marked.left} toggle={toggle('left')} />
        </HStack>
        <HStack><Button label="Done. Score my vision" variant="primary" onClick={() => onDone({ ...result.current, amsler: marked.right.size + marked.left.size })} /></HStack>
      </VStack>
    </Card>
  );
}
