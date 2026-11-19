import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState, type ReactNode } from 'react';
import { Link, MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelNavigation } from '../app/PanelNavigation';
import { SegmentedControl } from '../components/design/SegmentedControl';
import { MotionSettings } from '../components/layout/MotionSettings';
import { YunQiWheel } from '../features/yunqi/components/YunQiWheel';
import { CurrentYunQiPage } from '../features/yunqi/components/CurrentYunQiPage';
import { mapLearning } from '../features/yunqi/presentation/map-learning';
import { createLearningDto } from '../test/learning-fixtures';
import { MotionProvider, useMotion, useMotionInFlightObserver, type MotionContextValue } from './MotionProvider';
import { ThemeProvider } from './ThemeProvider';

const originalTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
const frames = new Map<number, FrameRequestCallback>();
const observers: FakeObserver[] = [];
const animations: { cancel: ReturnType<typeof vi.fn> }[] = [];
let nextHandle = 0;
let motion: MotionContextValue;
let resize: () => void;
let style: HTMLStyleElement;
interface Entry { duration: number; startTime: number }
class FakeObserver {
  static supportedEntryTypes = ['long-animation-frame'];
  observe = vi.fn(); disconnect = vi.fn(); takeRecords = vi.fn<() => Entry[]>(() => []);
  constructor(readonly callback: (list: { getEntries: () => Entry[] }) => void) { observers.push(this); }
  deliver(duration: number) { this.callback({ getEntries: () => [{ duration, startTime: 0 }] }); }
}
function ReadMotion() { motion = useMotion(); return <output>{motion.reason}</output>; }
function mount(children?: ReactNode) {
  return render(<MotionProvider><ThemeProvider><ReadMotion /><MotionSettings />{children}</ThemeProvider></MotionProvider>);
}
function frame(timestamp: number) {
  act(() => {
    const callbacks = [...frames.values()]; frames.clear();
    for (const callback of callbacks) callback(timestamp);
  });
}
function advance(ms: number) { act(() => vi.advanceTimersByTime(ms)); }
function choose(label: string) {
  screen.getByText('动效设置').closest('details')!.open = true;
  fireEvent.click(screen.getByRole('radio', { name: label }));
}
function expectState(level: string, reason: string) {
  expect(document.querySelector('.theme-root')).toHaveAttribute('data-motion', level);
  expect(motion.reason).toBe(reason);
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear(); sessionStorage.clear();
  sessionStorage.setItem('yunqi-motion-frame-rate', 'full');
  window.history.replaceState({}, '', '/yunqi/current');
  frames.clear(); observers.length = 0; animations.length = 0; nextHandle = 0;
  vi.stubGlobal('CSS', { supports: () => true });
  vi.stubGlobal('matchMedia', undefined);
  vi.stubGlobal('PerformanceObserver', FakeObserver);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    frames.set(++nextHandle, callback); return nextHandle;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((handle: number) => frames.delete(handle)));
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resize = callback; }
    observe() {} disconnect() {}
  });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: vi.fn((commit: () => void) => {
    commit();
    return { ready: Promise.resolve(), updateCallbackDone: Promise.resolve(),
      get finished() { throw new Error('must not read finished'); } };
  }) });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(() => {
    const animation = { cancel: vi.fn() }; animations.push(animation); return animation;
  }) });
  // jsdom does not inherit SVG custom properties; use the agreed literal
  // duration on every test node so these are actual timed animations.
  style = document.createElement('style');
  style.textContent = '* { --motion-base: 180ms; --motion-emphasis: 320ms; --ease-standard: linear; }';
  document.head.append(style);
});
afterEach(() => {
  cleanup(); style.remove(); vi.clearAllTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  if (originalTransition) Object.defineProperty(document, 'startViewTransition', originalTransition);
  else Reflect.deleteProperty(document, 'startViewTransition');
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(Element.prototype, 'animate');
});

