import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../providers/ThemeProvider';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('provides semantic landmarks and non-routing workspace placeholders', () => {
    render(
      <ThemeProvider>
        <AppShell>
          <h1>Workbench 基础架构</h1>
        </AppShell>
      </ThemeProvider>,
    );

    expect(screen.getByRole('banner')).toHaveTextContent('TCM YunQi Lab');

    const navigation = screen.getByRole('navigation', {
      name: '工作台导航',
    });
    expect(
      within(navigation).getByText('首页', { selector: '[aria-current]' }),
    ).toHaveAttribute('aria-current', 'page');

    for (const label of ['五运六气', '问诊']) {
      const placeholder = within(navigation).getByText(label);
      expect(placeholder).toHaveAttribute('aria-disabled', 'true');
      expect(placeholder.closest('a')).toBeNull();
    }

    expect(
      within(screen.getByRole('main')).getByRole('heading', {
        name: 'Workbench 基础架构',
      }),
    ).toBeInTheDocument();
  });
});
