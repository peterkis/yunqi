import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from '../presentation/map-learning';
import { ClassicalPassages, LearningSnapshot, MovementCard } from './LearningPanels';

describe('LearningPanels', () => {
  it('separates source quotation and explanatory text behind a disclosure', async () => {
    const user = userEvent.setup();
    const learning = mapLearning(createLearningDto());
    render(<ClassicalPassages title="经典原文" passages={learning.annualPassages} />);
    expect(screen.getByText('主胜逆，客胜从。')).not.toBeVisible();
    await user.click(screen.getByText('经典原文'));
    expect(screen.getByText('主胜逆，客胜从。')).toBeVisible();
    expect(screen.getByText('阅读释义（非原文）')).toBeVisible();
    expect(screen.getByRole('link')).toHaveAttribute('href', learning.annualPassages[0].sourceUrl);
    expect(screen.getByRole('link')).toHaveAttribute('rel', 'noreferrer');
  });

  it('does not invent missing source text', async () => {
    const user = userEvent.setup();
    render(<ClassicalPassages title="未收录范围" passages={[]} />);
    await user.click(screen.getByText('未收录范围'));
    expect(screen.getByText('此范围暂未收录已核对原文。')).toBeVisible();
  });

  it('shows movement boundaries supplied by the API and explains their method on demand', async () => {
    const user = userEvent.setup();
    const movement = mapLearning(createLearningDto()).currentMovement;
    render(<MovementCard movement={movement} />);
    expect(screen.getByText('火运太过（太徵）')).toBeVisible();
    expect(screen.getByText('木运不及（少角）')).toBeVisible();
    await user.click(screen.getByText('交运口径'));
    expect(screen.getByText(movement.boundaryMethod)).toBeVisible();
    expect(screen.getByText(movement.explanation)).toBeVisible();
  });

  it('hides a sampled instant when birth precision is a date', () => {
    const learning = mapLearning(createLearningDto());
    const { container } = render(<LearningSnapshot learning={learning} title="出生背景" showTime={false} />);
    expect(container.querySelector('time')).toBeNull();
    expect(screen.getByText('2026 · 丙午')).toBeVisible();
    expect(screen.getByText('三之气 · 主气')).toBeVisible();
  });
});
