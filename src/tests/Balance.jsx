// Five sit-to-stands against the clock: a gravity-only screening test of legs and balance.
// A prototype in the spirit of NASA's post-landing Field Test; it is not one of that study's scored tasks.
import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { List, ListItem } from '@astryxdesign/core/List';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { STAGE, INK, DIM, NUM, BODY } from './stage.js';

export const REPS = 5, MIN_SECONDS = 3, MAX_SECONDS = 60;
const SAFETY = [
  'Use a sturdy chair without wheels, with its back against a wall.',
  'Keep a table, rail or crewmate within reach.',
  'Stop at once if you feel dizzy, faint or unsteady.',
  'Skip this test in weightlessness. It only means something under gravity.',
];

export default function Balance({ onDone }) {
  const stage = useRef(null);
  const [phase, setPhase] = useState('ready');
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (phase === 'ready') return undefined;
    let start = 0, raf = 0, over = false;
    const tick = () => { if (start && !over) { setShown((performance.now() - start) / 1000); raf = requestAnimationFrame(tick); } };
    const press = (ts) => {
      if (over) return;
      if (!start) { start = ts; setPhase('run'); tick(); return; }
      if (ts - start < 1000) return; // a double press on Start must not end the test
      over = true; cancelAnimationFrame(raf);
      onDone({ seconds: (ts - start) / 1000 });
    };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(performance.now()); } };
    const ptr = (e) => { e.preventDefault(); press(performance.now()); };
    const el = stage.current;
    window.addEventListener('keydown', key, true); el.addEventListener('pointerdown', ptr); el.focus();
    return () => { over = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', key, true); el.removeEventListener('pointerdown', ptr); };
  }, [phase === 'ready']);

  if (phase === 'ready') {
    return (
      <Card padding={5}>
        <VStack gap={4}>
          <Banner status="warning" title="Do this only where a fall cannot hurt you" />
          <List>{SAFETY.map((s) => <ListItem key={s} label={<Text as="p">{s}</Text>} />)}</List>
          <Text as="p" color="secondary">Sit with your arms crossed on your chest and the device within reach. On the next screen, press Space or tap to start the clock, stand up fully and sit down {REPS} times, then press Space or tap again the moment you sit for the fifth time.</Text>
          <Button label="I am seated and ready" variant="primary" size="lg" onClick={() => setPhase('wait')} />
        </VStack>
      </Card>
    );
  }
  const running = phase === 'run';
  return (
    <VStack gap={3}>
      <svg ref={stage} viewBox="0 0 640 240" style={STAGE} tabIndex={0} role="application" aria-label={running ? 'Press Space or tap when you sit for the fifth time' : 'Press Space or tap to start the clock'}>
        <text x={320} y={130} textAnchor="middle" fontSize={64} fill={INK} style={NUM}>{running ? shown.toFixed(1) : '0.0'}</text>
        <text x={320} y={180} textAnchor="middle" fontSize={18} fill={DIM} style={BODY}>{running ? `Stand and sit ${REPS} times, then press Space or tap` : 'Press Space or tap, then stand'}</text>
      </svg>
      <Text as="p" color="secondary" justify="center">{running ? 'Stand up fully each time. Do not use your hands unless you need them to stay safe.' : 'Nothing is timed until you press Space or tap.'}</Text>
    </VStack>
  );
}
