import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createAssessmentDto, createBirthComparisonDto } from '../../../test/learning-fixtures';
import { mapBirthComparison } from '../../yunqi/presentation/map-learning';
import { mapAssessment, mapConstitutionContext } from '../presentation/map-constitution';
import { ConstitutionContext, ConstitutionContextDetails } from './ConstitutionContext';
import { ConstitutionResults } from './ConstitutionResults';

describe('constitution result and snapshot', () => {
  it('retains every coexisting type and candidate as parallel facts, with neutral ordered chips and the original API explanations', async () => {
    const user = userEvent.setup();
    const birth = mapBirthComparison(createBirthComparisonDto());
    const comparison = { ...birth, ambiguous: true, candidates: [...birth.candidates, { ...birth.candidates[0], label: '候选二' }] };
    const context = mapConstitutionContext(comparison.current, comparison);
    const dto = createAssessmentDto();
    const assessment = mapAssessment({ ...dto, matchedTypes: ['qi_deficiency', 'yang_deficiency'], tendencyTypes: ['yin_deficiency', 'phlegm_dampness'],
      results: dto.results.map((result, index) => ({ ...result, status: index === 1 || index === 2 ? 'yes' : index === 3 || index === 4 ? 'tendency' : 'no' })) });
    render(<><ConstitutionContext context={context} /><ConstitutionContextDetails context={context} /><ConstitutionResults assessment={assessment} context={context} /></>);
    const result = screen.getByRole('region', { name: '体质测评结果' });
    expect(within(result).getByRole('heading', { name: '偏颇质兼夹' })).toHaveFocus();
    expect([...result.querySelectorAll('.constitution-matched-types .ds-relation__chip')].map((chip) => chip.textContent)).toEqual(['气虚质', '阳虚质']);
    expect([...result.querySelectorAll('.constitution-tendency-types .ds-relation__chip')].map((chip) => chip.textContent)).toEqual(['阴虚质', '痰湿质']);
    expect(result.querySelectorAll('.ds-relation__chip--neutral')).toHaveLength(4);
    expect(result.querySelector('.constitution-result-navigation')).toBeNull();
    expect(within(result).queryByRole('button', { name: '返回修改' })).not.toBeInTheDocument();
    for (const item of assessment.results) {
      const chart = within(result).getByRole('img', { name: item.chartLabel });
      expect(chart).toBeVisible();
      expect(within(chart.closest('li')!).getByText(`${item.displayScore} 分`)).toHaveClass('num');
    }
    expect(result.querySelectorAll('[data-tone="primary"]')).toHaveLength(2);
    expect(result.querySelectorAll('[data-tone="secondary"]')).toHaveLength(2);
    expect(result.querySelectorAll('[data-tone="neutral"]')).toHaveLength(5);
    const parallel = within(result).getByRole('region', { name: '与运气互参' });
    expect([...parallel.querySelectorAll('dt')].map((node) => node.textContent)).toEqual(['体质', '先天', '当下']);
    expect(parallel).toHaveTextContent('候选二');
    expect(result).not.toHaveTextContent(/风险|易患|预测|高危/);
    await user.click(screen.getByText('本次对照快照与候选区间'));
    expect(screen.getByRole('region', { name: '候选二' })).toHaveTextContent('可能区间（起点含、终点不含）');
    expect(screen.getByRole('region', { name: '候选二' }).querySelectorAll('time')).toHaveLength(2);
    expect(within(result).getByText(dto.summary)).not.toBeVisible();
    await user.click(within(result).getByText('判定说明与边界'));
    expect(within(result).getByText(dto.summary)).toBeVisible();
    expect(within(result).getByText(dto.boundaryNote)).toBeVisible();
  });

  it.each([1, 2, 7])('renders the summary heading for %i matches, listing chips only for mixed types', (count) => {
    const dto = createAssessmentDto();
    const matches = dto.results.slice(1, count + 1);
    render(<ConstitutionResults assessment={mapAssessment({ ...dto, matchedTypes: matches.map((result) => result.id),
      results: dto.results.map((result) => ({ ...result, status: matches.some((match) => match.id === result.id) ? 'yes' : 'no' })) })} />);
    const decision = screen.getByRole('region', { name: '量表判定' });
    expect(within(decision).getByRole('heading')).toHaveTextContent(count === 1 ? '气虚质' : '偏颇质兼夹');
    expect([...decision.querySelectorAll('.constitution-matched-types .ds-relation__chip')].map((chip) => chip.textContent)).toEqual(count >= 2 ? matches.map((result) => result.name) : []);
    if (count === 1) expect(decision.querySelector('.constitution-matched-types')).toBeNull();
    expect(within(decision).queryByText(dto.summary)).not.toBeInTheDocument();
  });

  it('keeps a single balanced heading, tendencies and one readonly version description without a duplicate matched row', async () => {
    const user = userEvent.setup();
    const dto = createAssessmentDto();
    const { rerender } = render(<ConstitutionResults assessment={mapAssessment(dto)} />);
    expect(screen.getByRole('heading', { name: '平和质' })).toBeVisible();
    expect(document.querySelector('.constitution-matched-types')).toBeNull();
    expect(document.querySelector('.constitution-tendency-types')).toBeNull();
    const tendency = dto.results[1];
    const assessment = mapAssessment({ ...dto, sex: 'female', matchedTypes: [], tendencyTypes: [tendency.id],
      results: dto.results.map((result, index) => ({ ...result, status: index === 0 ? 'basically' : index === 1 ? 'tendency' : 'no' })) });
    rerender(<ConstitutionResults assessment={assessment} />);
    expect(screen.getByRole('heading', { name: '基本是平和质' })).toBeVisible();
    expect(document.querySelector('.constitution-matched-types')).toBeNull();
    expect(document.querySelector('.constitution-tendency-types .ds-relation__chip')).toHaveTextContent(tendency.name);
    await user.click(screen.getByText('本次量表版本'));
    const version = screen.getByText(`女性版 · ${dto.questionnaireId} · ${dto.version}`);
    expect(version).toBeVisible();
    expect(version).toHaveClass('constitution-meta');
    expect(screen.getAllByText(/女性版/)).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '更换' })).not.toBeInTheDocument();
  });

  it('shows a precise birth instant without inventing an interval or multiple candidate labels', async () => {
    const user = userEvent.setup();
    const comparison = mapBirthComparison({ ...createBirthComparisonDto(), birthPrecision: 'time' });
    render(<ConstitutionContextDetails context={mapConstitutionContext(comparison.current, comparison)} />);
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
    const { container } = render(<ConstitutionContextDetails context={context} />);
    const current = container.querySelector('.constitution-context-time time');
    expect(current).toHaveTextContent('06-19 12:00');
    expect(current).toHaveAttribute('datetime', context.current.time.localTime);
    const details = screen.getByText('计算说明与版本').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(screen.getByText('计算说明与版本'));
    expect(within(details).getByText('2026-06-19 12:00:23.456')).toBeVisible();
    expect(details).toHaveTextContent(context.current.ruleVersion);
    expect([...details.querySelectorAll<HTMLTimeElement>('.yunqi-time-details time')].map((time) => time.dateTime)).toEqual([
      context.current.time.localTime,
      comparison.candidates[0].from.localTime, comparison.candidates[0].until.localTime,
    ]);
  });
});
