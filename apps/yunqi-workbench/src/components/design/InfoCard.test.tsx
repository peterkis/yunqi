import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { InfoCard } from './InfoCard';
import { RelationChip } from './RelationChip';

describe('InfoCard', () => {
  it('renders a named section with eyebrow, metadata, content, and a sunken hint', () => {
    render(
      <InfoCard label="全年 · 2026" meta="大寒起" hint={<RelationChip tone="neutral" label="天符" explanation="用于理解年度结构。" />}>
        <h3>丙午</h3><p>水运太过之年</p>
      </InfoCard>,
    );
    const region = screen.getByRole('region', { name: '全年 · 2026' });
    expect(region).toHaveTextContent('大寒起');
    expect(screen.getByRole('heading', { name: '丙午' })).toBeVisible();
    expect(screen.getByText('用于理解年度结构。').closest('.ds-info-card__hint')).toBeVisible();
  });

  it('supports the compact content-only section and does not create a tab stop', async () => {
    const user = userEvent.setup();
    const { container } = render(<><InfoCard label="此刻" compact>五之气</InfoCard><button type="button">继续</button></>);
    expect(screen.getByRole('region', { name: '此刻' })).toHaveClass('ds-info-card--compact');
    expect(container.querySelector('.ds-info-card__hint')).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole('button', { name: '继续' })).toHaveFocus();
  });

  it('keeps a linked card a named section with a text-only link name', () => {
    render(
      <InfoCard href="#original" label="当下原文" meta="阅读资料" hint="仅供理论学习。">
        <blockquote>五之气，畏火临……</blockquote>
        <p>查看完整原文。</p>
      </InfoCard>,
    );
    const card = screen.getByRole('region', { name: '当下原文' });
    const link = within(card).getByRole('link', { name: '原文与释义' });
    expect(card.tagName).toBe('SECTION');
    expect(card).not.toHaveAttribute('href');
    expect(card).not.toHaveAttribute('tabindex');
    expect(link).toHaveAttribute('href', '#original');
    expect(link).toHaveAccessibleName('原文与释义');
    expect(link).not.toHaveAttribute('aria-label');
    expect(link).not.toHaveAttribute('aria-labelledby');
    expect(link.querySelector('[aria-hidden="true"]')).toHaveTextContent('›');
    expect(within(card).getAllByRole('link')).toHaveLength(1);
    expect(within(card).getByText('阅读资料')).toBeVisible();
    expect(within(card).getByRole('blockquote').closest('a')).toBeNull();
    expect(within(card).getByText('查看完整原文。').closest('a')).toBeNull();
    expect(within(card).getByText('仅供理论学习。').closest('a')).toBeNull();
  });

  it('has one tab stop and follows the link on Enter', async () => {
    const user = userEvent.setup();
    const originalUrl = window.location.href;
    window.history.replaceState(null, '', '/info-card-test');
    try {
      render(<>
        <button type="button">上一个</button>
        <InfoCard href="#original" label="当下原文"><p>五之气，畏火临……</p></InfoCard>
        <button type="button">下一个</button>
      </>);
      const link = screen.getByRole('link', { name: '原文与释义' });
      await user.tab();
      expect(screen.getByRole('button', { name: '上一个' })).toHaveFocus();
      await user.tab();
      expect(link).toHaveFocus();
      await user.keyboard('{Enter}');
      await waitFor(() => expect(window.location.hash).toBe('#original'));
      await user.tab();
      expect(screen.getByRole('button', { name: '下一个' })).toHaveFocus();
      await user.tab({ shift: true });
      expect(link).toHaveFocus();
    } finally {
      window.history.replaceState(null, '', originalUrl);
    }
  });

  it('follows the real link on pointer activation and supports a custom visible label', async () => {
    const user = userEvent.setup();
    const originalUrl = window.location.href;
    window.history.replaceState(null, '', '/info-card-test');
    try {
      render(<InfoCard href="#annual" label="全年" linkLabel="查看全年原文"><p>丙午</p></InfoCard>);
      const link = screen.getByRole('link', { name: '查看全年原文' });
      expect(link).toHaveAttribute('href', '#annual');
      // jsdom cannot hit-test the CSS ::after surface. The browser flow clicks
      // card content outside this text link to verify the stretched hit area.
      await user.click(link);
      await waitFor(() => expect(window.location.hash).toBe('#annual'));
    } finally {
      window.history.replaceState(null, '', originalUrl);
    }
  });
});

it('uses React Router for an internal card link, preserving its accessible name and single tab stop', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/yunqi/current']}><Routes>
    <Route path="/yunqi/current" element={<><button type="button">之前</button><InfoCard label="阶段原文" to="/yunqi/current/classics"><p>摘句</p></InfoCard><button type="button">之后</button></>} />
    <Route path="/yunqi/current/classics" element={<p>原文下钻已到达</p>} />
  </Routes></MemoryRouter>);
  await user.tab();
  expect(screen.getByRole('button', { name: '之前' })).toHaveFocus();
  await user.tab();
  const link = screen.getByRole('link', { name: '原文与释义' });
  expect(link).toHaveFocus();
  expect(link).toHaveAttribute('href', '/yunqi/current/classics');
  expect(link).not.toHaveAttribute('aria-label');
  expect(screen.getByRole('region', { name: '阶段原文' })).not.toHaveAttribute('tabindex');
  await user.tab();
  expect(screen.getByRole('button', { name: '之后' })).toHaveFocus();
  await user.tab({ shift: true });
  await user.keyboard('{Enter}');
  expect(screen.getByText('原文下钻已到达')).toBeVisible();
});
