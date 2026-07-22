import type { ReactNode } from 'react';
import { useTheme } from '../../providers/ThemeProvider';
import { Navigation } from './Navigation';

interface AppShellProps {
  readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === 'light' ? '深色' : '浅色';

  return (
    <div className="app-shell">
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
            <span aria-hidden="true">{theme === 'light' ? '夜' : '昼'}</span>
            {nextThemeLabel}
          </button>
        </div>
      </header>

      <div className="shell-body">
        <Navigation />
        <main className="workbench-main">{children}</main>
      </div>
    </div>
  );
}
