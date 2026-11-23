import { readFileSync } from 'node:fs';
import { StrictMode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MotionLevel } from '../providers/MotionProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { SessionVisibility } from '../components/layout/SessionVisibility';
import { PanelShell } from '../components/layout/PanelShell';
import { YunQiWheel } from '../features/yunqi/components/YunQiWheel';
import { CurrentPeriodGrid } from '../features/yunqi/components/CurrentPeriodGrid';
import { BirthComparisonPage } from '../features/yunqi/birth/components/BirthComparisonPage';
import { mapLearning } from '../features/yunqi/presentation/map-learning';
import { createClientStub, createLearningDto } from './learning-fixtures';
import { createTestWrapper } from './test-utils';
import { fillBirthDate } from './birth-input';
import { animateMotion, motionMilliseconds } from '../lib/motion';
import { CurrentYunQiView } from '../features/yunqi/components/CurrentYunQiView';
import { focusManager } from '@tanstack/react-query';

const motion = vi.hoisted(() => ({ level: 'full' as MotionLevel }));
vi.mock('../providers/MotionProvider', async importOriginal => ({
  ...await importOriginal<typeof import('../providers/MotionProvider')>(),
  useMotionLevel: () => motion.level,
}));

const effects: { target: Element; frames: Keyframe[]; options: KeyframeAnimationOptions; cancel: ReturnType<typeof vi.fn> }[] = [];
let style: HTMLStyleElement;
const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate');
beforeEach(() => {
  vi.useFakeTimers();
  motion.level = 'full';
  sessionStorage.clear();
  effects.length = 0;
  // jsdom does not resolve inherited custom properties on SVG. Put the actual
  // source token declarations on every node; timing expectations stay literal.
  style = document.createElement('style');
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  style.textContent = `* { ${css.slice(css.indexOf('{') + 1, css.indexOf('}'))} }`;
  document.head.append(style);
  Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: vi.fn(function (this: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const effect = { target: this, frames, options, cancel: vi.fn() };
    effects.push(effect);
    return effect;
  }) });
});
afterEach(() => {
  style.remove();
  if (originalAnimate) Object.defineProperty(Element.prototype, 'animate', originalAnimate);
  else Reflect.deleteProperty(Element.prototype, 'animate');
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const learning = mapLearning(createLearningDto());
function changedLearning() {
  const dto = createLearningDto();
  const movements = ['初运', '二运', '三运', '四运', '终运'].map((name, index) => ({ ...dto.currentMovement, index: index + 1, name }));
  return mapLearning({ ...dto, movements, facts: { ...dto.facts, currentStep: dto.facts.sixQi.steps[1]! }, currentMovement: movements[2]! });
}

describe('M1-d wheel and changed columns', () => {
  it('draws clockwise using dash offset once per session, including StrictMode, with visible final defaults', () => {
    const view = render(<StrictMode><YunQiWheel viewModel={learning.annualWheel} /></StrictMode>);
    expect(screen.getByRole('img').querySelectorAll('linearGradient, clipPath, mask')).toHaveLength(0);
    expect(effects.length).toBeGreaterThanOrEqual(2);
    for (const effect of effects) {
      expect(effect.frames).toEqual([{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }]);
      expect(effect.options.duration).toBe(320);
      expect(effect.target).toHaveAttribute('stroke-dashoffset', '0');
      expect(effect.target.getAttribute('d')).toContain('0 0 1');
      expect(effect.target.closest('.is-current')).not.toBeNull();
      expect(effect.target).toHaveAttribute('pathLength', '1');
      expect(effect.target).toHaveAttribute('stroke-dasharray', '1');
    }
    expect(screen.getByRole('heading', { name: learning.annualWheel.ganzhi })).toBeVisible();
    expect(sessionStorage.getItem('yunqi-wheel-drawn')).toBe('true');
    act(() => vi.advanceTimersByTime(320));
    view.unmount();
    effects.length = 0;
    render(<YunQiWheel viewModel={learning.annualWheel} />);
    expect(effects).toEqual([]);
  });

  it.each(['reduced', 'off'] as const)('shows final highlights without reveal or refresh animation in %s', level => {
    motion.level = level;
    const view = render(<YunQiWheel viewModel={learning.annualWheel} />);
    view.rerender(<YunQiWheel viewModel={changedLearning().annualWheel} />);
    expect(effects).toEqual([]);
    expect(screen.getByRole('img').querySelectorAll('linearGradient, clipPath, mask')).toHaveLength(0);
    expect(screen.getByRole('img').querySelectorAll('.is-current')).toHaveLength(2);
    expect(screen.getByRole('img').querySelectorAll('[data-outgoing]')).toHaveLength(0);
    for (const path of screen.getByRole('img').querySelectorAll('.current-wheel-reveal')) {
      expect(path).toHaveAttribute('stroke-dashoffset', '0');
      expect(path).toHaveAttribute('stroke-dasharray', '1');
      expect(path).toHaveStyle({ fillOpacity: '0' });
    }
  });

  it('crossfades only changed highlights and emphasizes only the changed title for 600ms', () => {
    sessionStorage.setItem('yunqi-wheel-drawn', 'true');
    function Content({ next = false }: { next?: boolean }) {
      const data = next ? changedLearning() : learning;
      return <><YunQiWheel viewModel={data.annualWheel} /><CurrentPeriodGrid learning={data} /></>;
    }
    const view = render(<Content />);
    view.rerender(<Content next />);
    expect(effects.map(effect => effect.options.duration)).toEqual([120, 180, 120, 180]);
    expect(screen.getByRole('img').querySelectorAll('[data-outgoing]')).toHaveLength(2);
    expect(view.container.querySelectorAll('[data-emphasized="true"]')).toHaveLength(2);
    expect(view.container.querySelector('[aria-live]')).toBeNull();
    act(() => vi.advanceTimersByTime(120));
    expect(screen.getByRole('img').querySelectorAll('[data-outgoing]')).toHaveLength(0);
    act(() => vi.advanceTimersByTime(479));
    expect(view.container.querySelectorAll('[data-emphasized="true"]')).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(view.container.querySelectorAll('[data-emphasized="true"]')).toHaveLength(0);
    const onlyQi = { ...learning, facts: { ...learning.facts, currentStep: changedLearning().facts.currentStep } };
    view.rerender(<CurrentPeriodGrid learning={learning} />);
    view.rerender(<CurrentPeriodGrid learning={onlyQi} />);
    expect(within(screen.getByRole('region', { name: '当步气' })).getByRole('heading').parentElement).toHaveAttribute('data-emphasized', 'true');
    expect(within(screen.getByRole('region', { name: '当步运' })).getByRole('heading').parentElement).toHaveAttribute('data-emphasized', 'false');
  });

  it('silently tolerates storage/WAAPI failures and cancels effects immediately on downgrade', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const view = render(<YunQiWheel viewModel={learning.annualWheel} />);
    motion.level = 'reduced';
    view.rerender(<YunQiWheel viewModel={learning.annualWheel} />);
    expect(effects.every(effect => effect.cancel.mock.calls.length === 1)).toBe(true);
    expect(screen.getByRole('img').querySelector('mask')).toBeNull();
    view.unmount();
    motion.level = 'full';
    Object.defineProperty(Element.prototype, 'animate', { configurable: true, value: () => { throw new Error('unsupported'); } });
    expect(() => render(<YunQiWheel viewModel={learning.annualWheel} />)).not.toThrow();
  });

  it('keeps the current highlights visible if writing the session marker or calling WAAPI fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('read-only'); });
    Reflect.deleteProperty(Element.prototype, 'animate');
    render(<YunQiWheel viewModel={learning.annualWheel} />);
    const svg = screen.getByRole('img');
    expect(svg.firstElementChild).toHaveStyle({ fill: 'var(--surface-sunken)' });
    expect(svg.firstElementChild?.querySelectorAll('path')).toHaveLength(11);
    expect(svg.querySelectorAll('linearGradient, clipPath, mask, [mask], [clip-path]')).toHaveLength(0);
    expect(svg.querySelector('[data-ring="qi"] .is-current > path')).toHaveStyle({ stroke: 'var(--accent)', fillOpacity: '0' });
    expect(svg.querySelector('[data-ring="movement"] .is-current')).toHaveStyle({ stroke: 'var(--relation-favorable-fg)', fillOpacity: '0' });
    for (const path of svg.querySelectorAll('.current-wheel-reveal')) expect(path).toHaveAttribute('stroke-dashoffset', '0');
    expect(effects).toEqual([]);
    svg.style.setProperty('--test-seconds', '0.12s');
    expect(motionMilliseconds(svg, '--test-seconds')).toBe(120);
  });

  it('refreshes the visible view at the real polling interval, while focus alone does not fetch', async () => {
    const client = createClientStub();
    const view = render(<CurrentYunQiView />, { wrapper: createTestWrapper(client) });
    try {
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(screen.getByRole('img', { name: /^年轮/ })).toBeVisible();
      expect(client.getLearningCurrent).toHaveBeenCalledOnce();
      await act(async () => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(client.getLearningCurrent).toHaveBeenCalledOnce();
      await act(async () => { await vi.advanceTimersByTimeAsync(59_998); });
      expect(client.getLearningCurrent).toHaveBeenCalledOnce();
      await act(async () => { await vi.advanceTimersByTimeAsync(1); });
      expect(client.getLearningCurrent).toHaveBeenCalledTimes(2);
      await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
      expect(client.getLearningCurrent).toHaveBeenCalledTimes(3);
    } finally {
      view.unmount();
      focusManager.setFocused(undefined);
    }
  });
});

describe('M1-d host sequencing', () => {
  it.each(['full', 'reduced', 'off'] as const)('preserves focus, draft and scroll through one-step collapse/expand in %s', level => {
    motion.level = level;
    const calls: string[] = [];
    const collapseHost = vi.fn(() => {
      expect(screen.getByRole('main')).toBeVisible();
      calls.push('shrink');
    });
    const expandHost = vi.fn(() => {
      expect(screen.getByRole('button', { name: /^展开运气通/ })).toBeVisible();
      expect(screen.queryByRole('main')).toBeNull();
      calls.push('enlarge');
    });
    const view = render(<MemoryRouter><ThemeProvider><PanelShell onBeforeCollapse={collapseHost} onAfterExpand={expandHost}><input aria-label="草稿" defaultValue="保留" /></PanelShell></ThemeProvider></MemoryRouter>);
    const main = screen.getByRole('main');
    main.scrollTop = 123;
    fireEvent.click(screen.getByRole('button', { name: '收起为胶囊条' }));
    if (level !== 'off') {
      act(() => vi.advanceTimersByTime(119));
      expect(collapseHost).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
    }
    expect(collapseHost).toHaveBeenCalledOnce();
    const pill = screen.getByRole('button', { name: /^展开运气通/ });
    expect(pill).toHaveFocus();
    fireEvent.click(pill);
    if (level !== 'off') {
      act(() => vi.advanceTimersByTime(119));
      expect(expandHost).not.toHaveBeenCalled();
      act(() => vi.advanceTimersByTime(1));
    }
    expect(calls).toEqual(['shrink', 'enlarge']);
    expect(screen.getByRole('button', { name: '收起为胶囊条' })).toHaveFocus();
    expect(screen.getByLabelText('草稿')).toHaveValue('保留');
    expect(main.scrollTop).toBe(123);
    act(() => vi.advanceTimersByTime(240));
    expect(view.container.querySelector('.panel-viewport')).toHaveAttribute('data-panel-phase', 'expanded');
  });

  it('finishes a pending collapse synchronously on off, and cleans pending notifications on unmount', () => {
    const host = vi.fn();
    function Content() { return <MemoryRouter><ThemeProvider><PanelShell onBeforeCollapse={host}>内容</PanelShell></ThemeProvider></MemoryRouter>; }
    const view = render(<Content />);
    fireEvent.click(screen.getByRole('button', { name: '收起为胶囊条' }));
    motion.level = 'off';
    view.rerender(<Content />);
    expect(host).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /^展开运气通/ }));
    motion.level = 'full';
    view.rerender(<Content />);
    fireEvent.click(screen.getByRole('button', { name: '收起为胶囊条' }));
    view.unmount();
    act(() => vi.advanceTimersByTime(400));
    expect(host).toHaveBeenCalledOnce();
  });
});

