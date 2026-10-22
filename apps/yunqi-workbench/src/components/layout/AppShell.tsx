import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../providers/ThemeProvider';
import { Navigation } from './Navigation';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Changing years keeps the selector's focus; switching work areas starts at
  // the new content, including when the sticky navigation is used mid-page.
  const workArea = pathname.split('/').slice(0, 3).join('/');
  const previousWorkArea = useRef(workArea);
  useEffect(() => {
    if (previousWorkArea.current !== workArea) {
      mainRef.current?.focus({ preventScroll: true });
      mainRef.current?.scrollIntoView?.({ block: 'start' });
    }
    previousWorkArea.current = workArea;
  }, [workArea]);
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === 'light' ? '深色' : '浅色';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workbench-content">跳至主要内容</a>
      <header className="product-header">
        <div className="product-lockup">
          <span className="product-seal" aria-hidden="true">
            运
          </span>
          <div>
            <p className="product-kicker">中医五运六气 · 结构化原型系统</p>
            <h1 className="product-name">TCM YunQi Lab</h1>
          </div>
        </div>
        <div className="header-status">
          <span className="foundation-status">临床教学工作台 · 只读</span>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={`切换至${nextThemeLabel}主题`}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {theme === 'light' ? (
                <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
                </>
              )}
            </svg>
            {nextThemeLabel}
          </button>
        </div>
      </header>

      <div className="shell-body">
        <Navigation />
        <main className="workbench-main" id="workbench-content" ref={mainRef} tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
