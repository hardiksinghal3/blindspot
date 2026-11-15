// Resting pulse: tap along with your pulse, or use the camera (screening grade, with a quality gate).
import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { pulseFromTaps, pulseFromRgb, CAMERA_CLEAR } from '../lib/scoring.js';
import { STAGE, INK, NUM } from './stage.js';

export const MIN_QUALITY = 0.3;
const NEED = 15, SECONDS = 30, EXTRA = 15;
const SAMPLE_W = 96, SAMPLE_H = 84;
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
      <Text as="p" color="secondary" justify="center">{count === 0 ? 'Take your time finding your pulse. Nothing is timed until your first tap.' : `Keep going: once for each beat you feel, ${NEED} times.`}</Text>
      <Text as="p" type="supporting" justify="center">Press Space or tap the area above.</Text>
    </VStack>
  );
}

const AIM = {
  face: { hold: 'Fill the picture with your face. Hold still and breathe normally.', closer: 'Move closer so your face fills the picture.' },
  palm: { hold: 'Hold your palm flat, close to the camera, so it fills the picture. Rest your elbow on the desk.', closer: 'Bring your palm closer so it fills the picture.' },
};
const DARK = 'Too dark. Turn towards a window or a lamp.';

// Mean colour of the skin in the middle of the picture, plus whether the frame was usable.
function readFrame(g, v) {
  g.drawImage(v, v.videoWidth * 0.2, v.videoHeight * 0.15, v.videoWidth * 0.6, v.videoHeight * 0.7, 0, 0, SAMPLE_W, SAMPLE_H);
  const px = g.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data, all = [0, 0, 0], skin = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], gr = px[i + 1], b = px[i + 2];
    all[0] += r; all[1] += gr; all[2] += b;
    if (r > 50 && r < 250 && r > gr && r > b) { skin[0] += r; skin[1] += gr; skin[2] += b; count++; }
  }
  const total = px.length / 4, hasSkin = count / total >= 0.2;
  return { rgb: hasSkin ? skin.map((x) => x / count) : all.map((x) => x / total), hasSkin, dark: all[1] / total < 40 };
}

function Camera({ aim, onDone, onFail, onStop }) {
  const video = useRef(null);
  const [status, setStatus] = useState('Starting camera.');
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let stream = null, raf = 0, stopped = false;
    const release = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera support');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
      } catch { if (!stopped) onFail('The camera is not available or permission was refused. Tap along instead.'); return; }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const v = video.current;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setStatus(AIM[aim].hold);
      const canvas = document.createElement('canvas'); canvas.width = SAMPLE_W; canvas.height = SAMPLE_H;
      const g = canvas.getContext('2d', { willReadFrequently: true });
      const frames = [], times = [], flags = [];
      const t0 = performance.now(); let limit = SECONDS, shown = -1, lastSecond = 0;
      // The newest SECONDS of the recording, and how much of it was dark or had no skin in view.
      const recent = (t, secs) => {
        const from = times.findIndex((x) => x >= t - secs * 1000), cut = from < 0 ? 0 : from, f = flags.slice(cut);
        return { frames: frames.slice(cut), times: times.slice(cut), dark: f.filter((x) => x.dark).length / (f.length || 1), away: f.filter((x) => !x.hasSkin).length / (f.length || 1) };
      };
      const frame = () => {
        if (stopped) return;
        const t = performance.now() - t0;
        if (v.videoWidth) { const f = readFrame(g, v); frames.push(f.rgb); times.push(t); flags.push(f); }
        const pct = Math.floor(Math.min(100, (t / (limit * 1000)) * 100));
        if (pct !== shown) { shown = pct; setProgress(pct); }
        const second = Math.floor(t / 1000);
        if (second !== lastSecond && t < limit * 1000) {
          lastSecond = second;
          const now = recent(t, 3);
          if (now.dark > 0.5) setStatus(DARK);
          else if (now.away > 0.5) setStatus(AIM[aim].closer);
          else if (limit > SECONDS) setStatus(`The signal is weak, so this is measuring ${EXTRA} seconds more. Keep still.`);
          else if (second < 10) setStatus(AIM[aim].hold);
          else setStatus(pulseFromRgb(frames, times).ok ? 'Pulse signal found. Keep still.' : 'Looking for your pulse. Keep still.');
        }
        if (t >= limit * 1000) {
          const w = recent(t, SECONDS), r = pulseFromRgb(w.frames, w.times);
          if (r.ok) { release(); return onDone({ bpm: r.bpm, quality: r.quality, method: aim }); }
          if (limit === SECONDS && frames.length) limit = SECONDS + EXTRA;
          else {
            release();
            const why = !frames.length ? 'The camera sent no picture.'
              : w.dark > 0.5 ? 'The picture was too dark.'
              : w.away > 0.5 ? `Your ${aim} was not filling the picture.`
              : `No steady pulse signal was found (signal quality ${Math.round(r.quality * 100)} %, and ${Math.round(CAMERA_CLEAR * 100)} % is needed).`;
            return onFail(`${why} No number is shown rather than a guess. Bright, even light on the skin helps most. Try again, try the other camera option, or tap along.`);
          }
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
  if (mode === 'face' || mode === 'palm') return <Camera aim={mode} onDone={onDone} onFail={fail} onStop={() => { setNote(''); setMode('tap'); }} />;
  return (
    <VStack gap={4}>
      {note && <Banner status="warning" title={note} />}
      <Text as="p" color="secondary">Sit still for a minute first. Then choose how to measure.</Text>
      <Grid columns={{ minWidth: 220, repeat: 'fit' }} gap={4}>
        <ClickableCard label="Tap along" onClick={() => setMode('tap')}>
          <VStack gap={1}><Heading level={3}>Tap along</Heading><Text as="p" color="secondary">Find your pulse at the wrist or neck and tap once per beat, {NEED} times.</Text></VStack>
        </ClickableCard>
        <ClickableCard label="Camera: face" onClick={() => setMode('face')}>
          <VStack gap={1}><Heading level={3}>Camera: face</Heading><Text as="p" color="secondary">About {SECONDS} seconds. Reads tiny colour changes in your skin. Needs good light. Nothing is saved or sent.</Text></VStack>
        </ClickableCard>
        <ClickableCard label="Camera: palm" onClick={() => setMode('palm')}>
          <VStack gap={1}><Heading level={3}>Camera: palm</Heading><Text as="p" color="secondary">About {SECONDS} seconds. Hold your palm flat to the camera with your elbow on the desk. Nothing is saved or sent.</Text></VStack>
        </ClickableCard>
      </Grid>
    </VStack>
  );
}
