// Palm finder. Google's MediaPipe hand landmark model, served from this site so it needs no link to Earth.
// Screening grade: it locates the palm for the camera pulse reading and does nothing else.

// Wrist, thumb base and the four knuckles: the outline of the palm.
const PALM = [0, 1, 5, 9, 13, 17];
export const MIN_PALM_AREA = 0.01; // share of the picture the palm must cover

let loading = null;
export function loadHandFinder() {
  if (!loading) {
    loading = (async () => {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const root = new URL('mediapipe/', document.baseURI).href;
      const files = await FilesetResolver.forVisionTasks(`${root}wasm`);
      const make = (delegate) => HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${root}hand_landmarker.task`, delegate },
        runningMode: 'VIDEO', numHands: 1,
        minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.6,
      });
      try { return await make('GPU'); } catch { return make('CPU'); }
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

// The palm outline from 21 hand landmarks, pulled 10 % towards its centre so its edge stays on skin.
export function palmShape(landmarks, inset = 0.9) {
  const pts = PALM.map((i) => landmarks[i]);
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return pts.map((p) => ({ x: cx + (p.x - cx) * inset, y: cy + (p.y - cy) * inset }));
}

// Area of an outline, in the same units as its points.
export function shapeArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
  return Math.abs(a) / 2;
}
