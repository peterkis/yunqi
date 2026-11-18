import { act, fireEvent, render, screen } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionSettings } from '../components/layout/MotionSettings';
import { MotionProvider, useMotion, useMotionLevel } from './MotionProvider';
import { ThemeProvider } from './ThemeProvider';

const originalTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
const queries = new Map<string, { matches: boolean; listeners: Set<() => void> }>();
const frames = new Map<number, FrameRequestCallback>();
const idleTasks = new Map<number, () => void>();
let nextHandle = 0;
let supportsHas = true;
let supportsStartingStyle = true;

function frame(timestamp: number) {
  act(() => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback(timestamp);
  });
}
function idle() {
  act(() => {
    const callbacks = [...idleTasks.values()];
    idleTasks.clear();
    for (const callback of callbacks) callback();
  });
}
function media(query: string, matches: boolean) {
  const state = queries.get(query)!;
  act(() => {
    state.matches = matches;
    for (const listener of state.listeners) listener();
  });
}
function mount() {
  const firstCommit: (string | null | undefined)[] = [];
  function Probe() {
    useLayoutEffect(() => { firstCommit.push(document.querySelector('.theme-root')?.getAttribute('data-motion')); }, []);
    return null;
  }
  return { ...render(<MotionProvider><ThemeProvider><Probe /><MotionSettings /></ThemeProvider></MotionProvider>), firstCommit };
}
function expectLevel(level: string) {
  expect(document.querySelector('.theme-root')).toHaveAttribute('data-motion', level);
}
function choose(label: string) {
  const details = screen.getByText('动效设置').closest('details')!;
  details.open = true;
  fireEvent.click(screen.getByRole('radio', { name: label }));
}
function sample(intervals: readonly number[]) {
  frame(0); // Initial paint.
  expect(frames.size).toBe(0); // Sampling waits for idle.
  idle();
  let timestamp = 100;
  frame(timestamp); // Primer.
  for (const interval of intervals) frame(timestamp += interval);
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  queries.clear(); frames.clear(); idleTasks.clear();
  supportsHas = true; supportsStartingStyle = true;
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: vi.fn() });
  vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
  vi.stubGlobal('CSS', { supports: vi.fn((query: string) => query.includes(':has') ? supportsHas : supportsStartingStyle) });
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    const state = { matches: false, listeners: new Set<() => void>() };
    queries.set(query, state);
    return {
      get matches() { return state.matches; },
      addEventListener: (_event: string, listener: () => void) => state.listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => state.listeners.delete(listener),
    };
  }));
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const handle = ++nextHandle; frames.set(handle, callback); return handle;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((handle: number) => frames.delete(handle)));
  vi.stubGlobal('requestIdleCallback', vi.fn((callback: () => void) => {
    const handle = ++nextHandle; idleTasks.set(handle, callback); return handle;
  }));
  vi.stubGlobal('cancelIdleCallback', vi.fn((handle: number) => idleTasks.delete(handle)));
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  if (originalTransition) Object.defineProperty(document, 'startViewTransition', originalTransition);
  else Reflect.deleteProperty(document, 'startViewTransition');
});

