import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { MotionProvider } from './MotionProvider';

function ThemeControl() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      切换至{theme === 'light' ? '深色' : '浅色'}主题
    </button>
  );
}

describe('ThemeProvider', () => {
  it('applies the design token theme to the existing data-theme wrapper', async () => {
    const user = userEvent.setup();
    const style = document.createElement('style');
    style.textContent = readFileSync('src/styles/tokens.css', 'utf8');
    document.head.append(style);
    try {
      const { container } = render(<ThemeProvider><ThemeControl /></ThemeProvider>);
      const wrapper = container.firstElementChild!;
      expect(getComputedStyle(wrapper).getPropertyValue('--surface-page').trim()).toBe('#fbfaf7');
      expect(getComputedStyle(wrapper).getPropertyValue('--accent').trim()).toBe('#2e5b4f');

      await user.click(screen.getByRole('button', { name: '切换至深色主题' }));
      expect(getComputedStyle(wrapper).getPropertyValue('--surface-page').trim()).toBe('#151816');
      expect(getComputedStyle(wrapper).getPropertyValue('--accent').trim()).toBe('#7fb3a2');

      await user.click(screen.getByRole('button', { name: '切换至浅色主题' }));
      expect(getComputedStyle(wrapper).getPropertyValue('--surface-page').trim()).toBe('#fbfaf7');
    } finally {
      style.remove();
    }
  });

  it('keeps the UA color scheme aligned with the explicit theme', () => {
    const stylesheet = readFileSync(
      'src/styles/global.css',
      'utf8',
    );
    const rootDeclarations = stylesheet.match(/:root\s*\{([^}]*)\}/s)?.[1];
    const darkThemeDeclarations = stylesheet.match(
      /\.theme-root\[data-theme="dark"\]\s*\{([^}]*)\}/s,
    )?.[1];

    expect(rootDeclarations).toContain('color-scheme: light;');
    expect(rootDeclarations).not.toContain('color-scheme: light dark;');
    expect(darkThemeDeclarations).toContain('color-scheme: dark;');
  });

  it('starts in light mode and explicitly toggles to dark mode', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>,
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute('data-theme', 'light');

    await user.click(
      screen.getByRole('button', { name: '切换至深色主题' }),
    );

    expect(wrapper).toHaveAttribute('data-theme', 'dark');
    expect(
      screen.getByRole('button', { name: '切换至浅色主题' }),
    ).toBeInTheDocument();
  });
});

describe('atomic theme switching', () => {
  const original = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  function frame() {
    act(() => {
      const callbacks = [...frames.values()]; frames.clear();
      for (const callback of callbacks) callback(0);
    });
  }
  function mount(level: string) {
    localStorage.setItem('yunqi-motion', level === 'missing-api' ? 'full' : level);
    sessionStorage.setItem('yunqi-motion-frame-rate', 'full');
    vi.stubGlobal('CSS', { supports: () => true });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback); return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle));
    const start = vi.fn((callback: () => void) => {
      expect(document.documentElement).toHaveAttribute('data-view-transition', 'theme');
      callback();
      return { ready: Promise.resolve(), updateCallbackDone: Promise.resolve(),
        get finished() { throw new Error('must not wait for animation'); } };
    });
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: level === 'missing-api' ? undefined : start });
    const view = render(<MotionProvider><ThemeProvider><ThemeControl /></ThemeProvider></MotionProvider>);
    return { ...view, start, root: view.container.firstElementChild! };
  }
  afterEach(() => {
    vi.unstubAllGlobals(); vi.useRealTimers(); frames.clear();
    localStorage.clear(); sessionStorage.clear();
    delete document.documentElement.dataset.viewTransition;
    if (original) Object.defineProperty(document, 'startViewTransition', original);
    else Reflect.deleteProperty(document, 'startViewTransition');
  });

  it.each(['full', 'reduced', 'off', 'missing-api'])('commits colors together and removes suppression after two frames in %s', level => {
    const { root, start } = mount(level);
    fireEvent.click(screen.getByRole('button', { name: '切换至深色主题' }));
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root).toHaveAttribute('data-theme-switching');
    expect(start).toHaveBeenCalledTimes(level === 'full' ? 1 : 0);
    frame(); expect(root).toHaveAttribute('data-theme-switching');
    frame(); expect(root).not.toHaveAttribute('data-theme-switching');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });

  it('restarts the two-frame cleanup on a rapid second toggle and cancels it on unmount', () => {
    const { root, unmount } = mount('full');
    fireEvent.click(screen.getByRole('button', { name: '切换至深色主题' }));
    frame();
    fireEvent.click(screen.getByRole('button', { name: '切换至浅色主题' }));
    expect(root).toHaveAttribute('data-theme', 'light');
    frame(); expect(root).toHaveAttribute('data-theme-switching');
    expect(frames.size).toBe(1);
    unmount(); expect(frames.size).toBe(0);
  });

  it('releases suppression with timers when requestAnimationFrame is absent', () => {
    vi.useFakeTimers();
    const { root, unmount } = mount('off');
    vi.stubGlobal('requestAnimationFrame', undefined);
    fireEvent.click(screen.getByRole('button', { name: '切换至深色主题' }));
    expect(root).toHaveAttribute('data-theme-switching');
    act(() => { vi.advanceTimersByTime(16); });
    expect(root).toHaveAttribute('data-theme-switching');
    act(() => { vi.advanceTimersByTime(16); });
    expect(root).not.toHaveAttribute('data-theme-switching');
    fireEvent.click(screen.getByRole('button', { name: '切换至浅色主题' }));
    unmount(); expect(vi.getTimerCount()).toBe(0);
  });
});
