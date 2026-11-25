import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createYunQiCalculationDto } from '../../../../test/yunqi-fixtures';
import { mapTimeAnalysisYunQi } from '../../presentation/map-time-analysis-yunqi';
import type { TimeAnalysisYunQiViewModel } from '../../presentation/view-model';
import { splitTimeInput } from '../time-input';
import { TimeAnalysisPage } from './TimeAnalysisPage';
import { TimeAnalysisForm } from './TimeAnalysisForm';

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
      draft={splitTimeInput('2026-05-20T13:30')}
      anchorLoading={false} anchorError={false} onAnchor={vi.fn()}
      isDirty={overrides.isDirty ?? false}
      isError={overrides.isError ?? false}
      isPending={false}
      onInputChange={vi.fn()}
      onInvalid={vi.fn()}
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
  it('edits a selected digit with the keypad and leaves an invalid hour available for correction', async () => {
    const user = userEvent.setup();
    const invalid = vi.fn(), submit = vi.fn((event) => event.preventDefault());
    function Form() {
      const [draft, setDraft] = useState(splitTimeInput('2024-02-29T13:05'));
      return <TimeAnalysisForm draft={draft} onInputChange={setDraft} onInvalid={invalid} onSubmit={submit}
        inputError={null} isPending={false} anchorLoading={false} anchorError={false} onAnchor={vi.fn()} />;
    }
    render(<Form />);
    const pad = within(screen.getByRole('group', { name: '数字键盘' }));
    const press = (name: string) => user.click(pad.getByRole('button', { name }));
    const hour = screen.getByRole<HTMLInputElement>('textbox', { name: '时' });
    await user.click(hour);
    hour.setSelectionRange(0, 1);
    await press('9');
    expect(hour).toHaveValue('93');
    expect(hour).toHaveFocus();
    await press('4');
    expect(hour).toHaveValue('93');
    await user.click(screen.getByRole('button', { name: '开始分析' }));
    expect(invalid).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
    await press('退格');
    expect(hour).toHaveValue('');
    await press('0');
    await press('8');
    expect(screen.getByRole('textbox', { name: '分' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: '开始分析' }));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('renders the canonical success result with neutral selected-time semantics', () => {
    renderPage();

    expect(screen.getByText('规则实现基线，待正式专家冻结与验证。')).toBeInTheDocument();

    const result = screen.getByRole('region', {
      name: '指定时点分析结果',
    });

    expect(
      result.querySelector('.drilldown-time-result__time time'),
    ).toBeInTheDocument();
    expect(result.querySelector('.drilldown-time-result__time time')).toHaveTextContent('06-19 12:00');
    expect(result.querySelector('.drilldown-time-result__time time')).toHaveAttribute('datetime', '2026-06-19T12:00:00+08:00');
    expect(within(result).queryByText('北京时间 UTC+08')).not.toBeInTheDocument();
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
    const stage = within(result).getByRole('region', { name: '所选时点所在阶段：三之气' });
    const annual = within(result).getByRole('region', { name: '年度概览' });
    expect(stage.compareDocumentPosition(annual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(stage.querySelector('.ds-info-card')).toBeInTheDocument();
    expect([...stage.querySelectorAll('time')].map((time) => time.dateTime)).toEqual([
      '2026-05-21T11:00:00+08:00', '2026-07-23T12:00:00+08:00',
    ]);
    expect(within(result).queryByText('计算说明与版本')).not.toBeInTheDocument();
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
        draft={splitTimeInput('2026-05-20T13:30')}
        anchorLoading={false} anchorError={false} onAnchor={vi.fn()}
        isDirty={false}
        isError={false}
        isPending={false}
        onInputChange={vi.fn()}
        onInvalid={vi.fn()}
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
