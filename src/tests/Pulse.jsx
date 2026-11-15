// Resting pulse: tap along with your pulse, or use the camera (screening grade, with a quality gate).
import { useEffect, useRef, useState } from 'react';
import { VStack } from '@astryxdesign/core/Layout';
import { Text, Heading } from '@astryxdesign/core/Text';
import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Button } from '@astryxdesign/core/Button';
import { Banner } from '@astryxdesign/core/Banner';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { pulseFromTaps, pulseFromRgb, skinRegion, regionRgb, SKIN_CELL, CAMERA_CLEAR } from '../lib/scoring.js';
import { loadHandFinder, palmShape, shapeArea, MIN_PALM_AREA } from '../lib/hand.js';
import { STAGE, INK, NUM } from './stage.js';

export const MIN_QUALITY = 0.3;
const NEED = 15, SECONDS = 30, EXTRA = 15;
const SAMPLE_W = 320, PATCH = 192;
// Asks for full HD at 30 frames per second; the camera gives the nearest it supports and the screen shows what arrived.
const CAMERA = { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };

// Mean colour of the video inside an outline (points as shares of the picture), read at up to PATCH pixels across.
function readShape(g, v, shape) {
  const W = v.videoWidth, H = v.videoHeight, xs = shape.map((p) => p.x * W), ys = shape.map((p) => p.y * H);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const bw = Math.min(W, Math.ceil(Math.max(...xs))) - x0, bh = Math.min(H, Math.ceil(Math.max(...ys))) - y0;
  if (bw < 12 || bh < 12) return null;
  const k = Math.min(1, PATCH / Math.max(bw, bh)), cw = Math.max(1, Math.round(bw * k)), ch = Math.max(1, Math.round(bh * k));
  g.clearRect(0, 0, PATCH, PATCH);
  g.save(); g.beginPath();
  shape.forEach((p, i) => g[i ? 'lineTo' : 'moveTo']((p.x * W - x0) * k, (p.y * H - y0) * k));
  g.closePath(); g.clip(); g.drawImage(v, x0, y0, bw, bh, 0, 0, cw, ch); g.restore();
  const d = g.getImageData(0, 0, cw, ch).data;
  let r = 0, gr = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 255) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
  return n < 40 ? null : { rgb: [r / n, gr / n, b / n], light: gr / n, pixels: Math.round(n / (k * k)) };
}
const VIDEO = { display: 'block', width: '100%', maxWidth: 480, borderRadius: 'var(--radius-container)', background: 'var(--color-background-muted)' };
// Safari pauses a video that is not rendered, so the source video stays in the page at one pixel.
const HIDDEN = { position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' };

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
  face: { name: 'face', find: 'Step 1 of 2: finding your face. Sit close and look at the camera.', hold: 'Face found. Hold still and breathe normally.', share: 0.06 },
  palm: { name: 'palm', find: 'Step 1 of 2: finding your palm. Hold it flat, close to the camera, elbow on the desk.', hold: 'Palm found. Keep it inside the box.', share: 0.12 },
};
const DARK = 'Too dark. Turn towards a window or a lamp.';
const LOCK_MS = 1200, GIVE_UP_MS = 8000, LOST_MS = 1000, MAX_RESTARTS = 3;
const NO_PALM_MS = 45000, PALM_RESTARTS = 5, BLINK_MS = 300;

