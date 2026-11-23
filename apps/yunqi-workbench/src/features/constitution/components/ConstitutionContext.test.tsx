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
    expect(within(context).queryByText('计算说明与版本')).not.toBeInTheDocument();
  });

  it('shows a single birth summary and keeps full current/birth details in the bottom disclosures', async () => {
    const user = userEvent.setup();
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const context = mapConstitutionContext(comparison.current, comparison);
    render(<><ConstitutionContext context={context} /><ConstitutionContextDetails context={context} /></>);
    const summary = screen.getByRole('complementary', { name: '本次测评对照背景' }).querySelectorAll('dd')[1];
    expect(summary).toHaveTextContent(context.birth!.candidates[0].summary);
    expect(screen.queryByRole('link', { name: '未填写 · 去对照 ›' })).not.toBeInTheDocument();
    await user.click(screen.getByText('计算说明与版本'));
    const details = screen.getByText('计算说明与版本').closest('details')!;
    expect(details).not.toHaveTextContent('北京时间 UTC+08');
    expect(details).toHaveTextContent(context.current.contractId);
    expect(details).not.toHaveTextContent(/动效|frame-in-flight|no-view-transition/);
  });

  it('summarizes multiple candidates and exposes every label and summary to assistive technology', () => {
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const context = mapConstitutionContext(comparison.current, { ...comparison, ambiguous: true,
      candidates: [...comparison.candidates, { ...comparison.candidates[0], label: '候选二' }] });
    render(<ConstitutionContext context={context} />);
    expect(screen.getByText('2 个候选')).toHaveAttribute('aria-label', context.birth!.candidates.map((candidate) => `${candidate.label}：${candidate.summary}`).join('；'));
  });
});
