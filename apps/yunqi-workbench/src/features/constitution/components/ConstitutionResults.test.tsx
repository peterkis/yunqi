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
    expect(screen.queryByText(/所有候选共用/)).not.toBeInTheDocument();
  });
});