describe('MotionProvider in-flight lifetime', () => {
  it.each([[80, 'reduced', 'frame-in-flight'], [16, 'full', 'default']] as const)('records %sms frames once and applies %s only at animation end', (interval, level, reason) => {
    const view = mount();
    let probe: ReturnType<MotionContextValue['observeInFlight']>;
    act(() => { probe = motion.observeInFlight(180); });
    expect(probe!).toBeDefined();
    expect(motion.observeInFlight(320)).toBeUndefined(); // First real animation owns the sample.
    expect(observers).toHaveLength(1);
    expect(observers[0].observe).toHaveBeenCalledExactlyOnceWith({ type: 'long-animation-frame', buffered: false });
    const before = view.container.innerHTML;
    frame(0); frame(interval); observers[0].deliver(interval);
    advance(179);
    expectState('full', 'default'); expect(view.container.innerHTML).toBe(before);
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
    advance(1);
    expectState(level, reason);
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBe(interval === 80 ? 'frame-in-flight' : 'full');
    expect(observers[0].takeRecords).toHaveBeenCalledOnce(); expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(frames.size).toBe(0); expect(motion.observeInFlight(180)).toBeUndefined();
    view.unmount(); mount();
    expectState(level, reason); expect(motion.observeInFlight(180)).toBeUndefined();
    expect(observers).toHaveLength(1);
  });

  it('preserves the completed automatic result across manual full and automatic reset', () => {
    mount(); act(() => { motion.observeInFlight(180); });
    frame(0); frame(80); advance(180); expectState('reduced', 'frame-in-flight');
    choose('标准'); expectState('full', 'manual');
    expect(screen.getByText('已手动选择，当前：标准（原因：手动选择）')).toBeVisible();
    expect(motion.observeInFlight(180)).toBeUndefined();
    choose('自动'); expectState('reduced', 'frame-in-flight');
    expect(screen.getByText('自动跟随系统与设备能力，当前：精简（原因：动画中帧率偏低）')).toBeVisible();
    expect(observers).toHaveLength(1);
  });

  it('does not sample a manual standard choice even while an actual wheel animates', () => {
    localStorage.setItem('yunqi-motion', 'full');
    const wheel = mapLearning(createLearningDto()).annualWheel;
    mount(<YunQiWheel viewModel={wheel} />);
    expect(animations).toHaveLength(2); expectState('full', 'manual');
    expect(motion.observeInFlight(180)).toBeUndefined(); expect(observers).toHaveLength(0);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    advance(1000); expectState('full', 'manual');
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
  });

  it('cancels immediately when the user selects standard during sampling, without saving a partial result', () => {
    mount(); act(() => { motion.observeInFlight(180); }); frame(0); frame(80);
    choose('标准'); expectState('full', 'manual');
    expect(observers[0].disconnect).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    advance(180); expectState('full', 'manual');
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
    choose('自动'); expectState('full', 'default');
    act(() => { motion.observeInFlight(180); }); expect(observers).toHaveLength(2);
  });

  it.each(['get', 'set', 'both'] as const)('keeps a one-shot memory result when sessionStorage %s throws', failure => {
    const getItem = vi.fn((key: string) => {
      if (failure !== 'set') throw new Error('blocked read');
      return key === 'yunqi-motion-frame-rate' ? 'full' : null;
    });
    const setItem = vi.fn(() => { if (failure !== 'get') throw new Error('blocked write'); });
    vi.stubGlobal('sessionStorage', { getItem, setItem });
    const view = mount(<p key="first">会话内容</p>);
    fireEvent.pointerDown(document.body); // Abandon any idle probe after the blocked read.
    act(() => { motion.observeInFlight(180); }); frame(0); frame(80); advance(180);
    expectState('reduced', 'frame-in-flight');
    expect(setItem).toHaveBeenCalledExactlyOnceWith('yunqi-motion-frame-in-flight', 'frame-in-flight');
    choose('标准'); choose('自动');
    view.rerender(<MotionProvider><ThemeProvider><ReadMotion /><MotionSettings /><p key="second">新挂载内容</p></ThemeProvider></MotionProvider>);
    expectState('reduced', 'frame-in-flight'); expect(motion.observeInFlight(180)).toBeUndefined();
    expect(observers).toHaveLength(1);
  });

  it('stops an unfinished idle probe after an in-flight hit so the reason cannot be overwritten', () => {
    sessionStorage.removeItem('yunqi-motion-frame-rate');
    mount();
    expect(frames.size).toBe(1); // Idle's primer has not run yet.
    act(() => { motion.observeInFlight(180); });
    observers[0].deliver(80); advance(180);
    expectState('reduced', 'frame-in-flight'); expect(frames.size).toBe(0);
    expect(sessionStorage.getItem('yunqi-motion-frame-rate')).toBeNull();
  });

  it('cancels on provider unmount and permits a later complete sample', () => {
    const view = mount(); act(() => { motion.observeInFlight(180); }); frame(0); frame(80);
    view.unmount(); advance(180);
    expect(observers[0].disconnect).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
    mount(); act(() => { motion.observeInFlight(180); }); frame(0); frame(16); advance(180);
    expectState('full', 'default'); expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBe('full');
  });

  it('provides no observer outside the provider', () => {
    function Standalone() { return <output>{String(useMotionInFlightObserver())}</output>; }
    render(<Standalone />); expect(screen.getByText('undefined')).toBeVisible();
  });
});

