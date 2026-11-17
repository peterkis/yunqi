import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { PanelHeader } from './PanelHeader';

describe('PanelHeader', () => {
  it('renders the brand, title, neutral status, and named action slot', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PanelHeader title="运气通" status="理论学习 · 只读展示" actions={
      <Button variant="icon" aria-label="切换主题" onClick={onClick}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
      </Button>
    } />);
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByText('运')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { name: '运气通' })).toBeVisible();
    expect(screen.getByText('理论学习 · 只读展示')).toBeVisible();
    await user.tab();
    expect(screen.getByRole('button', { name: '切换主题' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('replaces the brand with keyboard-accessible back navigation on drilldown', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<PanelHeader variant="drilldown" title="原文与释义" subtitle="当下阶段" onBack={onBack} />);
    expect(screen.queryByText('运')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '原文与释义' })).toBeVisible();
    expect(screen.getByText('当下阶段')).toBeVisible();
    await user.tab();
    expect(screen.getByRole('button', { name: '返回' })).toHaveFocus();
    await user.keyboard(' ');
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('allows drilldown without a subtitle or actions', () => {
    const { container } = render(<PanelHeader variant="drilldown" title="原文与释义" onBack={vi.fn()} />);
    expect(container.querySelector('.ds-panel-header__status')).not.toBeInTheDocument();
    expect(container.querySelector('.ds-panel-header__actions')).not.toBeInTheDocument();
  });
});
