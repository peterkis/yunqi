import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DrilldownResultNotes } from '../year-analysis/components/DrilldownResultNotes';

describe('rule explanation and traceability panels', () => {
  it('keeps API explanations separate from traceability metadata inside the calculation disclosure', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DrilldownResultNotes explanations={['API 原文']}
          dataSource="YunQi 年度查询 API"
          ruleVersion="YQ-MVP-RULES-1.1.0"
        />
      </>,
    );

    const explanation = screen.getByRole('region', {
      name: '规则结果说明',
    });
    const trace = screen.getByRole('region', {
      name: '追溯信息',
    });
    const summary = screen.getByText('计算说明与版本');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(explanation).not.toBeVisible();
    expect(trace).not.toBeVisible();
    await user.click(summary);
    expect(explanation).toBeVisible();
    expect(trace).toBeVisible();
    expect(explanation).toHaveTextContent('API 原文');
    expect(explanation).not.toHaveTextContent('YQ-API-CONTRACT-1.3.0');
    expect(trace).not.toHaveTextContent('API 原文');
    expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.3.0');
    expect(trace).toHaveTextContent('YQ-MVP-RULES-1.1.0');
    expect(trace).not.toHaveTextContent('北京时间 UTC+08');
    expect(trace).not.toHaveTextContent(/动效|frame-in-flight|no-view-transition/);
  });

  it('does not invent an explanation for an empty API array', async () => {
    const user = userEvent.setup();
    render(<DrilldownResultNotes explanations={[]} dataSource="YunQi 年度查询 API" ruleVersion="YQ-MVP-RULES-1.1.0" />);
    expect(screen.getByText('本次结果未提供规则说明')).not.toBeVisible();
    await user.click(screen.getByText('计算说明与版本'));
    expect(
      screen.getByText('本次结果未提供规则说明'),
    ).toBeVisible();
  });
});
