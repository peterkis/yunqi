import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { mapCurrentYunQi } from '../presentation/map-current-yunqi';
import type { CurrentSixQiStageTuple } from '../presentation/view-model';
import { StageTimeline, type StageTimelineProps } from './StageTimeline';

const acceptsTimelineViewModel = (_steps: StageTimelineProps['steps']) => undefined;

describe('panel stage navigation replacing the demo rail', () => {
  it('consumes the canonical six-step timeline without a parallel model', () => {
    const canonicalTimeline: CurrentSixQiStageTuple = mapCurrentYunQi(createYunQiCalculationDto()).timeline;
    expect(() => acceptsTimelineViewModel(canonicalTimeline)).not.toThrow();
  });

  it('connects six categorical controls to direct API indexes, statuses and exact boundary times', async () => {
    const user = userEvent.setup();
    const viewModel = mapCurrentYunQi(createYunQiCalculationDto());
    render(<StageTimeline kind="qi" steps={viewModel.timeline} currentStepIndex={viewModel.currentStep.index} />);
    const nav = screen.getByRole('navigation', { name: '六气年度六阶段概览' });
    expect(within(nav).getAllByRole('button')).toHaveLength(6);
    for (const step of viewModel.timeline) {
      const control = within(nav).getByRole('button', { name: `第 ${step.index} 步 ${step.name}，${step.status.label}` });
      expect(control).toHaveAttribute('aria-expanded', String(step.index === viewModel.currentStep.index));
      expect(control).toHaveTextContent(step.tickLabel);
      const root = document.getElementById(control.getAttribute('aria-controls')!)!;
      expect(root).toHaveAttribute('id', expect.stringContaining(`-step-${step.index}`));
      expect(root.querySelectorAll('time')[0]).toHaveAttribute('datetime', step.start.localTime);
      expect(root.querySelectorAll('time')[1]).toHaveAttribute('datetime', step.end.localTime);
    }
    expect(within(nav).getByRole('button', { name: /第 3 步.*三之气.*当前/ })).toHaveAttribute('aria-current', 'step');
    const first = within(nav).getByRole('button', { name: /第 1 步/ });
    const firstStage = document.getElementById(first.getAttribute('aria-controls')!)!;
    const scrollIntoView = vi.fn();
    firstStage.scrollIntoView = scrollIntoView;
    await user.click(first);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: '初之气详情' })).toBeVisible();
    expect(screen.getByRole('region', { name: '三之气详情' })).toBeVisible();
  });
});
