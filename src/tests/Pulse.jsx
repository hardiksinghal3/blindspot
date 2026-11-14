// Resting pulse: tap along with your pulse, or use the camera (screening grade, with a quality gate).
import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { pulseFromTaps, pulseFromSignal } from '../lib/scoring.js';
import { STAGE, INK, NUM } from './stage.js';

export const MIN_QUALITY = 0.3;
const NEED = 15, SECONDS = 30;
const VIDEO = { display: 'block', width: '100%', maxWidth: 420, borderRadius: 'var(--radius-container)', transform: 'scaleX(-1)', background: 'var(--color-background-muted)' };

function Tap({ onDone, onFail }) {
  const stage = useRef(null);
  const [count, setCount] = useState(0);
  useEffect(() => {
    const times = []; let over = false;
    const tap = (ts) => {
      if (over) return;
      times.push(ts); setCount(times.length);
      if (times.length >= NEED) {
        over = true;
        const r = pulseFromTaps(times);
        if (!(r.bpm >= 30 && r.bpm <= 220) || r.quality < MIN_QUALITY) return onFail('Those taps were too uneven to trust. Try again, or use the camera.');
        onDone({ bpm: r.bpm, quality: r.quality, method: 'tap' });
      }
    };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) tap(e.timeStamp); } };
    const ptr = (e) => { e.preventDefault(); tap(e.timeStamp); };
    const el = stage.current;
    window.addEventListener('keydown', key, true); el.addEventListener('pointerdown', ptr); el.focus();
    return () => { over = true; window.removeEventListener('keydown', key, true); el.removeEventListener('pointerdown', ptr); };
  }, []);
  return (
    <VStack gap={3}>
      <ProgressBar label="Beats counted" isLabelHidden variant="neutral" value={count} max={NEED} />
      <svg ref={stage} viewBox="0 0 640 240" style={STAGE} tabIndex={0} role="application" aria-label="Tap once per heartbeat">
        <text x={320} y={140} textAnchor="middle" fontSize={64} fill={INK} style={NUM}>{count}</text>
      </svg>
      <Text as="p" color="secondary" justify="center">Press Space or tap the area once for each beat you feel, {NEED} times.</Text>
    </VStack>
  );
}

function Camera({ onDone, onFail, onStop }) {
  const video = useRef(null);
  const [status, setStatus] = useState('Starting camera.');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let stream = null, raf = 0, stopped = false;
    const release = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera support');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
      } catch { if (!stopped) onFail('The camera is not available or permission was refused. Tap along instead.'); return; }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const v = video.current;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setStatus('Fill the frame with your face. Hold still and breathe normally.');
      const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 24;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      const samples = []; const t0 = performance.now(); let shown = -1;
      const frame = () => {
        if (stopped) return;
        const t = performance.now() - t0;
        if (v.videoWidth) {
          // Centre of the frame: cheeks and forehead when the face fills the view.
          g.drawImage(v, v.videoWidth * 0.3, v.videoHeight * 0.2, v.videoWidth * 0.4, v.videoHeight * 0.5, 0, 0, 32, 24);
          const px = g.getImageData(0, 0, 32, 24).data; let sum = 0;
          for (let i = 1; i < px.length; i += 4) sum += px[i];
          samples.push(sum / (px.length / 4));
        }
        const pct = Math.floor(Math.min(100, (t / (SECONDS * 1000)) * 100));
        if (pct !== shown) { shown = pct; setProgress(pct); }
        if (t >= SECONDS * 1000) {
          const r = pulseFromSignal(samples, samples.length / (t / 1000));
          release();
          if (!(r.quality >= MIN_QUALITY) || !Number.isFinite(r.bpm)) return onFail('The camera reading was not steady enough to trust, so it was thrown away. Try brighter light and hold still, or tap along.');
          return onDone({ bpm: r.bpm, quality: r.quality, method: 'camera' });
        }
        raf = requestAnimationFrame(frame);
      };
      frame();
    })();
    return release;
  }, []);
  return (
    <VStack gap={3}>
      <ProgressBar label="Measurement progress" isLabelHidden variant="neutral" value={progress} />
      <VStack gap={3} hAlign="center">
        <video ref={video} autoPlay playsInline muted style={VIDEO} />
        <Text as="p" color="secondary" justify="center">{status}</Text>
        <Button label="Stop and tap along instead" size="sm" onClick={onStop} />
      </VStack>
    </VStack>
  );
}

export default function Pulse({ onDone }) {
  const [mode, setMode] = useState('choose');
  const [note, setNote] = useState('');
  const fail = (why) => { setNote(why); setMode('choose'); };
  if (mode === 'tap') return <Tap onDone={onDone} onFail={fail} />;
  if (mode === 'camera') return <Camera onDone={onDone} onFail={fail} onStop={() => { setNote(''); setMode('tap'); }} />;
  return (
    <VStack gap={4}>
      {note && <Banner status="warning" title={note} />}
      <Text as="p" color="secondary">Sit still for a minute first. Then choose how to measure.</Text>
      <Grid columns={{ minWidth: 260, repeat: 'fit' }} gap={4}>
        <ClickableCard label="Tap along" onClick={() => setMode('tap')}>
          <VStack gap={1}><Heading level={3}>Tap along</Heading><Text as="p" color="secondary">Find your pulse at the wrist or neck and tap once per beat, {NEED} times.</Text></VStack>
        </ClickableCard>
        <ClickableCard label="Camera" onClick={() => setMode('camera')}>
          <VStack gap={1}><Heading level={3}>Camera</Heading><Text as="p" color="secondary">{SECONDS} seconds. Reads tiny colour changes in your face. Needs good light. Nothing is saved or sent.</Text></VStack>
        </ClickableCard>
      </Grid>
    </VStack>
  );
}
