import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { mapCurrentYunQi } from '../presentation/map-current-yunqi';
import { SixQiTimeline } from './SixQiTimeline';

describe('SixQiTimeline', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockReset();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  it('defaults to the current step and permits independent multi-expand', async () => {
    const user = userEvent.setup();
    const viewModel = mapCurrentYunQi(createYunQiCalculationDto());

    render(
      <SixQiTimeline
        steps={viewModel.timeline}
        currentStepIndex={viewModel.currentStep.index}
      />,
    );

    expect(
      screen.getByRole('button', { name: '收起三之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '展开初之气详情' }),
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('region', { name: '三之气详情' }),
    ).toBeVisible();

    await user.click(
      screen.getByRole('button', { name: '展开初之气详情' }),
    );

    expect(
      screen.getByRole('button', { name: '收起初之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '收起三之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');

    await user.click(
      screen.getByRole('button', { name: '收起三之气详情' }),
    );

    expect(
      screen.getByRole('button', { name: '收起初之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '展开三之气详情' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('adds a changed current step without closing user-expanded steps', async () => {
    const user = userEvent.setup();
    const firstDto = createYunQiCalculationDto();
    const firstViewModel = mapCurrentYunQi(firstDto);
    const { rerender } = render(
      <SixQiTimeline
        steps={firstViewModel.timeline}
        currentStepIndex={firstViewModel.currentStep.index}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: '展开初之气详情' }),
    );

    const nextDto = {
      ...firstDto,
      currentStep: firstDto.sixQi.steps[3],
    };
    const nextViewModel = mapCurrentYunQi(nextDto);
    rerender(
      <SixQiTimeline
        steps={nextViewModel.timeline}
        currentStepIndex={nextViewModel.currentStep.index}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: '收起四之气详情',
        }),
      ).toHaveAttribute('aria-expanded', 'true'),
    );
    expect(
      screen.getByRole('button', { name: '收起初之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('reveals and positions a selected rail stage without closing other details or moving focus', async () => {
    const user = userEvent.setup();
    const viewModel = mapCurrentYunQi(createYunQiCalculationDto());

    render(
      <SixQiTimeline
        steps={viewModel.timeline}
        currentStepIndex={viewModel.currentStep.index}
      />,
    );

    const railControl = screen.getByRole('button', {
      name: /第 1 步.*初之气.*已结束/,
    });

    railControl.focus();
    await user.click(railControl);

    expect(railControl).toHaveFocus();
    expect(railControl).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '收起初之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: '收起三之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });

    await user.click(railControl);

    expect(
      screen.getByRole('button', { name: '收起初之气详情' }),
    ).toHaveAttribute('aria-expanded', 'true');
  });
});
