// Resting pulse: tap along with your pulse, or use the camera (screening grade, with a quality gate).
import { h } from '../ui.js';
import { pulseFromTaps, pulseFromSignal } from '../scoring.js';

export const MIN_QUALITY = 0.3;

export function runPulse(mount, { onDone, register }) {
  let cleanup = () => {};
  register(() => cleanup());

  const choose = (note) => {
    cleanup();
    mount.replaceChildren(h('div', { class: 'panel stack' }, h('h3', null, 'Resting pulse'),
      note ? h('p', { class: 'note warn' }, note) : null,
      h('p', { class: 'dim' }, 'Sit still for a minute first. Then choose how to measure.'),
      h('div', { class: 'grid g2' },
        h('button', { class: 'panel click stack', style: '--gap:6px', onClick: tapMode }, h('h3', null, 'Tap along'), h('p', { class: 'small dim' }, 'Find your pulse at the wrist or neck and tap once per beat, 15 times.')),
        h('button', { class: 'panel click stack', style: '--gap:6px', onClick: camMode }, h('h3', null, 'Camera'), h('p', { class: 'small dim' }, '30 seconds. Reads tiny colour changes in your face. Needs good light. Nothing is saved or sent.')))));
  };

  const tapMode = () => {
    const times = [], need = 15;
    const count = h('div', { class: 'counter' }, '0');
    const stage = h('div', { class: 'stage armed', tabindex: 0, role: 'application', 'aria-label': 'Tap once per heartbeat' }, h('div', { class: 'stack', style: 'display:grid;justify-items:center' }, count, h('p', { class: 'msg' }, 'Tap ', h('kbd', null, 'Space'), ' or tap here once for each beat you feel.')));
    const tap = (ts) => {
      times.push(ts); count.textContent = times.length;
      if (times.length >= need) { const r = pulseFromTaps(times); cleanup(); if (!(r.bpm >= 30 && r.bpm <= 220) || r.quality < MIN_QUALITY) return choose('Those taps were too uneven to trust. Try again, or use the camera.'); onDone({ bpm: r.bpm, quality: r.quality, method: 'tap' }); }
    };
    const key = (e) => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) tap(e.timeStamp); } };
    const ptr = (e) => { e.preventDefault(); tap(e.timeStamp); };
    window.addEventListener('keydown', key, true); stage.addEventListener('pointerdown', ptr);
    cleanup = () => { window.removeEventListener('keydown', key, true); stage.removeEventListener('pointerdown', ptr); cleanup = () => {}; };
    mount.replaceChildren(stage); stage.focus();
  };

  const camMode = async () => {
    const SECONDS = 30;
    const video = h('video', { autoplay: true, playsInline: true, muted: true, style: 'width:min(100%,420px);border-radius:12px;transform:scaleX(-1);background:#000' });
    const status = h('p', { class: 'msg' }, 'Starting camera.');
    const bar = h('i');
    mount.replaceChildren(h('div', { class: 'stack', style: '--gap:10px' }, h('div', { class: 'progress' }, bar), h('div', { class: 'stage' }, h('div', { class: 'stack', style: 'display:grid;justify-items:center' }, video, status, h('button', { class: 'btn sm', onClick: () => choose() }, 'Stop and tap along instead')))));
    let stream = null, raf = 0, stopped = false;
    cleanup = () => { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); cleanup = () => {}; };
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera support');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false });
    } catch { return choose('The camera is not available or permission was refused. Tap along instead.'); }
    if (stopped) return stream.getTracks().forEach((t) => t.stop());
    video.srcObject = stream;
    await video.play().catch(() => {});
    status.textContent = 'Fill the frame with your face. Hold still and breathe normally.';
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 24;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const samples = []; const t0 = performance.now();
    const frame = () => {
      if (stopped) return;
      const t = performance.now() - t0;
      if (video.videoWidth) {
        // Centre of the frame: cheeks and forehead when the face fills the view.
        g.drawImage(video, video.videoWidth * 0.3, video.videoHeight * 0.2, video.videoWidth * 0.4, video.videoHeight * 0.5, 0, 0, 32, 24);
        const px = g.getImageData(0, 0, 32, 24).data; let sum = 0;
        for (let i = 1; i < px.length; i += 4) sum += px[i];
        samples.push(sum / (px.length / 4));
      }
      bar.style.width = `${Math.min(100, (t / (SECONDS * 1000)) * 100)}%`;
      if (t >= SECONDS * 1000) {
        const fs = samples.length / (t / 1000); const r = pulseFromSignal(samples, fs); cleanup();
        if (!(r.quality >= MIN_QUALITY) || !Number.isFinite(r.bpm)) return choose('The camera reading was not steady enough to trust, so it was thrown away. Try brighter light and hold still, or tap along.');
        return onDone({ bpm: r.bpm, quality: r.quality, method: 'camera' });
      }
      raf = requestAnimationFrame(frame);
    };
    frame();
  };

  choose();
}
