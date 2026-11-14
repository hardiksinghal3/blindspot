// Reaction test modelled on the 3-minute PVT-B: random 1-4 s gaps (including 1 s of feedback),
// a running millisecond counter as the stimulus, lapses at 355 ms or slower.
import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { pvtMetrics, FALSE_START_MS } from '../lib/scoring.js';
import { STAGE, INK, LINE, SURFACE, WARN, BAD, NUM } from './stage.js';

const TIMEOUT_MS = 30000;

export default function Pvt({ seconds, onDone }) {
  const stage = useRef(null), counter = useRef(null), box = useRef(null);
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState(0);
  const finishRef = useRef(onDone);
  finishRef.current = onDone;

  useEffect(() => {
    const trials = [];
    let phase = 'wait', onset = 0, timer = null, raf = 0, done = false;
    const t0 = performance.now();
    const elapsed = () => performance.now() - t0;
    const show = (text, stroke) => { counter.current.textContent = text; box.current.setAttribute('stroke', stroke); };

    const schedule = (first) => {
      phase = 'wait';
      show('', BAD);
      const gap = first ? 1500 + Math.random() * 2000 : Math.random() * 3000; // plus the 1 s of feedback already shown
      timer = setTimeout(start, gap);
    };
    const start = () => {
      raf = requestAnimationFrame((ts) => {
        onset = ts; phase = 'go';
        const tick = () => {
          if (phase !== 'go') return;
          const ms = performance.now() - onset;
          counter.current.textContent = Math.max(0, Math.round(ms));
          if (ms > TIMEOUT_MS) return respond(onset + TIMEOUT_MS);
          raf = requestAnimationFrame(tick);
        };
        tick();
      });
    };
    const feedback = (text, stroke) => {
      phase = 'feedback';
      show(text, stroke);
      setProgress(Math.min(100, (elapsed() / (seconds * 1000)) * 100));
      timer = setTimeout(() => (elapsed() >= seconds * 1000 ? finish() : schedule(false)), 1000);
    };
    const respond = (ts) => {
      if (done) return;
      if (phase === 'go') {
        cancelAnimationFrame(raf);
        const rt = Math.round(ts - onset);
        if (rt < FALSE_START_MS) { trials.push({ rt: null, falseStart: true }); return feedback('Too soon', WARN); }
        trials.push({ rt, falseStart: false });
        setCount(trials.filter((t) => !t.falseStart).length);
        feedback(String(rt), LINE);
      } else if (phase === 'wait') {
        clearTimeout(timer); cancelAnimationFrame(raf);
        trials.push({ rt: null, falseStart: true });
        feedback('Too soon', WARN);
      }
    };
    const stop = () => { clearTimeout(timer); cancelAnimationFrame(raf); window.removeEventListener('keydown', key, true); el.removeEventListener('pointerdown', tap); };
    const finish = () => { if (done) return; done = true; stop(); finishRef.current({ trials, metrics: pvtMetrics(trials), seconds }); };
    const key = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) respond(e.timeStamp); } };
    const tap = (e) => { e.preventDefault(); respond(e.timeStamp); };
    const el = stage.current;
    window.addEventListener('keydown', key, true);
    el.addEventListener('pointerdown', tap);
    el.focus();
    schedule(true);
    return () => { done = true; stop(); };
  }, [seconds]);

  return (
    <VStack gap={3}>
      <ProgressBar label="Test progress" isLabelHidden value={progress} variant="neutral" />
      <svg ref={stage} viewBox="0 0 640 300" style={STAGE} tabIndex={0} role="application" aria-label="Reaction test. Press space when the counter starts.">
        <rect ref={box} x={190} y={80} width={260} height={140} rx={12} fill={SURFACE} stroke={BAD} strokeWidth={4} />
        <text ref={counter} x={320} y={170} textAnchor="middle" fontSize={56} fill={INK} style={NUM} aria-live="off" />
      </svg>
      <Text as="p" color="secondary" justify="center">{count ? `${count} responses` : 'Press Space or tap the box area the moment the numbers start. Get ready.'}</Text>
    </VStack>
  );
}
