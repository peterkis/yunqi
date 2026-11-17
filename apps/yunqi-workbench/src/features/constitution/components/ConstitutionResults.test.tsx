import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAssessmentDto, createBirthComparisonDto } from '../../../test/learning-fixtures';
import { mapBirthComparison } from '../../yunqi/presentation/map-learning';
import { mapAssessment, mapConstitutionContext } from '../presentation/map-constitution';
import { ConstitutionContext } from './ConstitutionContext';
import { ConstitutionResults } from './ConstitutionResults';

describe('constitution result and snapshot', () => {
  it('retains every coexisting type and candidate as parallel facts, with complete chart text and edit navigation', async () => {
    const user = userEvent.setup();
    const birth = mapBirthComparison(createBirthComparisonDto());
    const comparison = { ...birth, ambiguous: true, candidates: [...birth.candidates, { ...birth.candidates[0], label: '候选二' }] };
    const context = mapConstitutionContext(comparison.current, comparison);
    const dto = createAssessmentDto();
    const assessment = mapAssessment({ ...dto, results: dto.results.map((result, index) => ({ ...result, status: index < 2 ? 'yes' : index === 2 ? 'tendency' : 'no' })) });
    const onBack = vi.fn();
    render(<><ConstitutionContext context={context} /><ConstitutionResults assessment={assessment} context={context} onBack={onBack} /></>);
    const result = screen.getByRole('region', { name: '体质测评结果' });
    expect(within(result).getByRole('heading', { name: '平和质、气虚质' })).toHaveFocus();
    expect(within(result).getByText('兼夹：平和质、气虚质；倾向：阳虚质')).toBeVisible();
    for (const item of assessment.results) expect(within(result).getByRole('img', { name: item.chartLabel })).toBeVisible();
    expect(result.querySelectorAll('[data-tone="primary"]')).toHaveLength(2);
    expect(result.querySelectorAll('[data-tone="secondary"]')).toHaveLength(1);
    expect(result.querySelectorAll('[data-tone="neutral"]')).toHaveLength(6);
    const parallel = within(result).getByRole('region', { name: '与运气互参' });
    expect([...parallel.querySelectorAll('dt')].map((node) => node.textContent)).toEqual(['体质', '先天', '当下']);
    expect(parallel).toHaveTextContent('候选二');
    expect(result).not.toHaveTextContent(/风险|易患|预测|高危/);
    await user.click(screen.getByText('本次对照快照与候选区间'));
    expect(screen.getByRole('region', { name: '候选二' })).toHaveTextContent('可能区间（起点含、终点不含）');
    expect(screen.getByRole('region', { name: '候选二' }).querySelectorAll('time')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '返回修改' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows a precise birth instant without inventing an interval or multiple candidate labels', async () => {
    const user = userEvent.setup();
    const comparison = mapBirthComparison({ ...createBirthComparisonDto(), birthPrecision: 'time' });
    render(<ConstitutionContext context={mapConstitutionContext(comparison.current, comparison)} />);
    await user.click(screen.getByText('本次对照快照与候选区间'));
    const candidate = screen.getByRole('region', { name: '出生运气' });
    expect(candidate).toHaveTextContent('出生时刻：');
    expect(candidate.querySelectorAll('time')).toHaveLength(1);
    expect(candidate.querySelector('time')).toHaveTextContent(comparison.candidates[0].from.localTime.slice(5, 16).replace('T', ' '));
    expect(screen.queryByText(/所有候选共用/)).not.toBeInTheDocument();
  });

  it('keeps current milliseconds and candidate boundaries inside calculation details', async () => {
    const user = userEvent.setup();
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const mapped = mapConstitutionContext(comparison.current, comparison);
    const context = { ...mapped, current: { ...mapped.current, time: { ...mapped.current.time, localTime: '2026-06-19T12:00:23.456+08:00' } } };
    const { container } = render(<ConstitutionContext context={context} />);
    const current = container.querySelector('.constitution-context-time time');
    expect(current).toHaveTextContent('06-19 12:00');
    expect(current).toHaveAttribute('datetime', context.current.time.localTime);
    const details = screen.getByText('计算说明与版本').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(screen.getByText('计算说明与版本'));
    expect(within(details).getByText('2026-06-19 12:00:23.456')).toBeVisible();
    expect(details).toHaveTextContent(context.current.ruleVersion);
    expect([...details.querySelectorAll('time')].map((time) => time.dateTime)).toEqual([
      context.current.time.localTime,
      comparison.candidates[0].from.localTime, comparison.candidates[0].until.localTime,
    ]);
  });
});