function Camera({ aim, onDone, onFail, onStop }) {
  const video = useRef(null), view = useRef(null);
  const [status, setStatus] = useState('Starting camera.');
  const [left, setLeft] = useState(null);
  const [total, setTotal] = useState(SECONDS);
  const [feed, setFeed] = useState('');
  useEffect(() => {
    let stream = null, raf = 0, stopped = false;
    const release = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera support');
        stream = await navigator.mediaDevices.getUserMedia({ video: CAMERA, audio: false });
      } catch { if (!stopped) onFail('The camera is not available or permission was refused. Tap along instead.'); return; }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const v = video.current, a = AIM[aim];
      v.srcObject = stream;
      await v.play().catch(() => {});
      // Palm mode tracks the hand with a landmark model. If the model cannot load, it falls back to skin colour.
      let finder = null;
      if (aim === 'palm') {
        setStatus('Loading the hand tracker. The first time takes a few seconds.');
        finder = await loadHandFinder().catch(() => null);
        if (stopped) return;
      }
      const tracked = !!finder;
      setStatus(aim === 'palm' && !tracked ? `The hand tracker could not load, so skin colour is used instead. ${a.find}` : a.find);
      const patch = document.createElement('canvas'); patch.width = PATCH; patch.height = PATCH;
      const pg = patch.getContext('2d', { willReadFrequently: true });
      let shape = null, seenAt = 0, heldSince = 0, tick = 0, small = false, pixels = 0;
      const outline = () => {
        const W = view.current.width, H = view.current.height;
        out.lineWidth = 4; out.strokeStyle = accent; out.beginPath();
        shape.forEach((p, i) => out[i ? 'lineTo' : 'moveTo']((1 - p.x) * W, p.y * H));
        out.closePath(); out.stroke();
      };
      const canvas = document.createElement('canvas');
      const g = canvas.getContext('2d', { willReadFrequently: true });
      const out = view.current.getContext('2d');
      view.current.style.color = 'var(--color-accent)';
      const accent = getComputedStyle(view.current).color;
      let w = 0, h = 0, roi = null, anchor = null, since = 0, lostSince = 0, restarts = 0, guessed = false;
      let frames = [], times = [], flags = [];
      const began = performance.now(); let t0 = 0, limit = SECONDS, shown = -1, lastSecond = -1, told = false;
      const recent = (t, secs) => {
        const from = times.findIndex((x) => x >= t - secs * 1000), cut = from < 0 ? 0 : from, f = flags.slice(cut);
        return { frames: frames.slice(cut), times: times.slice(cut), dark: f.filter((x) => x.dark).length / (f.length || 1), away: f.filter((x) => x.away).length / (f.length || 1) };
      };
      const lock = (region, now) => { roi = region; t0 = now; frames = []; times = []; flags = []; limit = SECONDS; shown = -1; lastSecond = -1; lostSince = 0; setTotal(SECONDS); };
      const frame = () => {
        if (stopped) return;
        const now = performance.now();
        if (!v.videoWidth) { raf = requestAnimationFrame(frame); return; }
        if (!w) {
          w = SAMPLE_W; h = Math.floor((SAMPLE_W * v.videoHeight) / v.videoWidth / SKIN_CELL) * SKIN_CELL;
          canvas.width = w; canvas.height = h; view.current.width = w * 2; view.current.height = h * 2;
          g.imageSmoothingQuality = 'high';
        }
        if (!told) {
          const set = stream.getVideoTracks()[0]?.getSettings?.() || {};
          setFeed(`Camera picture: ${v.videoWidth} × ${v.videoHeight}${set.frameRate ? `, ${Math.round(set.frameRate)} frames per second` : ''}`);
          told = true;
        }
        out.save(); out.scale(-1, 1); out.drawImage(v, -view.current.width, 0, view.current.width, view.current.height); out.restore();
        if (tracked) {
          // Look for the hand on every second frame; the outline in between is the last one found.
          if (tick++ % 2 === 0 || !shape) {
            let found = null;
            try { found = finder.detectForVideo(v, now).landmarks[0]; } catch { found = null; }
            const next = found ? palmShape(found) : null;
            small = !!next && shapeArea(next) < MIN_PALM_AREA;
            if (next && !small) { shape = next; seenAt = now; } else if (now - seenAt > BLINK_MS) shape = null;
          }
          if (shape) outline();
        }
        const px = tracked ? null : (g.drawImage(v, 0, 0, w, h), g.getImageData(0, 0, w, h).data);

        if (!roi && tracked) {
          if (!shape) heldSince = 0; else if (!heldSince) heldSince = now;
          if (heldSince && now - heldSince >= LOCK_MS) { lock({ tracked: true }, now); setStatus('Palm found and followed. Keep it open and still.'); }
          else if (now - Math.max(began, seenAt) > NO_PALM_MS) {
            release();
            return onFail('No palm was found in the picture, so nothing was measured. Hold your open hand up to the camera with the fingers spread, in good light. Or tap along.');
          } else {
            const second = Math.floor((now - began) / 1000);
            if (second !== lastSecond) { lastSecond = second; setStatus(small ? 'Move your palm closer to the camera.' : shape ? 'Palm found. Hold it still.' : restarts ? 'Your palm left the picture. Hold it up again to start over.' : a.find); }
          }
        } else if (!roi) {
          const found = skinRegion(px, w, h);
          const big = found && found.share >= a.share;
          if (big && anchor && Math.hypot(found.x - anchor.x, found.y - anchor.y) < 0.08) { if (now - since >= LOCK_MS) { guessed = false; lock(found, now); setStatus(a.hold); } }
          else { anchor = big ? found : null; since = now; }
          if (!roi && now - began > GIVE_UP_MS && now - since < LOCK_MS / 2 && !restarts) {
            // Nothing skin-coloured held still: read the middle of the picture, as a last resort.
            const cols = w / SKIN_CELL, rows = h / SKIN_CELL, cells = [];
            for (let cy = Math.floor(rows * 0.15); cy < rows * 0.85; cy++) for (let cx = Math.floor(cols * 0.2); cx < cols * 0.8; cx++) cells.push(cy * cols + cx);
            guessed = true; lock({ cells, cols, box: [0.2, 0.15, 0.8, 0.85] }, now);
            setStatus(`Your ${a.name} could not be picked out, so the middle of the picture is being read. Fill the box with your ${a.name}.`);
          }
          const second = Math.floor((now - began) / 1000);
          if (!roi && second !== lastSecond) { lastSecond = second; setStatus(regionRgb(px, w, [...Array((w / SKIN_CELL) * (h / SKIN_CELL)).keys()], w / SKIN_CELL).light < 40 ? DARK : restarts ? `Your ${a.name} left the box. Hold it still to start again.` : a.find); }
        } else {
          const t = now - t0;
          let away = false;
          if (tracked) {
            // Only frames where the palm is in view are read. If it stays away, the measurement starts over.
            const f = shape && readShape(pg, v, shape);
            if (f) { frames.push(f.rgb); times.push(t); flags.push({ away: false, dark: f.light < 40 }); pixels = f.pixels; }
            else if (now - seenAt > LOST_MS) {
              if (++restarts > PALM_RESTARTS) { release(); return onFail('Your palm kept leaving the picture, so no number is shown. Rest your elbow on the desk and try again, or tap along.'); }
              roi = null; heldSince = 0; lastSecond = -1; setLeft(null); raf = requestAnimationFrame(frame); return;
            }
          } else {
            const f = regionRgb(px, w, roi.cells, roi.cols), dark = f.light < 40;
            away = f.share < 0.5;
            frames.push(f.rgb); times.push(t); flags.push({ away, dark });
            const [x0, y0, x1, y1] = roi.box, W = view.current.width, H = view.current.height;
            out.lineWidth = 4; out.strokeStyle = accent; out.strokeRect((1 - x1) * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H);
          }
          if (tracked) { /* handled above */ } else if (away && !guessed && restarts < MAX_RESTARTS) {
            if (!lostSince) lostSince = now;
            else if (now - lostSince > LOST_MS) { roi = null; anchor = null; since = now; restarts++; lastSecond = -1; setLeft(null); raf = requestAnimationFrame(frame); return; }
          } else lostSince = 0;
          const remain = Math.max(0, Math.ceil(limit - t / 1000));
          if (remain !== shown) { shown = remain; setLeft(remain); }
          const second = Math.floor(t / 1000);
          if (second !== lastSecond && t < limit * 1000) {
            lastSecond = second;
            const last = recent(t, 3);
            if (last.dark > 0.5) setStatus(DARK);
            else if (last.away > 0.5) setStatus(`Fill the box with your ${a.name}.`);
            else if (limit > SECONDS) setStatus(`The signal is weak, so this is measuring ${EXTRA} seconds more. Keep still.`);
            else if (second >= 10) setStatus(pulseFromRgb(frames, times).ok ? 'Pulse signal found. Keep still.' : 'Looking for your pulse. Keep still.');
            else if (second >= 2 && !guessed) setStatus(tracked ? `Palm followed: reading about ${pixels.toLocaleString('en-GB')} pixels of skin. Keep still.` : a.hold);
          }
          if (t >= limit * 1000) {
            const win = recent(t, SECONDS), r = pulseFromRgb(win.frames, win.times);
            if (r.ok) { release(); return onDone({ bpm: r.bpm, quality: r.quality, method: aim }); }
            if (limit === SECONDS) { limit = SECONDS + EXTRA; setTotal(limit); }
            else {
              release();
              const why = win.dark > 0.5 ? 'The picture was too dark.'
                : win.away > 0.5 ? `Your ${a.name} was not filling the box.`
                : `No steady pulse signal was found (signal quality ${Math.round(r.quality * 100)} %, and ${Math.round(CAMERA_CLEAR * 100)} % is needed).`;
              return onFail(`${why} No number is shown rather than a guess. Bright, even light on the skin helps most. Try again, try the other camera option, or tap along.`);
            }
          }
        }
        raf = requestAnimationFrame(frame);
      };
      frame();
    })();
    return release;
  }, []);
  const measuring = left != null;
  return (
    <VStack gap={4}>
      <VStack gap={1} hAlign="center">
        <Heading level={2} type="display-2" accessibilityLevel={3} color={measuring ? 'accent' : 'secondary'}>{measuring ? `${left} s` : 'Getting ready'}</Heading>
        <Text type="label">{measuring ? `Step 2 of 2: measuring. ${total - left} of ${total} seconds done.` : 'The clock starts once your skin is found.'}</Text>
      </VStack>
      <ProgressBar label="Measurement progress" isLabelHidden isIndeterminate={!measuring} value={measuring ? total - left : 0} max={total} />
      <VStack gap={3} hAlign="center">
        <canvas ref={view} style={VIDEO} role="img" aria-label="Camera picture with the measured area outlined" />
        <video ref={video} autoPlay playsInline muted style={HIDDEN} />
        <Text as="p" color="secondary" justify="center">{status}</Text>
        {feed && <Text as="p" type="supporting" justify="center">{feed}</Text>}
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
          <VStack gap={1}><Heading level={3}>Camera: palm</Heading><Text as="p" color="secondary">About {SECONDS} seconds. A hand tracker finds your palm, follows it and reads only that area. Rest your elbow on the desk. Nothing is saved or sent.</Text></VStack>
        </ClickableCard>
      </Grid>
    </VStack>
  );
}
