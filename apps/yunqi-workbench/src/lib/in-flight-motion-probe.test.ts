import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startInFlightFrameProbe, supportsLongAnimationFrames } from './in-flight-motion-probe';

interface Entry { duration: number; startTime: number }
const frames = new Map<number, FrameRequestCallback>();
const observe = vi.fn();
const disconnect = vi.fn();
const takeRecords = vi.fn<() => Entry[]>();
let deliver: (entries: Entry[]) => void;
let nextHandle = 0;

function frame(timestamp: number) {
  const pending = [...frames.values()]; frames.clear();
  for (const callback of pending) callback(timestamp);
}
beforeEach(() => {
  vi.useFakeTimers();
  frames.clear(); nextHandle = 0;
  observe.mockReset(); disconnect.mockReset(); takeRecords.mockReset().mockReturnValue([]);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.set(++nextHandle, callback); return nextHandle;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((handle: number) => frames.delete(handle)));
  vi.stubGlobal('PerformanceObserver', class {
    static supportedEntryTypes = ['long-animation-frame'];
    constructor(callback: (list: { getEntries: () => Entry[] }) => void) {
      deliver = entries => callback({ getEntries: () => entries });
    }
    observe = observe;
    disconnect = disconnect;
    takeRecords = takeRecords;
  });
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('in-flight sampling and teardown', () => {
  it.each([[80, 'reduced'], [20, 'full']] as const)('collects delivered and pending LoAF %sms until the animation ends', (duration, outcome) => {
    const onComplete = vi.fn(); const onStop = vi.fn();
    const handle = startInFlightFrameProbe({ durationMs: 180, onComplete, onStop });
    expect(supportsLongAnimationFrames()).toBe(true);
    expect(observe).toHaveBeenCalledExactlyOnceWith({ type: 'long-animation-frame', buffered: false });
    frame(0); frame(16);
    deliver([{ duration, startTime: 0 }]);
    takeRecords.mockReturnValue([{ duration, startTime: 90 }]);
    vi.advanceTimersByTime(179);
    expect(onComplete).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(outcome);
    expect(takeRecords).toHaveBeenCalledOnce(); expect(disconnect).toHaveBeenCalledOnce();
    expect(onStop).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    deliver([{ duration: 1000, startTime: 200 }]);
    handle?.markActive(); handle?.cancel(); vi.runAllTimers();
    expect(onComplete).toHaveBeenCalledOnce(); expect(onStop).toHaveBeenCalledOnce();
  });

  it.each([[16, 'full'], [25, 'reduced']] as const)('falls back to rAF timestamps at %sms without LoAF support', (interval, outcome) => {
    vi.stubGlobal('PerformanceObserver', class { static supportedEntryTypes = ['paint']; });
    const onComplete = vi.fn();
    startInFlightFrameProbe({ durationMs: 180, onComplete });
    frame(0); for (let index = 1; index <= 5; index++) frame(index * interval);
    vi.advanceTimersByTime(179); expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onComplete).toHaveBeenCalledExactlyOnceWith(outcome);
    expect(observe).not.toHaveBeenCalled(); expect(frames.size).toBe(0);
  });

  it('does not double-count a shared LoAF / rAF long frame', () => {
    const onComplete = vi.fn();
    startInFlightFrameProbe({ durationMs: 400, onComplete });
    frame(0); for (let index = 1; index <= 9; index++) frame(index * 16);
    frame(204); deliver([{ duration: 60, startTime: 144 }]);
    vi.advanceTimersByTime(400); expect(onComplete).toHaveBeenCalledExactlyOnceWith('full');
  });

  it('supports LoAF alone when rAF is absent', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    const onComplete = vi.fn();
    startInFlightFrameProbe({ durationMs: 180, onComplete });
    takeRecords.mockReturnValue([{ duration: 80, startTime: 0 }]);
    vi.advanceTimersByTime(180); expect(onComplete).toHaveBeenCalledExactlyOnceWith('reduced');
  });

  it('arms a deferred countdown at activation and resets it when ready follows commit', () => {
    const onComplete = vi.fn();
    const handle = startInFlightFrameProbe({ durationMs: 180, deferred: true, onComplete });
    vi.advanceTimersByTime(500); expect(onComplete).not.toHaveBeenCalled();
    handle?.markActive(); vi.advanceTimersByTime(100); handle?.markActive();
    vi.advanceTimersByTime(179); expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onComplete).toHaveBeenCalledOnce();
  });

  it('eventually releases an unactivated deferred probe', () => {
    const onComplete = vi.fn();
    startInFlightFrameProbe({ durationMs: 180, deferred: true, onComplete });
    vi.advanceTimersByTime(1499); expect(onComplete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(onComplete).toHaveBeenCalledExactlyOnceWith('full');
  });

  it('cancels without recording or collecting a partial animation', () => {
    const onComplete = vi.fn(); const onStop = vi.fn();
    const handle = startInFlightFrameProbe({ durationMs: 180, onComplete, onStop });
    frame(0); frame(80); deliver([{ duration: 80, startTime: 0 }]);
    handle?.cancel(); handle?.cancel(); vi.runAllTimers();
    expect(onComplete).not.toHaveBeenCalled(); expect(takeRecords).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalledOnce(); expect(onStop).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0);
  });

  it.each(['constructor', 'observe'] as const)('uses rAF if the observer %s throws', failure => {
    if (failure === 'constructor') vi.stubGlobal('PerformanceObserver', class {
      static supportedEntryTypes = ['long-animation-frame'];
      constructor() { throw new Error('unsupported'); }
    });
    else observe.mockImplementation(() => { throw new Error('unsupported'); });
    const onComplete = vi.fn();
    expect(() => startInFlightFrameProbe({ durationMs: 180, onComplete })).not.toThrow();
    frame(0); frame(25); vi.advanceTimersByTime(180);
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('reduced');
  });

  it('ignores invalid rAF deltas and tolerates observer teardown exceptions', () => {
    const onComplete = vi.fn();
    startInFlightFrameProbe({ durationMs: 180, onComplete });
    for (const timestamp of [100, 90, NaN, 0, 16]) frame(timestamp);
    takeRecords.mockImplementation(() => { throw new Error('closed'); });
    disconnect.mockImplementation(() => { throw new Error('closed'); });
    expect(() => vi.advanceTimersByTime(180)).not.toThrow();
    expect(onComplete).toHaveBeenCalledExactlyOnceWith('full'); expect(frames.size).toBe(0);
  });

  it.each([undefined, class { static supportedEntryTypes = undefined; }])('returns undefined without either sampling API', observer => {
    vi.stubGlobal('requestAnimationFrame', undefined); vi.stubGlobal('PerformanceObserver', observer);
    expect(supportsLongAnimationFrames()).toBe(false);
    expect(startInFlightFrameProbe({ durationMs: 180, onComplete: vi.fn() })).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns undefined if LoAF setup fails and rAF is unavailable', () => {
    vi.stubGlobal('requestAnimationFrame', undefined);
    observe.mockImplementation(() => { throw new Error('unavailable'); });
    expect(startInFlightFrameProbe({ durationMs: 180, onComplete: vi.fn() })).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