function Entries() {
  const [wheel, setWheel] = useState(false);
  const [selection, setSelection] = useState<'a' | 'b'>('a');
  return <MemoryRouter initialEntries={['/yunqi/current']}><PanelNavigation>
    <Link to="/yunqi/birth">切换先天</Link><Link to="/yunqi/current">切回当下</Link>
    <SegmentedControl label="真实分段" value={selection} onChange={setSelection}
      segments={[{ value: 'a', label: '第一段' }, { value: 'b', label: '第二段' }]} />
    <button onClick={() => setWheel(true)}>绘制年轮</button>
    {wheel && <YunQiWheel viewModel={mapLearning(createLearningDto()).annualWheel} />}
  </PanelNavigation></MemoryRouter>;
}
describe('three real animation entry points', () => {
  it.each(['navigation', 'wheel', 'segment'] as const)('lets %s win, rejects concurrent entry points, and never samples again after completion', async first => {
    mount(<Entries />);
    if (first === 'navigation') {
      fireEvent.click(screen.getByRole('link', { name: '切换先天' }));
      await act(async () => {}); // Real transition ready arms the duration.
    } else if (first === 'wheel') fireEvent.click(screen.getByRole('button', { name: '绘制年轮' }));
    else fireEvent.click(screen.getByRole('radio', { name: '第二段' }));
    expect(observers).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '绘制年轮' }));
    fireEvent.click(screen.getByRole('radio', { name: '第二段' }));
    fireEvent.click(screen.getByRole('link', { name: '切换先天' }));
    await act(async () => {});
    expect(observers).toHaveLength(1);
    frame(0); frame(16); advance(first === 'wheel' ? 319 : 179);
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
    advance(1); expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBe('full');
    fireEvent.click(screen.getByRole('radio', { name: '第一段' }));
    fireEvent.click(screen.getByRole('link', { name: '切回当下' }));
    await act(async () => {}); advance(320);
    expect(observers).toHaveLength(1); expectState('full', 'default');
  });

  it('restarts a StrictMode wheel after cleanup, preserves the current animation, then downgrades', () => {
    const wheel = mapLearning(createLearningDto()).annualWheel;
    render(<StrictMode><MotionProvider><ThemeProvider><ReadMotion /><YunQiWheel viewModel={wheel} /></ThemeProvider></MotionProvider></StrictMode>);
    expect(observers).toHaveLength(2);
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(animations.slice(0, 2).every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
    frame(0); frame(80); observers[1].deliver(80);
    advance(319); expectState('full', 'default');
    expect(animations.slice(2).every(animation => animation.cancel.mock.calls.length === 0)).toBe(true);
    advance(1); expectState('reduced', 'frame-in-flight');
    expect(animations.slice(2).every(animation => animation.cancel.mock.calls.length === 1)).toBe(true);
  });

  it.each(['selection', 'resize'] as const)('cancels an interrupted segment sample on %s without recording', interruption => {
    mount(<Entries />); fireEvent.click(screen.getByRole('radio', { name: '第二段' }));
    frame(0); frame(80);
    if (interruption === 'resize') act(() => resize());
    else fireEvent.click(screen.getByRole('radio', { name: '第一段' }));
    expect(observers[0].disconnect).toHaveBeenCalledOnce();
    expect(observers[0].takeRecords).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
    if (interruption === 'selection') {
      expect(observers).toHaveLength(2); frame(100); frame(116); advance(180);
      expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBe('full');
    } else {
      advance(180); expect(sessionStorage.getItem('yunqi-motion-frame-in-flight')).toBeNull();
      expect(screen.getByRole('radiogroup', { name: '真实分段' })).toHaveAttribute('data-indicator-animated', 'false');
    }
  });
});

