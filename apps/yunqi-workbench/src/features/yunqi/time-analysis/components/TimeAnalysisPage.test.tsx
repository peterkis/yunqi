import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createYunQiCalculationDto } from '../../../../test/yunqi-fixtures';
import { mapTimeAnalysisYunQi } from '../../presentation/map-time-analysis-yunqi';
import type { TimeAnalysisYunQiViewModel } from '../../presentation/view-model';
import { TimeAnalysisPage } from './TimeAnalysisPage';

function renderPage(
  overrides: Partial<{
    isDirty: boolean;
    isError: boolean;
    viewModel: TimeAnalysisYunQiViewModel | null;
  }> = {},
) {
  return render(
    <TimeAnalysisPage
      inputError={null}
      inputValue=""
      isDirty={overrides.isDirty ?? false}
      isError={overrides.isError ?? false}
      isPending={false}
      onInputChange={vi.fn()}
      onRetry={vi.fn()}
      onSubmit={vi.fn((event) => event.preventDefault())}
      viewModel={
        overrides.viewModel === undefined
          ? mapTimeAnalysisYunQi(createYunQiCalculationDto())
          : overrides.viewModel
      }
    />,
  );
}

describe('TimeAnalysisPage', () => {
  it('renders the canonical success result with neutral selected-time semantics', () => {
    renderPage();

    const result = screen.getByRole('region', {
      name: '指定时点分析结果',
    });

    expect(
      within(result).getByText('2026-06-19 12:00:00'),
    ).toBeInTheDocument();
    expect(
      within(result).getAllByText('北京时间 UTC+08').length,
    ).toBeGreaterThan(0);
    expect(
      within(result).getByRole('region', { name: '年度概览' }),
    ).toBeInTheDocument();
    expect(
      within(result).getByRole('region', {
        name: '六气阶段概览',
      }),
    ).toBeInTheDocument();
    expect(
      within(result).getByText('所选时点'),
    ).toBeInTheDocument();
    expect(
      within(result).getByRole('heading', {
        name: '所选时点所在阶段：三之气',
      }),
    ).toBeInTheDocument();
    expect(
      within(result).getByText('YunQi 指定时点计算 API'),
    ).toBeInTheDocument();
    expect(
      within(result).queryByText('已结束'),
    ).not.toBeInTheDocument();
    expect(
      within(result).queryByText('未开始'),
    ).not.toBeInTheDocument();
  });

  it('hides a successful result after the input becomes dirty', () => {
    renderPage({ isDirty: true });

    expect(
      screen.queryByRole('region', { name: '指定时点分析结果' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('输入已修改，请重新分析'),
    ).toBeInTheDocument();
  });

  it('shows a sanitized retryable error without the previous result', () => {
    renderPage({ isError: true, viewModel: null });

    expect(screen.getByRole('alert')).toHaveTextContent(
      '指定时点分析失败，请重试',
    );
    expect(
      screen.queryByRole('region', { name: '指定时点分析结果' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the form submit seam available to the view owner', () => {
    const onSubmit = vi.fn((event) => event.preventDefault());

    render(
      <TimeAnalysisPage
        inputError={null}
        inputValue=""
        isDirty={false}
        isError={false}
        isPending={false}
        onInputChange={vi.fn()}
        onRetry={vi.fn()}
        onSubmit={onSubmit}
        viewModel={null}
      />,
    );

    fireEvent.submit(
      screen.getByRole('form', { name: '指定时点分析表单' }),
    );
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
