import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type MotionLevel = 'full' | 'reduced' | 'off';
export type MotionPreference = MotionLevel | 'auto';
const PREFERENCE_KEY = 'yunqi-motion';
const FRAME_RESULT_KEY = 'yunqi-motion-frame-rate';
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const FORCED_QUERY = '(forced-colors: active)';

interface MotionContextValue {
  readonly level: MotionLevel;
  readonly preference: MotionPreference;
  readonly setPreference: (preference: MotionPreference) => void;
}

const MotionContext = createContext<MotionContextValue | undefined>(undefined);

function readPreference(): MotionPreference {
  try {
    const value = window.localStorage.getItem(PREFERENCE_KEY);
    if (value === 'full' || value === 'reduced' || value === 'off') return value;
  } catch { /* Storage can be blocked in embedded/private windows. */ }
  return 'auto';
}

function readFrameResult(): 'full' | 'reduced' | undefined {
  try {
    const value = window.sessionStorage.getItem(FRAME_RESULT_KEY);
    if (value === 'full' || value === 'reduced') return value;
  } catch { /* Detection still works without persistence. */ }
  return undefined;
}

function detectCapability(): MotionLevel {
  if (!window.CSS?.supports?.('selector(:has(*))')) return 'off';
  return typeof document.startViewTransition === 'function'
    && window.CSS.supports('transition-behavior: allow-discrete') ? 'full' : 'reduced';
}

/** Invisible, one-shot probe: one primer timestamp and 30 frame intervals.
 * rAF timestamps measure rendering performance only, never business time. */
function probeFrameRate(onResult: (result: 'full' | 'reduced') => void): () => void {
  let stopped = false;
  let frame: number | undefined;
  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previous: number | undefined;
  const intervals: number[] = [];
  const inputEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

  function stop() {
    stopped = true;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    if (idle !== undefined) window.cancelIdleCallback(idle);
    clearTimeout(timer);
    window.removeEventListener('load', afterLoad);
    for (const event of inputEvents) window.removeEventListener(event, stop, true);
  }

  function sample(timestamp: number) {
    if (stopped) return;
    if (previous !== undefined) intervals.push(timestamp - previous);
    previous = timestamp;
    if (intervals.length < 30) {
      frame = window.requestAnimationFrame(sample);
      return;
    }
    const average = intervals.reduce((total, interval) => total + interval, 0) / intervals.length;
    const slowFrames = intervals.filter((interval) => interval > 50).length;
    const result = average > 24 || slowFrames > intervals.length / 3 ? 'reduced' : 'full';
    stop();
    try { window.sessionStorage.setItem(FRAME_RESULT_KEY, result); } catch { /* Optional cache. */ }
    onResult(result);
  }

  function afterLoad() {
    // Yield the initial paint before requesting idle time. The fallback also
    // yields a task; neither path changes DOM, styles or focus.
    frame = window.requestAnimationFrame(() => {
      if (stopped) return;
      const start = () => { if (!stopped) frame = window.requestAnimationFrame(sample); };
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(start);
      else timer = setTimeout(start, 0);
    });
  }

  for (const event of inputEvents) window.addEventListener(event, stop, { capture: true, passive: true });
  if (document.readyState === 'complete') afterLoad();
  else window.addEventListener('load', afterLoad, { once: true });
  return stop;
}

export function MotionProvider({ children }: { readonly children: ReactNode }) {
  // All initial inputs are read synchronously, so ThemeProvider emits the
  // correct data-motion on its very first commit.
  const [preference, setStoredPreference] = useState(readPreference);
  const [environment] = useState(() => ({
    reduced: window.matchMedia?.(REDUCED_QUERY),
    forced: window.matchMedia?.(FORCED_QUERY),
    capability: detectCapability(),
    urlOff: new URLSearchParams(window.location.search).get('motion') === 'off',
  }));
  const [systemReduced, setSystemReduced] = useState(environment.reduced?.matches ?? false);
  const [forcedColors, setForcedColors] = useState(environment.forced?.matches ?? false);
  const [frameResult, setFrameResult] = useState(readFrameResult);

  useEffect(() => {
    const reducedChange = () => setSystemReduced(environment.reduced?.matches ?? false);
    const forcedChange = () => setForcedColors(environment.forced?.matches ?? false);
    environment.reduced?.addEventListener?.('change', reducedChange);
    environment.forced?.addEventListener?.('change', forcedChange);
    reducedChange();
    forcedChange();
    return () => {
      environment.reduced?.removeEventListener?.('change', reducedChange);
      environment.forced?.removeEventListener?.('change', forcedChange);
    };
  }, [environment]);

  useEffect(() => {
    if (frameResult !== undefined || environment.capability !== 'full' || environment.urlOff
      || environment.reduced?.matches || environment.forced?.matches
      || typeof window.requestAnimationFrame !== 'function') return;
    return probeFrameRate(setFrameResult);
  }, [environment, frameResult]);

  let level: MotionLevel;
  // These are hard off conditions. Otherwise manual > system > automatic.
  if (environment.urlOff || forcedColors || environment.capability === 'off') level = 'off';
  else if (preference !== 'auto') level = preference;
  else if (systemReduced || frameResult === 'reduced') level = 'reduced';
  else level = environment.capability;

  const value = useMemo<MotionContextValue>(() => ({
    level,
    preference,
    setPreference(next) {
      try {
        if (next === 'auto') window.localStorage.removeItem(PREFERENCE_KEY);
        else window.localStorage.setItem(PREFERENCE_KEY, next);
      } catch { /* Keep the explicit choice in memory until this window closes. */ }
      setStoredPreference(next);
    },
  }), [level, preference]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/** Standalone theme/visual fixtures without a provider stay motionless. */
export function useMotionLevel(): MotionLevel {
  return useContext(MotionContext)?.level ?? 'off';
}

export function useMotion(): MotionContextValue {
  const value = useContext(MotionContext);
  if (!value) throw new Error('useMotion must be used within MotionProvider');
  return value;
}
