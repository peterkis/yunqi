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
    expect(screen.getByRole('blockquote')).toHaveTextContent('“主胜逆，客胜从。”');
    expect(screen.getByText('阅读释义')).toBeVisible();
    expect(screen.getByText(learning.annualPassages[0].explanation)).toBeVisible();
    expect(screen.getByRole('link')).toHaveAttribute('href', learning.annualPassages[0].sourceUrl);
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noreferrer');
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
    render(<CurrentYunQiPage viewModel={learning.facts} learning={learning} />, { wrapper: MemoryRouter });
    const currentMovement = screen.getByRole('region', { name: '当步运' });
    expect(within(currentMovement).getByText('火运太过（太徵）')).toBeVisible();
    expect(within(currentMovement).getByText('木运不及（少角）')).toBeVisible();
    const times = currentMovement.querySelectorAll('time');
    expect(times[0]).toHaveAttribute('datetime', movement.start.localTime);
    expect(times[1]).toHaveAttribute('datetime', movement.end.localTime);
    await user.click(screen.getByText('这些关系怎么读？'));
    expect(screen.getByText(`交运口径：${movement.boundaryMethod} · 教学口径，待专家确认`)).toBeVisible();
    expect(within(screen.getByText('这些关系怎么读？').closest('details')!).getByText(movement.explanation)).toBeVisible();
  });

  it('hides a sampled instant when birth precision is a date', () => {
    const viewModel = mapBirthView(createBirthComparisonDto());
    const candidate = viewModel.candidates[0];
    const { container } = render(<BirthComparisonTable candidate={candidate} current={viewModel} />);
    expect(within(screen.getByRole('columnheader', { name: /先天 · 出生/ })).queryByRole('time')).not.toBeInTheDocument();
    expect(container.querySelectorAll('time')).toHaveLength(1);
    expect(container.querySelector('.birth-table__time time')).toHaveAttribute('datetime', viewModel.currentTime.localTime);
    expect(screen.getAllByText(candidate.birthGanzhi).length).toBeGreaterThan(0);
    expect(screen.getAllByText(candidate.rows[3].birth.label).length).toBeGreaterThan(0);
  });
});