describe('M1-d birth input', () => {
  it.each(['full', 'reduced', 'off'] as const)('clears after fast rendering time with a status and year focus in %s', async level => {
    motion.level = level;
    render(<BirthComparisonPage onAssess={vi.fn()} onDiscardAssessment={vi.fn()} ended={0} />, { wrapper: createTestWrapper(createClientStub(), '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    fireEvent.click(screen.getByRole('button', { name: '清空本次资料' }));
    if (level !== 'off') {
      act(() => vi.advanceTimersByTime(119));
      expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1990');
      act(() => vi.advanceTimersByTime(1));
    }
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: '年' })).toHaveFocus();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status').textContent).toBe('已清空本次资料');
    expect(screen.getByRole('status')).not.toHaveTextContent(/\d|出生/);
    // 4.7 has no timed removal: this fixed announcement lasts until the next
    // edit/submit or unmount, unlike 4.9's timed answer-destruction notice.
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('status').textContent).toBe('已清空本次资料');
    fillBirthDate('1991-06-13');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await act(async () => {});
  });

  it('cancels an old clear when editing and finishes a hidden retained clear without stealing focus', async () => {
    function Content({ visible }: { visible: boolean }) { return <SessionVisibility.Provider value={visible}><BirthComparisonPage onAssess={vi.fn()} onDiscardAssessment={vi.fn()} ended={0} /></SessionVisibility.Provider>; }
    const view = render(<Content visible />, { wrapper: createTestWrapper(createClientStub(), '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    fireEvent.click(screen.getByRole('button', { name: '清空本次资料' }));
    fillBirthDate('1991-05-12');
    act(() => vi.advanceTimersByTime(120));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('1991');
    fireEvent.click(screen.getByRole('button', { name: '清空本次资料' }));
    const outside = screen.getByRole('link', { name: '当下运气' });
    outside.focus();
    view.rerender(<Content visible={false} />);
    expect(screen.getByRole('textbox', { name: '年' })).toHaveValue('');
    expect(outside).toHaveFocus();
    await act(async () => {});
  });

  it('collapses the submitted input height, reopens with year focus, and ignores absent WAAPI', async () => {
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return DOMRect.fromRect({ height: this.querySelector('form') ? 200 : 30 });
    });
    render(<BirthComparisonPage onAssess={vi.fn()} onDiscardAssessment={vi.fn()} ended={0} />, { wrapper: createTestWrapper(createClientStub(), '/yunqi/birth') });
    fillBirthDate('1990-05-12');
    fireEvent.submit(screen.getByRole('form', { name: '出生运气输入' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByRole('group', { name: '出生资料摘要' })).toBeVisible();
    expect(effects.some(effect => effect.options.duration === 180 && effect.frames[0]?.height === '200px' && effect.frames[1]?.height === '30px')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '修改' }));
    expect(screen.getByRole('textbox', { name: '年' })).toHaveFocus();
    expect(effects.some(effect => effect.frames[0]?.height === '30px' && effect.frames[1]?.height === '200px')).toBe(true);
    Reflect.deleteProperty(Element.prototype, 'animate');
    expect(animateMotion(screen.getByRole('form'), 'full', [{ opacity: 0 }, { opacity: 1 }], '--motion-base')).toBeUndefined();
    expect(animateMotion(null, 'full', [], '--motion-base')).toBeUndefined();
    expect(motionMilliseconds(document.body, '--missing-token')).toBe(0);
    bounds.mockRestore();
  });
});
