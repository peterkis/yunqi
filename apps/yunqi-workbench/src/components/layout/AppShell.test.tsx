import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('provides semantic landmarks and route-aware links', () => {
    render(
      <MemoryRouter initialEntries={['/yunqi/year/2026']}>
        <ThemeProvider>
          <AppShell>
            <h1>Workbench 基础架构</h1>
          </AppShell>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent('TCM YunQi Lab');
    expect(banner).toHaveTextContent('临床教学工作台 · 只读');
    expect(banner).not.toHaveTextContent('当前视图');

    const navigation = screen.getByRole('navigation', {
      name: '工作台导航',
    });
    expect(within(navigation).getByRole('link', { name: /当前/ })).toHaveAttribute(
      'href',
      '/yunqi/current',
    );
    expect(
      within(navigation).getByRole('link', { name: /年度分析/ }),
    ).toHaveAttribute('aria-current', 'page');

    expect(
      within(navigation).getByRole('link', { name: /问诊/ }),
    ).toHaveAttribute('href', '/yunqi/inquiry');

    expect(
      within(screen.getByRole('main')).getByRole('heading', {
        name: 'Workbench 基础架构',
      }),
    ).toBeInTheDocument();
  });

  it('marks only the exact inquiry entry active', () => {
    render(
      <MemoryRouter initialEntries={['/yunqi/inquiry']}>
        <ThemeProvider>
          <AppShell>
            <h1>问诊结构化入口</h1>
          </AppShell>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const navigation = screen.getByRole('navigation', {
      name: '工作台导航',
    });
    expect(
      within(navigation).getByRole('link', { name: /问诊/ }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(navigation).getByRole('link', { name: /年度分析/ }),
    ).not.toHaveAttribute('aria-current');
  });
});
