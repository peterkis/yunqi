import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  startInFlightFrameProbe,
  type InFlightProbeHandle,
} from '../lib/in-flight-motion-probe';
import {
  detectBrowserEngine,
  evaluateFrameIntervals,
  MOTION_IDLE_FRAME_STORAGE_KEY,
  MOTION_IN_FLIGHT_FRAME_STORAGE_KEY,
  MOTION_PREFERENCE_STORAGE_KEY,
  parseIdleFrameStorage,
  parseInFlightFrameStorage,
  resolveMotionState,
  serializeInFlightFrameStorage,
  type FrameProbeOutcome,
  type MotionLevel,
  type MotionPreference,
  type MotionReason,
} from '../lib/motion-diagnostics';

export type { MotionLevel, MotionPreference, MotionReason };

export type ObserveInFlightMotion = (
  durationMs: number,
  options?: { readonly deferred?: boolean },
) => InFlightProbeHandle | undefined;

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';
const FORCED_QUERY = '(forced-colors: active)';

export interface MotionContextValue {
  readonly level: MotionLevel;
  readonly reason: MotionReason;
  readonly preference: MotionPreference;
  readonly engine: string;
  readonly setPreference: (preference: MotionPreference) => void;
  readonly observeInFlight: ObserveInFlightMotion;
}

const MotionContext = createContext<MotionContextValue | undefined>(undefined);

function readPreference(): MotionPreference {
  try {
    const value = window.localStorage.getItem(MOTION_PREFERENCE_STORAGE_KEY);
    if (value === 'full' || value === 'reduced' || value === 'off') return value;
  } catch { /* Storage can be blocked in embedded/private windows. */ }
  return 'auto';
}

function readIdleFrameResult(): FrameProbeOutcome | undefined {
  try {
    return parseIdleFrameStorage(window.sessionStorage.getItem(MOTION_IDLE_FRAME_STORAGE_KEY));
  } catch { /* Detection still works without persistence. */ }
  return undefined;
}

function readInFlightFrameResult(): FrameProbeOutcome | undefined {
  try {
    return parseInFlightFrameStorage(window.sessionStorage.getItem(MOTION_IN_FLIGHT_FRAME_STORAGE_KEY));
  } catch { /* Detection still works without persistence. */ }
  return undefined;
}

/** Invisible, one-shot probe: one primer timestamp and 30 frame intervals.
 * rAF timestamps measure rendering performance only, never business time. */
function probeFrameRate(onResult: (result: FrameProbeOutcome) => void): () => void {
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
    const result = evaluateFrameIntervals(intervals);
    stop();
    try { window.sessionStorage.setItem(MOTION_IDLE_FRAME_STORAGE_KEY, result); } catch { /* Optional cache. */ }
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
  const [environment] = useState(() => {
    const supportsHas = Boolean(window.CSS?.supports?.('selector(:has(*))'));
    return {
      reduced: window.matchMedia?.(REDUCED_QUERY),
      forced: window.matchMedia?.(FORCED_QUERY),
      supportsHas,
      supportsViewTransition: typeof document.startViewTransition === 'function',
      supportsStartingStyle: supportsHas && Boolean(window.CSS?.supports?.('transition-behavior: allow-discrete')),
      urlOff: new URLSearchParams(window.location.search).get('motion') === 'off',
      engine: detectBrowserEngine(),
    };
  });
  const [systemReduced, setSystemReduced] = useState(environment.reduced?.matches ?? false);
  const [forcedColors, setForcedColors] = useState(environment.forced?.matches ?? false);
  const [idleFrameResult, setIdleFrameResult] = useState(readIdleFrameResult);
  const [inFlightFrameResult, setInFlightFrameResult] = useState(readInFlightFrameResult);

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

  const capableFull = environment.supportsHas
    && environment.supportsViewTransition
    && environment.supportsStartingStyle;

  useEffect(() => {
    if (idleFrameResult !== undefined || inFlightFrameResult === 'reduced'
      || !capableFull || environment.urlOff
      || environment.reduced?.matches || environment.forced?.matches
      || typeof window.requestAnimationFrame !== 'function') return;
    return probeFrameRate(setIdleFrameResult);
  }, [capableFull, environment, idleFrameResult, inFlightFrameResult]);

  const { level, reason } = resolveMotionState({
    urlOff: environment.urlOff,
    forcedColors,
    supportsHas: environment.supportsHas,
    supportsViewTransition: environment.supportsViewTransition,
    supportsStartingStyle: environment.supportsStartingStyle,
    preference,
    systemReduced,
    idleFrameResult,
    inFlightFrameResult,
  });

  const probeStateRef = useRef({ level, preference, inFlightFrameResult });
  probeStateRef.current = { level, preference, inFlightFrameResult };
  const activeInFlightRef = useRef<InFlightProbeHandle | undefined>(undefined);

  useEffect(() => {
    if (level !== 'full' || preference !== 'auto' || inFlightFrameResult !== undefined) {
      activeInFlightRef.current?.cancel();
    }
  }, [level, preference, inFlightFrameResult]);

  useEffect(() => () => {
    activeInFlightRef.current?.cancel();
  }, []);

  const observeInFlight = useCallback<ObserveInFlightMotion>((durationMs, options) => {
    const current = probeStateRef.current;
    if (current.level !== 'full' || current.preference !== 'auto'
      || current.inFlightFrameResult !== undefined || activeInFlightRef.current) {
      return undefined;
    }
    let handle: InFlightProbeHandle | undefined;
    handle = startInFlightFrameProbe({
      durationMs,
      deferred: options?.deferred,
      onComplete(outcome) {
        if (probeStateRef.current.preference !== 'auto' || probeStateRef.current.level !== 'full') return;
        try {
          window.sessionStorage.setItem(
            MOTION_IN_FLIGHT_FRAME_STORAGE_KEY,
            serializeInFlightFrameStorage(outcome),
          );
        } catch { /* Optional cache. */ }
        setInFlightFrameResult(outcome);
      },
      onStop() {
        if (activeInFlightRef.current === handle) activeInFlightRef.current = undefined;
      },
    });
    if (handle) activeInFlightRef.current = handle;
    return handle;
  }, []);

  const value = useMemo<MotionContextValue>(() => ({
    level,
    reason,
    preference,
    engine: environment.engine,
    observeInFlight,
    setPreference(next) {
      try {
        if (next === 'auto') window.localStorage.removeItem(MOTION_PREFERENCE_STORAGE_KEY);
        else window.localStorage.setItem(MOTION_PREFERENCE_STORAGE_KEY, next);
      } catch { /* Keep the explicit choice in memory until this window closes. */ }
      setStoredPreference(next);
    },
  }), [level, reason, preference, environment.engine, observeInFlight]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

/** Standalone theme/visual fixtures without a provider stay motionless. */
export function useMotionLevel(): MotionLevel {
  return useContext(MotionContext)?.level ?? 'off';
}

export function useMotionPreference(): MotionPreference {
  return useContext(MotionContext)?.preference ?? 'auto';
}

export function useMotionInFlightObserver(): ObserveInFlightMotion | undefined {
  return useContext(MotionContext)?.observeInFlight;
}

export function useMotion(): MotionContextValue {
  const value = useContext(MotionContext);
  if (!value) throw new Error('useMotion must be used within MotionProvider');
  return value;
}
