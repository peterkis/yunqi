import { afterEach, expect, it, vi } from 'vitest';
import { attachPanelWheelScroll } from './panel-wheel-scroll';

afterEach(() => { document.body.replaceChildren(); vi.unstubAllGlobals(); });

it('leaves a host without media-query support on native scrolling', () => {
  vi.stubGlobal('matchMedia', undefined);
  const main = document.createElement('main');
  const detach = attachPanelWheelScroll(main);
  expect(main.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, cancelable: true }))).toBe(true);
  detach();
});

it('releases an active reader when hidden, when motion changes, and on teardown', () => {
  const media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal('matchMedia', () => media);
  const frames = new Map<number, FrameRequestCallback>();
  let sequence = 0;
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frames.set(++sequence, fn); return sequence; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const main = document.createElement('main');
  const reader = document.createElement('section');
  reader.setAttribute('data-panel-scroll', '');
  const input = document.createElement('textarea');
  reader.append(input);
  main.append(reader);
  document.body.append(main);
  Object.defineProperties(reader, { clientHeight: { value: 200 }, scrollHeight: { value: 1200 } });
  const detach = attachPanelWheelScroll(main);
  const wheel = (target: HTMLElement) => target.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 }));
  try {
    for (const interrupt of [
      () => document.dispatchEvent(new Event('visibilitychange')),
      () => main.dispatchEvent(new Event('pointerdown', { bubbles: true })),
      () => input.focus(),
      () => { media.matches = true; media.dispatchEvent(new Event('change')); },
    ]) {
      expect(wheel(reader)).toBe(false);
      expect(reader).toHaveClass('lenis-smooth');
      expect(frames.size).toBe(1);
      interrupt();
      expect(reader).not.toHaveClass('lenis');
      expect(frames.size).toBe(0);
    }
    expect(wheel(reader)).toBe(true);
    media.matches = false;
    expect(wheel(input)).toBe(true);
    expect(wheel(reader)).toBe(false);
  } finally { detach(); }
  expect(frames.size).toBe(0);
  expect(wheel(reader)).toBe(true);
});
