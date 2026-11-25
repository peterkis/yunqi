import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createBirthComparisonDto } from '../../../test/learning-fixtures';
import { mapBirthComparison } from '../../yunqi/presentation/map-learning';
import { mapConstitutionContext } from '../presentation/map-constitution';
import { ConstitutionContext, ConstitutionContextDetails } from './ConstitutionContext';

describe('ConstitutionContext', () => {
  it('shows the birth comparison link with no birth data, including while the current snapshot is unavailable', () => {
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const { rerender } = render(<MemoryRouter><ConstitutionContext /></MemoryRouter>);
    expect(screen.getByText('当前快照尚未载入')).toBeVisible();
    expect(screen.getByRole('link', { name: '未填写 · 去对照 ›' })).toHaveAttribute('href', '/yunqi/birth');
    rerender(<MemoryRouter><ConstitutionContext context={mapConstitutionContext(comparison.current)} /></MemoryRouter>);
    const context = screen.getByRole('complementary', { name: '本次测评对照背景' });
    expect(context.querySelector('.ds-element__dot')).not.toBeNull();
    expect(within(context).getByRole('link', { name: '未填写 · 去对照 ›' })).toHaveAttribute('href', '/yunqi/birth');
    expect(within(context).queryByText('精确时刻')).not.toBeInTheDocument();
  });

  it('shows a single birth summary and keeps full current/birth details in the bottom disclosures', async () => {
    const user = userEvent.setup();
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const context = mapConstitutionContext(comparison.current, comparison);
    render(<><ConstitutionContext context={context} /><ConstitutionContextDetails context={context} /></>);
    const summary = screen.getByRole('complementary', { name: '本次测评对照背景' }).querySelectorAll('dd')[1];
    const candidate = context.birth!.candidates[0];
    expect(summary.querySelector('.constitution-context-period')).toHaveTextContent(candidate.periodLabel);
    expect(summary.querySelector('.ds-element')).toHaveTextContent(candidate.elementLabel);
    expect(summary.querySelector('.ds-element__dot')).toHaveClass(`ds-element__dot--${candidate.element}`);
    expect(screen.queryByRole('link', { name: '未填写 · 去对照 ›' })).not.toBeInTheDocument();
    await user.click(screen.getByText('精确时刻'));
    const details = screen.getByText('精确时刻').closest('details')!;
    expect(details).not.toHaveTextContent('北京时间 UTC+08');
    expect(within(details).getByText('区间起点包含，终点不包含。')).toBeVisible();
    expect(details).not.toHaveTextContent(/动效|frame-in-flight|no-view-transition/);
  });

  it.each([false, true])('exposes the API snapshot time in the snapshot card (birth-linked: %s)', async linked => {
    const user = userEvent.setup();
    const dto = createBirthComparisonDto();
    const localTime = '2012-02-29T23:58:07.123+08:00';
    const comparison = mapBirthComparison({ ...dto, current: { ...dto.current, facts: {
      ...dto.current.facts, input: { ...dto.current.facts.input, localTime },
    } } });
    render(<ConstitutionContextDetails context={mapConstitutionContext(comparison.current, linked ? comparison : undefined)} />);
    await user.click(screen.getByText('本次对照快照与候选区间'));
    const card = screen.getByRole('region', { name: '当下快照' });
    const timestamp = within(card).getByText('2012-02-29 23:58:07.123');
    expect(timestamp).toBeVisible();
    expect(timestamp).toHaveAttribute('datetime', localTime);
  });

  it('summarizes multiple candidates and exposes every label and summary to assistive technology', () => {
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const context = mapConstitutionContext(comparison.current, { ...comparison, ambiguous: true,
      candidates: [...comparison.candidates, { ...comparison.candidates[0], label: '候选二' }] });
    render(<ConstitutionContext context={context} />);
    const candidates = screen.getByRole('group', { name: /候选二/ });
    expect(within(candidates).getByText('2 个候选')).toBeVisible();
    expect(candidates).toHaveAccessibleName(context.birth!.candidates.map(c => `${c.label}：${c.periodLabel} · ${c.elementLabel}`).join('；'));
    expect(candidates.querySelectorAll('.ds-element__dot')).toHaveLength(2);
  });
});
