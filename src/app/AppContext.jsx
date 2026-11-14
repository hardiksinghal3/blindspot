// App state for every screen: stored readings (or the simulated replay), NASA data, route.
import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getState, subscribe } from '../lib/store.js';
import { derive } from '../lib/model.js';
import { buildReplay, replayNow, REPLAY_DAYS } from '../lib/replay.js';
import { activeSpe } from '../lib/spaceweather.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const parseRoute = () => { const [name = '', ...args] = window.location.hash.replace(/^#\/?/, '').split('/'); return { name, args }; };
export const go = (path) => { window.location.hash = '#/' + path; };

let version = 0;
const subscribeStore = (fn) => subscribe(() => { version++; fn(); });

export function AppProvider({ children }) {
  const storeVersion = useSyncExternalStore(subscribeStore, () => version);
  const [route, setRoute] = useState(parseRoute);
  const [data, setData] = useState(null);
  const [sep, setSep] = useState(null);
  const [replay, setReplay] = useState(null); // {day, playing}
  const [tick, setTick] = useState(0); // refreshes "now" in live mode
  const timer = useRef(null);

  useEffect(() => {
    fetch('data/lighttime.json').then((r) => r.json()).then(setData).catch(() => setData(null));
    fetch('data/sep.json').then((r) => r.json()).then(setSep).catch(() => setSep(null));
    const onHash = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHash);
    const minute = setInterval(() => setTick((t) => t + 1), 60000);
    return () => { window.removeEventListener('hashchange', onHash); clearInterval(minute); };
  }, []);

  // #/replay or #/replay/66 starts the simulated mission.
  useEffect(() => {
    if (route.name !== 'replay') return;
    const day = Math.min(REPLAY_DAYS, Math.max(1, +route.args[0] || 1));
    setReplay({ day, playing: !route.args[0] });
    go('today');
  }, [route]);

  useEffect(() => {
    clearInterval(timer.current);
    if (replay && replay.playing) {
      timer.current = setInterval(() => setReplay((r) => (!r ? r : r.day >= REPLAY_DAYS ? { ...r, playing: false } : { ...r, day: r.day + 1 })), 420);
    }
    return () => clearInterval(timer.current);
  }, [replay && replay.playing]);

  const value = useMemo(() => {
    const live = getState();
    const state = replay ? buildReplay(replay.day) : live;
    if (replay) state.settings.focus = live.settings.focus;
    const now = replay ? replayNow(replay.day) : new Date().toISOString();
    return {
      state, now, data, sep, route, replay,
      d: derive(state, now, data, { spe: activeSpe(sep, now) }),
      startReplay: (day = 1, playing = true) => { setReplay({ day, playing }); go('today'); },
      stopReplay: () => { setReplay(null); go(''); },
      setReplayDay: (day) => setReplay((r) => r && { ...r, day, playing: false }),
      toggleReplay: () => setReplay((r) => r && { ...r, playing: !r.playing, day: !r.playing && r.day >= REPLAY_DAYS ? 1 : r.day }),
    };
  }, [storeVersion, data, sep, route, replay, tick]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
