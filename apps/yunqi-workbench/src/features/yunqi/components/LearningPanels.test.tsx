import { MotionProvider } from '../../../providers/MotionProvider';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLearningDto, createBirthComparisonDto } from '../../../test/learning-fixtures';
import { mapLearning } from '../presentation/map-learning';
import { CurrentClassicsPage } from './CurrentClassicsPage';
import { CurrentYunQiPage } from './CurrentYunQiPage';
import { mapBirthView } from '../birth/presentation/map-birth-view';
import { BirthComparisonTable } from '../birth/components/BirthComparisonTable';

describe('live learning cards replacing demo panels', () => {
  it('separates source quotation and explanatory text in the original-text drilldown', async () => {
    const user = userEvent.setup();
    const learning = mapLearning(createLearningDto());
    render(<CurrentClassicsPage learning={learning} />);
    await user.click(screen.getByRole('button', { name: '全年' }));
    expect(screen.getByRole('blockquote').querySelector('p')).toHaveTextContent('主胜逆，客胜从。');
    expect(screen.getByText('原 文')).toBeVisible();
    expect(screen.getByText('释 义')).toBeVisible();
    expect(screen.getByText(learning.annualPassages[0].explanation)).toBeVisible();
    expect(screen.getByTitle(learning.annualPassages[0].source)).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('does not invent missing source text', async () => {
    const user = userEvent.setup();
    render(<CurrentClassicsPage learning={{ ...mapLearning(createLearningDto()), annualPassages: [] }} />);
    await user.click(screen.getByRole('button', { name: '全年' }));
    expect(screen.getByText('此范围暂未收录已核对原文。')).toBeVisible();
  });

  it('shows movement boundaries supplied by the API and explains their method on demand', async () => {
    const user = userEvent.setup();
    const learning = mapLearning(createLearningDto());
    const movement = learning.currentMovement;
    render(<MotionProvider><CurrentYunQiPage viewModel={learning.facts} learning={learning} /></MotionProvider>, { wrapper: MemoryRouter });
    const currentMovement = screen.getByRole('region', { name: '当步运' });
    expect(within(currentMovement).getByText('火运太过')).toBeVisible();
    expect(within(currentMovement).getByText('木运不及')).toBeVisible();
    expect(currentMovement.querySelector('.current-period-cell--range')).toHaveTextContent('春分后13日 → 芒种后10日');
    expect(currentMovement.querySelector('.current-period-cell--remaining')).toHaveTextContent('还有 34 天');
    await user.click(screen.getByText('计算说明与版本'));
    const precision = screen.getByRole('region', { name: '精确时刻' });
    expect(precision.querySelector(`time[datetime="${movement.start.localTime}"]`)).toBeVisible();
    expect(precision.querySelector(`time[datetime="${movement.end.localTime}"]`)).toBeVisible();
    await user.click(screen.getByText('这些关系怎么读？'));
    const reading = screen.getByText('这些关系怎么读？').closest('details')!;
    expect(reading).not.toHaveTextContent(movement.explanation);
    expect(reading).not.toHaveTextContent('教学口径，待专家确认');
    await user.click(screen.getByText('其余阶段', { exact: true }));
    const timeline = screen.getByRole('region', { name: '五运全表' });
    expect(timeline).not.toHaveTextContent(movement.boundaryMethod);
    expect(timeline.querySelector('footer')).toHaveTextContent(movement.explanation);
    expect(screen.getAllByText(movement.explanation, { exact: true })).toHaveLength(1);
  });

  it('hides a sampled instant when birth precision is a date', () => {
    const viewModel = mapBirthView(createBirthComparisonDto());
    const candidate = viewModel.candidates[0];
    const { container } = render(<BirthComparisonTable candidate={candidate} current={viewModel} />);
    expect(within(screen.getByRole('columnheader', { name: /^先天/ })).queryByRole('time')).not.toBeInTheDocument();
    expect(container.querySelectorAll('time')).toHaveLength(1);
    expect(container.querySelector('.birth-time-anchors time')).toHaveAttribute('datetime', viewModel.currentTime.localTime);
    expect(screen.getAllByText(candidate.birthGanzhi).length).toBeGreaterThan(0);
    expect(screen.getAllByText(candidate.rows[3].birth.label).length).toBeGreaterThan(0);
  });
});