describe('settings copy and the current-page diagnostic location', () => {
  it.each([
    ['default', 'full', 'default', '自动跟随系统与设备能力，当前：标准（原因：默认）'],
    ['manual-full', 'full', 'manual', '已手动选择，当前：标准（原因：手动选择）'],
    ['manual-reduced', 'reduced', 'manual', '已手动选择，当前：精简（原因：手动选择）'],
    ['manual-off', 'off', 'manual', '已手动选择，当前：关闭（原因：手动选择）'],
    ['url', 'off', 'url', '自动跟随系统与设备能力，当前：关闭（原因：URL 参数）'],
    ['forced-colors', 'off', 'forced-colors', '自动跟随系统与设备能力，当前：关闭（原因：高对比度）'],
    ['no-has', 'off', 'no-has', '自动跟随系统与设备能力，当前：关闭（原因：内核过旧）'],
    ['system', 'reduced', 'system', '自动跟随系统与设备能力，当前：精简（原因：系统减少动态效果）'],
    ['no-view-transition', 'reduced', 'no-view-transition', '自动跟随系统与设备能力，当前：精简（原因：缺视图过渡）'],
    ['frame-idle', 'reduced', 'frame-idle', '自动跟随系统与设备能力，当前：精简（原因：空闲帧率偏低）'],
    ['frame-in-flight', 'reduced', 'frame-in-flight', '自动跟随系统与设备能力，当前：精简（原因：动画中帧率偏低）'],
  ])('renders %s from the actual provider inside More → calculation details → trace', (scenario, level, reason, status) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome/109.0');
    if (scenario.startsWith('manual-')) localStorage.setItem('yunqi-motion', level);
    if (scenario === 'url') window.history.replaceState({}, '', '/yunqi/current?motion=off');
    if (scenario === 'no-has') vi.stubGlobal('CSS', { supports: () => false });
    if (scenario === 'no-view-transition') Reflect.deleteProperty(document, 'startViewTransition');
    if (scenario === 'frame-idle') sessionStorage.setItem('yunqi-motion-frame-rate', 'reduced');
    if (scenario === 'frame-in-flight') sessionStorage.setItem('yunqi-motion-frame-in-flight', 'frame-in-flight');
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: scenario === 'system' && query.includes('reduced-motion')
        || scenario === 'forced-colors' && query.includes('forced-colors'),
      addEventListener() {}, removeEventListener() {},
    }));
    const learning = mapLearning(createLearningDto());
    render(<MotionProvider><ThemeProvider><ReadMotion /><MemoryRouter>
      <CurrentYunQiPage viewModel={learning.facts} learning={learning} />
    </MemoryRouter></ThemeProvider></MotionProvider>);
    expectState(level, reason);
    const labels: Record<string, string> = { full: '标准', reduced: '精简', off: '关闭' };
    const diagnostic = `动效 ${labels[level]}\u202f·\u202f${reason}\u202f·\u202fChromium 109`;
    const textOptions = { exact: true, normalizer: (text: string) => text };
    const line = screen.getByText(diagnostic, textOptions);
    expect(line).not.toBeVisible();
    const technical = screen.getByText('计算说明与版本').closest('details')!;
    const more = screen.getByRole('navigation', { name: '更多运气分析' });
    expect(more).toContainElement(technical);
    expect(technical).toContainElement(line);
    technical.open = true;
    expect(screen.getByRole('region', { name: '追溯信息' })).toContainElement(line);
    expect(line).toBeVisible(); expect(screen.getAllByText(diagnostic, textOptions)).toHaveLength(1);
    screen.getByText('动效设置').closest('details')!.open = true;
    expect(screen.getByText(status, { exact: true })).toBeVisible();
  });
});
