import {
  evaluateInFlightSample,
  type FrameProbeOutcome,
  type LongAnimationFrameSample,
} from './motion-diagnostics';

export interface InFlightProbeHandle {
  /** Arm the final duration countdown once a deferred animation begins playing. */
  readonly markActive: () => void;
  /** Cancel an interrupted or aborted animation without recording a result. */
  readonly cancel: () => void;
}

export interface InFlightProbeOptions {
  readonly durationMs: number;
  readonly deferred?: boolean;
  readonly onComplete: (outcome: FrameProbeOutcome) => void;
  readonly onStop?: () => void;
}

export function supportsLongAnimationFrames(): boolean {
  return typeof PerformanceObserver === 'function'
    && Array.isArray(PerformanceObserver.supportedEntryTypes)
    && PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
}

/** One-shot invisible probe during a real animation. Uses LoAF + rAF when
 * supported, otherwise rAF intervals only. Timestamps measure rendering
 * performance exclusively and never business time. */
export function startInFlightFrameProbe(options: InFlightProbeOptions): InFlightProbeHandle | undefined {
  const hasRaf = typeof window.requestAnimationFrame === 'function';
  const hasLoaf = supportsLongAnimationFrames();
  if (!hasRaf && !hasLoaf) return undefined;

  let stopped = false;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let previous: number | undefined;
  const intervals: number[] = [];
  const loafEntries: LongAnimationFrameSample[] = [];
  let observer: PerformanceObserver | undefined;
  const duration = Math.max(0, options.durationMs);

  if (hasLoaf) {
    try {
      observer = new PerformanceObserver((list) => {
        if (stopped) return;
        for (const entry of list.getEntries()) {
          loafEntries.push({ duration: entry.duration, startTime: entry.startTime });
        }
      });
      observer.observe({ type: 'long-animation-frame', buffered: false });
    } catch {
      observer = undefined;
    }
  }

  if (!hasRaf && !observer) return undefined;

  function sample(timestamp: number) {
    if (stopped) return;
    if (previous !== undefined) {
      const delta = timestamp - previous;
      if (Number.isFinite(delta) && delta >= 0) intervals.push(delta);
    }
    previous = timestamp;
    frame = window.requestAnimationFrame(sample);
  }

  function teardown(collectPendingLoaf: boolean): boolean {
    if (stopped) return false;
    stopped = true;
    if (frame !== undefined && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(frame);
    }
    frame = undefined;
    clearTimeout(timer);
    timer = undefined;
    if (observer) {
      if (collectPendingLoaf && typeof observer.takeRecords === 'function') {
        try {
          for (const entry of observer.takeRecords()) {
            loafEntries.push({ duration: entry.duration, startTime: entry.startTime });
          }
        } catch { /* Observer teardown must never throw. */ }
      }
      try { observer.disconnect(); } catch { /* Observer teardown must never throw. */ }
      observer = undefined;
    }
    options.onStop?.();
    return true;
  }

  function finish() {
    if (!teardown(true)) return;
    const outcome = evaluateInFlightSample({
      frameIntervals: intervals,
      longAnimationFrames: loafEntries,
    });
    options.onComplete(outcome);
  }

  function armTimer(delayMs: number, onExpire: () => void) {
    clearTimeout(timer);
    timer = setTimeout(onExpire, delayMs);
  }

  if (hasRaf) frame = window.requestAnimationFrame(sample);
  // A deferred probe waits for markActive(). If the animation never becomes
  // ready, its watchdog cancels without recording a result for the session.
  if (options.deferred) armTimer(Math.max(duration * 5, 1500), () => { teardown(false); });
  else armTimer(duration, finish);

  return {
    markActive() {
      if (stopped) return;
      armTimer(duration, finish);
    },
    cancel() {
      teardown(false);
    },
  };
}