describe('MotionProvider', () => {
  it('emits the automatic capability result on the first commit', () => {
    expect(mount().firstCommit).toEqual(['full']);
    expectLevel('full');
  });

  it('reads system preferences synchronously and tracks both media queries live', () => {
    const matchMedia = window.matchMedia;
    vi.stubGlobal('matchMedia', (query: string) => {
      const result = matchMedia(query);
      if (query.includes('reduced-motion')) queries.get(query)!.matches = true;
      return result;
    });
    expect(mount().firstCommit).toEqual(['reduced']);
    media('(prefers-reduced-motion: reduce)', false); expectLevel('full');
    media('(forced-colors: active)', true); expectLevel('off');
    media('(forced-colors: active)', false); expectLevel('full');
    media('(prefers-reduced-motion: reduce)', true); expectLevel('reduced');
  });

  it.each(['full', 'reduced', 'off'] as const)('restores the manual %s choice ahead of system and automatic detection', (level) => {
    localStorage.setItem('yunqi-motion', level);
    sessionStorage.setItem('yunqi-motion-frame-rate', 'reduced');
    mount();
    media('(prefers-reduced-motion: reduce)', true);
    expectLevel(level);
    // Forced colors are a hard off condition, even for a stored full choice.
    media('(forced-colors: active)', true); expectLevel('off');
    media('(forced-colors: active)', false); expectLevel(level);
  });

  it('persists the segmented choice and offers automatic reset with one keyboard entry', () => {
    mount();
    choose('精简'); expectLevel('reduced');
    expect(localStorage.getItem('yunqi-motion')).toBe('reduced');
    choose('关闭'); expectLevel('off');
    choose('标准'); expectLevel('full');
    expect(screen.getAllByRole('radio').filter(button => button.tabIndex === 0)).toHaveLength(1);
    choose('自动'); expect(localStorage.getItem('yunqi-motion')).toBeNull();
    media('(prefers-reduced-motion: reduce)', true); expectLevel('reduced');
  });

  it.each(['missing transition', 'missing starting style'])('reduces automatically for %s, but honors a manual choice', (missing) => {
    if (missing === 'missing transition') Reflect.deleteProperty(document, 'startViewTransition');
    else supportsStartingStyle = false;
    expect(mount().firstCommit).toEqual(['reduced']);
    choose('标准'); expectLevel('full');
    choose('自动'); expectLevel('reduced');
    expect(frames.size).toBe(0);
  });

  it.each(['has', 'CSS'])('stays functional and off without %s support', (missing) => {
    if (missing === 'has') supportsHas = false;
    else vi.stubGlobal('CSS', undefined);
    localStorage.setItem('yunqi-motion', 'full');
    mount(); expectLevel('off');
    choose('自动'); expectLevel('off');
  });

  it('URL off takes precedence over manual full without changing the saved choice', () => {
    window.history.replaceState({}, '', '/?motion=off');
    localStorage.setItem('yunqi-motion', 'full');
    mount(); expectLevel('off');
    expect(localStorage.getItem('yunqi-motion')).toBe('full');
    expect(frames.size).toBe(0);
  });

  it.each(['invalid', 'blocked'])('falls back to automatic when localStorage is %s', (storage) => {
    if (storage === 'invalid') localStorage.setItem('yunqi-motion', 'unsupported');
    else vi.stubGlobal('localStorage', {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
      removeItem() { throw new Error('blocked'); },
    });
    supportsStartingStyle = false;
    mount(); expectLevel('reduced');
    choose('标准'); expectLevel('full');
    choose('自动'); expectLevel('reduced');
  });

  it('keeps a manual choice in memory if storage writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    mount(); choose('关闭'); expectLevel('off');
    choose('自动'); expectLevel('full');
  });

  it.each([
    ['smooth', Array(30).fill(16), 'full'],
    ['exact average limit', Array(30).fill(24), 'full'],
    ['slow average', Array(30).fill(25), 'reduced'],
    ['exact slow-frame count', [...Array(10).fill(51), ...Array(20).fill(10)], 'full'],
    ['over one third slow frames', [...Array(11).fill(51), ...Array(19).fill(8)], 'reduced'],
  ] as const)('samples 30 intervals: %s and caches %s', (_name, intervals, expected) => {
    const view = mount();
    const html = view.container.innerHTML;
    frame(0); idle(); frame(100);
    for (let index = 0, timestamp = 100; index < 29; index++) frame(timestamp += intervals[index]);
    expect(sessionStorage.getItem('yunqi-motion-frame-rate')).toBeNull();
    expect(view.container.innerHTML).toBe(html); // Probe has no visible intermediate states.
    frame(100 + intervals.reduce((total, interval) => total + interval, 0));
    expectLevel(expected);
    expect(sessionStorage.getItem('yunqi-motion-frame-rate')).toBe(expected);
    expect(frames.size).toBe(0);
    view.unmount();
    mount(); expectLevel(expected);
    expect(frames.size).toBe(0); // One successful sample per session.
  });

  it('does not let a low frame result override a manual full choice', () => {
    localStorage.setItem('yunqi-motion', 'full');
    mount(); sample(Array(30).fill(30)); expectLevel('full');
    choose('自动'); expectLevel('reduced');
  });

  it('can probe when sessionStorage is unavailable', () => {
    vi.stubGlobal('sessionStorage', {
      getItem() { throw new Error('blocked'); },
      setItem() { throw new Error('blocked'); },
    });
    mount(); sample(Array(30).fill(30)); expectLevel('reduced');
  });

  it.each(['pointerdown', 'keydown', 'wheel', 'touchstart'])('abandons the probe on %s and cleans up callbacks', (event) => {
    const view = mount(); frame(0); idle(); frame(100);
    act(() => { window.dispatchEvent(new Event(event)); });
    frame(1000); expectLevel('full');
    expect(sessionStorage.getItem('yunqi-motion-frame-rate')).toBeNull();
    expect(frames.size).toBe(0);
    view.unmount();
    for (const query of queries.values()) expect(query.listeners.size).toBe(0);
  });

  it('abandons even before load/idle, and cancels pending idle work on unmount', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const view = mount();
    expect(frames.size).toBe(0);
    act(() => { window.dispatchEvent(new Event('keydown')); });
    act(() => { window.dispatchEvent(new Event('load')); });
    expect(frames.size).toBe(0);
    view.unmount();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    const second = mount(); frame(0); expect(idleTasks.size).toBe(1);
    second.unmount(); expect(idleTasks.size).toBe(0);
  });

  it('yields a task after paint when idle callbacks are absent', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    mount(); frame(0);
    act(() => { vi.advanceTimersByTime(0); });
    frame(0);
    for (let index = 1; index <= 30; index++) frame(index * 16);
    expect(sessionStorage.getItem('yunqi-motion-frame-rate')).toBe('full');
  });

  it('handles missing media/rAF APIs and keeps standalone themes off', () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.stubGlobal('requestAnimationFrame', undefined);
    const view = mount(); expectLevel('full'); view.unmount();
    function Probe() { return <p>{useMotionLevel()}</p>; }
    render(<ThemeProvider><Probe /></ThemeProvider>);
    expectLevel('off'); expect(screen.getByText('off')).toBeVisible();
  });

  it('requires a provider for an interactive motion control', () => {
    function Probe() { useMotion(); return null; }
    expect(() => render(<Probe />)).toThrow('useMotion must be used within MotionProvider');
  });
});
