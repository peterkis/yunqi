import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PanelShell } from '../components/layout/PanelShell';
import { MotionProvider } from '../providers/MotionProvider';
import { ThemeProvider } from '../providers/ThemeProvider';

const originalTransition = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
let showEntry: () => void;
let initiallyVisible = true;
const snapshots: { old: string; next: string; direction?: string }[] = [];
const start = vi.fn((callback: () => void) => {
  const old = screen.getByRole('main').textContent!;
  const direction = document.documentElement.dataset.navigationDirection;
  callback();
  snapshots.push({ old, next: screen.getByRole('main').textContent!, direction });
  return { ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
});

function Current() {
  const [visible, setVisible] = useState(initiallyVisible);
  showEntry = () => setVisible(true);
  return <>{visible ? <Link to="/yunqi/current/classics">原文入口</Link> : <p>查询中</p>}
    <Link to="/yunqi/year">年度入口</Link></>;
}
function Annual() {
  const navigate = useNavigate();
  return <button onClick={() => { void navigate('/yunqi/year/2025', { replace: true }); }}>改年份</button>;
}
function Reader() {
  const navigate = useNavigate();
  return <><p>原文内容</p><button onClick={() => { void navigate(-1); }}>历史返回</button></>;
}
function LocationProbe() {
  return <output aria-label="测试路径">{useLocation().pathname}</output>;
}
function mount(initialEntry = '/yunqi/current') {
  return render(<MemoryRouter initialEntries={[initialEntry]} useTransitions={false}>
    <MotionProvider><ThemeProvider><LocationProbe /><PanelShell><Routes>
      <Route path="/yunqi/current" element={<Current />} />
      <Route path="/yunqi/current/classics" element={<Reader />} />
      <Route path="/yunqi/year/:year?" element={<Annual />} />
      <Route path="/yunqi/birth" element={<p>出生输入</p>} />
      <Route path="/yunqi/constitution" element={<p>性别选择</p>} />
    </Routes></PanelShell></ThemeProvider></MotionProvider>
  </MemoryRouter>);
}

beforeEach(() => {
  initiallyVisible = true; snapshots.length = 0; start.mockClear();
  localStorage.clear(); sessionStorage.setItem('yunqi-motion-frame-rate', 'full');
  vi.stubGlobal('CSS', { supports: () => true });
  Object.defineProperty(document, 'startViewTransition', { configurable: true, value: start });
});
afterEach(() => {
  vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear();
  delete document.documentElement.dataset.navigationDirection;
  delete document.documentElement.dataset.viewTransition;
  if (originalTransition) Object.defineProperty(document, 'startViewTransition', originalTransition);
  else Reflect.deleteProperty(document, 'startViewTransition');
});

describe('panel router navigation', () => {
  it('commits the route and heading in the next snapshot frame without waiting for animation readiness or completion', async () => {
    vi.useFakeTimers();
    try {
      start.mockImplementationOnce(callback => ({
        ready: new Promise<void>(() => {}),
        updateCallbackDone: new Promise<void>(resolve => {
          requestAnimationFrame(() => { callback(); resolve(); });
        }),
        get finished() { throw new Error('must not wait for animation completion'); },
      }));
      mount();
      fireEvent.click(screen.getByRole('link', { name: '原文入口' }));
      expect(screen.getByLabelText('测试路径')).toHaveTextContent(/^\/yunqi\/current$/);
      expect(screen.queryByRole('heading', { name: '原文与释义' })).not.toBeInTheDocument();

      await act(async () => { vi.advanceTimersToNextFrame(); });

      expect(screen.getByLabelText('测试路径')).toHaveTextContent(/^\/yunqi\/current\/classics$/);
      expect(screen.getByRole('heading', { name: '原文与释义' })).toBeVisible();
      expect(screen.getByText('原文内容')).toBeVisible();
      expect(screen.getByRole('main')).toHaveFocus();
      expect(start).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['throw', 'skip', 'callback-rejection'])('commits navigation exactly once after transition %s, including a late callback', async failure => {
    let lateCallback!: () => void;
    start.mockImplementationOnce(callback => {
      lateCallback = callback;
      if (failure === 'throw') throw new Error('snapshot unavailable');
      return {
        ready: Promise.reject(new Error('transition skipped')),
        updateCallbackDone: failure === 'skip'
          ? Promise.resolve().then(callback)
          : Promise.reject(new Error('callback not attempted')),
      };
    });
    mount();
    await act(async () => { fireEvent.click(screen.getByRole('link', { name: '原文入口' })); });
    expect(screen.getByLabelText('测试路径')).toHaveTextContent(/^\/yunqi\/current\/classics$/);
    expect(screen.getByRole('heading', { name: '原文与释义' })).toBeVisible();
    expect(screen.getByText('原文内容')).toBeVisible();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(start).toHaveBeenCalledOnce();

    await act(async () => { lateCallback(); });
    fireEvent.click(screen.getByRole('button', { name: '历史返回' }));
    // One back must reach the origin; a duplicate commit would stay in classics.
    expect(screen.getByLabelText('测试路径')).toHaveTextContent(/^\/yunqi\/current$/);
    expect(screen.getByRole('link', { name: '原文入口' })).toBeVisible();
  });

  it('commits main changes inside the transition callback and orders sibling and drilldown directions', () => {
    mount();
    const main = screen.getByRole('main');
    main.scrollTop = 90;
    fireEvent.click(screen.getByRole('link', { name: '体质量表' }));
    expect(main).toHaveFocus(); expect(main.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole('link', { name: '先天对照' }));
    fireEvent.click(screen.getByRole('link', { name: '当下运气' }));
    const entry = screen.getByRole('link', { name: '原文入口' });
    entry.focus(); main.scrollTop = 140;
    fireEvent.click(entry);
    expect(main).toHaveFocus(); expect(main.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByRole('link', { name: '原文入口' })).toHaveFocus();
    expect(main.scrollTop).toBe(140);
    expect(snapshots.map(snapshot => snapshot.direction)).toEqual(['forward', 'backward', 'backward', 'forward', 'backward']);
    expect(snapshots[0]).toMatchObject({ old: '原文入口年度入口', next: '性别选择' });
    expect(snapshots[3]).toMatchObject({ old: '原文入口年度入口', next: '原文内容历史返回' });
    expect(start).toHaveBeenCalledTimes(5);
  });

  it.each(['reduced', 'off', 'missing-api'])('restores scroll and the remounted entry without depending on animations in %s', mode => {
    if (mode === 'missing-api') Reflect.deleteProperty(document, 'startViewTransition');
    else localStorage.setItem('yunqi-motion', mode);
    mount();
    const main = screen.getByRole('main');
    for (const position of [134, 267]) {
      const entry = screen.getByRole('link', { name: '原文入口' });
      entry.focus(); main.scrollTop = position;
      fireEvent.click(entry);
      fireEvent.click(screen.getByRole('button', { name: '返回' }));
      expect(main.scrollTop).toBe(position);
      expect(screen.getByRole('link', { name: '原文入口' })).toHaveFocus();
    }
    expect(start).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute('data-view-transition', 'navigation-fallback');
  });

  it('restores the same key on browser history back', () => {
    mount();
    const entry = screen.getByRole('link', { name: '原文入口' });
    entry.focus(); screen.getByRole('main').scrollTop = 199;
    fireEvent.click(entry);
    fireEvent.click(screen.getByRole('button', { name: '历史返回' }));
    expect(screen.getByRole('link', { name: '原文入口' })).toHaveFocus();
    expect(screen.getByRole('main').scrollTop).toBe(199);
  });

  it('retains the origin through in-area replace/year edits and preserves control focus', () => {
    mount();
    const entry = screen.getByRole('link', { name: '年度入口' });
    entry.focus(); screen.getByRole('main').scrollTop = 155;
    fireEvent.click(entry);
    const change = screen.getByRole('button', { name: '改年份' });
    change.focus(); screen.getByRole('main').scrollTop = 45;
    fireEvent.click(change);
    expect(change).toHaveFocus(); expect(screen.getByRole('main').scrollTop).toBe(45);
    expect(start).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByRole('link', { name: '年度入口' })).toHaveFocus();
    expect(screen.getByRole('main').scrollTop).toBe(155);
  });

  it('retries restoration when the returning query renders its entry later', async () => {
    mount();
    const entry = screen.getByRole('link', { name: '原文入口' });
    entry.focus(); screen.getByRole('main').scrollTop = 188;
    fireEvent.click(entry);
    initiallyVisible = false;
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByRole('main')).toHaveFocus();
    await act(async () => { showEntry(); });
    await waitFor(() => expect(screen.getByRole('link', { name: '原文入口' })).toHaveFocus());
    expect(screen.getByRole('main').scrollTop).toBe(188);
  });

  it('uses main as the direct-visit return target and never writes navigation state to storage', () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const view = mount('/yunqi/current/classics');
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('main').scrollTop).toBe(0);
    expect(storage).not.toHaveBeenCalled();
    view.unmount(); storage.mockRestore();
  });
});
