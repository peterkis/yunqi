import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SegmentedNav } from './SegmentedNav';

const segments = [
  { label: '当下运气', to: '/current', end: true },
  { label: '先天对照', to: '/birth' },
  { label: '体质量表', to: '/constitution' },
];

describe('SegmentedNav', () => {
  it('uses named navigation and real links with exactly the active page marked', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/current']}><SegmentedNav segments={segments} /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: '视图' })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '当下运气' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '先天对照' })).not.toHaveAttribute('aria-current');
    await user.tab();
    expect(screen.getByRole('link', { name: '当下运气' })).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('link', { name: '先天对照' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '当下运气' })).not.toHaveAttribute('aria-current');
  });

  it('supports the two-segment compact drilldown and nested active paths', () => {
    render(<MemoryRouter initialEntries={['/period/detail']}>
      <SegmentedNav compact label="原文范围" segments={[{ label: '全年', to: '/annual' }, { label: '当下阶段', to: '/period' }]} />
    </MemoryRouter>);
    expect(screen.getByRole('navigation', { name: '原文范围' })).toHaveClass('ds-segmented-nav--compact');
    expect(screen.getByRole('link', { name: '当下阶段' })).toHaveAttribute('aria-current', 'page');
  });

  it('accepts a single segment and rejects empty or excessive segments', () => {
    const { unmount } = render(<MemoryRouter><SegmentedNav segments={segments.slice(0, 1)} /></MemoryRouter>);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    unmount();
    expect(() => render(<MemoryRouter><SegmentedNav segments={[]} /></MemoryRouter>)).toThrow(/one to three/);
    expect(() => render(<MemoryRouter><SegmentedNav segments={[...segments, { label: '更多', to: '/more' }]} /></MemoryRouter>)).toThrow(/one to three/);
  });
});
