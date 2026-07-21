import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('provides semantic landmarks, route links, and a disabled inquiry item', () => {
    render(
      <MemoryRouter initialEntries={['/yunqi/year/2026']}>
        <ThemeProvider>
          <AppShell>
            <h1>Workbench 基础架构</h1>
          </AppShell>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('TCM YunQi Lab');

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

    const inquiry = within(navigation).getByText('问诊');
    expect(inquiry).toHaveAttribute('aria-disabled', 'true');
    expect(inquiry.closest('a')).toBeNull();

    expect(
      within(screen.getByRole('main')).getByRole('heading', {
        name: 'Workbench 基础架构',
      }),
    ).toBeInTheDocument();
  });
});
