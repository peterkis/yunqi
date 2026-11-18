import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionProvider } from '../../providers/MotionProvider';
import { SegmentedControl } from './SegmentedControl';

let resize: ResizeObserverCallback;
const disconnect = vi.fn();
let width = 80;
const originalTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');

function Choice() {
  const [value, setValue] = useState<'a' | 'b' | ''>('a');
  return <>
    <SegmentedControl label="测量分段" value={value} onChange={setValue}
      segments={[{ value: 'a', label: '第一段' }, { value: 'b', label: '第二段' }]} />
    <button onClick={() => setValue('')}>清空选择</button>
  </>;
}

beforeEach(() => {
  width = 80;
  disconnect.mockClear();
  localStorage.clear(); sessionStorage.setItem('yunqi-motion-frame-rate', 'full');
  vi.stubGlobal('CSS', { supports: () => true });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: vi.fn() });
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
    return this.textContent === '第二段' ? width + 5 : 3;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(3);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(30);
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear();
  if (originalTransition) Object.defineProperty(document, 'startViewTransition', originalTransition);
  else Reflect.deleteProperty(document, 'startViewTransition');
});

describe('segmented indicator geometry', () => {
  it.each(['full', 'reduced', 'off'] as const)('aligns first paint, selection and resize without a resize animation in %s', level => {
    localStorage.setItem('yunqi-motion', level);
    const view = render(<MotionProvider><Choice /></MotionProvider>);
    const track = screen.getByRole('radiogroup');
    expect(track).toHaveAttribute('data-indicator-ready', 'true');
    expect(track).toHaveAttribute('data-indicator-animated', 'false');
    expect(track.style.getPropertyValue('--segment-left')).toBe('3px');
    expect(track.style.getPropertyValue('--segment-width')).toBe('80px');
    expect(track.style.getPropertyValue('--segment-top')).toBe('3px');
    expect(track.style.getPropertyValue('--segment-indicator-height')).toBe('30px');
    expect(track.querySelector('.motion-segment-indicator')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(screen.getByRole('radio', { name: '第二段' }));
    expect(track.style.getPropertyValue('--segment-left')).toBe('85px');
    expect(track).toHaveAttribute('data-indicator-animated', String(level === 'full'));
    width = 60;
    act(() => resize([], {} as ResizeObserver));
    expect(track.style.getPropertyValue('--segment-left')).toBe('65px');
    expect(track.style.getPropertyValue('--segment-width')).toBe('60px');
    expect(track).toHaveAttribute('data-indicator-animated', 'false');
    fireEvent.click(screen.getByRole('button', { name: '清空选择' }));
    expect(track).toHaveAttribute('data-indicator-ready', 'false');
    act(() => resize([], {} as ResizeObserver));
    expect(track).toHaveAttribute('data-indicator-ready', 'false');
    view.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('uses window resize when ResizeObserver is unavailable, and ignores hidden zero-width tracks', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    width = 0;
    const view = render(<Choice />);
    const track = screen.getByRole('radiogroup');
    expect(track).toHaveAttribute('data-indicator-ready', 'false');
    width = 50;
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(track).toHaveAttribute('data-indicator-ready', 'true');
    expect(track.style.getPropertyValue('--segment-width')).toBe('50px');
    view.unmount();
    width = 70;
    act(() => { window.dispatchEvent(new Event('resize')); });
    expect(track.style.getPropertyValue('--segment-width')).toBe('50px');
  });
});
