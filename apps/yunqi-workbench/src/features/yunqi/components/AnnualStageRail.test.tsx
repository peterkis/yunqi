import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { mapCurrentYunQi } from '../presentation/map-current-yunqi';
import type { SixQiTimelineViewModel } from '../presentation/view-model';
import {
  AnnualStageRail,
  type AnnualStageRailProps,
} from './AnnualStageRail';

const acceptsTimelineViewModel = (
  _steps: AnnualStageRailProps['steps'],
) => undefined;

describe('AnnualStageRail', () => {
  it('consumes the canonical six-step timeline model without a parallel rail model', () => {
    const viewModel = mapCurrentYunQi(createYunQiCalculationDto());
    const canonicalTimeline: SixQiTimelineViewModel = viewModel.timeline;

    expect(() => acceptsTimelineViewModel(canonicalTimeline)).not.toThrow();
  });

  it('renders six equal categorical stage controls from direct API indexes', () => {
    const viewModel = mapCurrentYunQi(createYunQiCalculationDto());

    render(
      <AnnualStageRail
        steps={viewModel.timeline}
        expandedSteps={new Set([viewModel.currentStep.index])}
        onRevealStep={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(screen.getByText('阶段等宽展示，不代表实际时长比例。')).toBeVisible();

    for (const step of viewModel.timeline) {
      const control = screen.getByRole('button', {
        name: new RegExp(
          `第 ${step.index} 步.*${step.name}.*${step.status.label}`,
        ),
      });

      expect(control).toHaveAttribute(
        'aria-controls',
        `sixqi-step-${step.index}-details`,
      );
      expect(control).toHaveAttribute(
        'aria-expanded',
        String(step.index === viewModel.currentStep.index),
      );
      expect(control).toHaveTextContent(`第 ${step.index} 步`);
    }

    expect(
      screen.getByRole('button', {
        name: /第 3 步.*三之气.*当前.*2026-05-21T11:00:00\+08:00.*2026-07-23T12:00:00\+08:00/,
      }),
    ).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByText('05-21 11:00')).toHaveLength(2);
    for (const boundary of screen.getAllByText('05-21 11:00')) {
      expect(boundary).toHaveAttribute(
        'dateTime',
        '2026-05-21T11:00:00+08:00',
      );
    }
  });
});
