import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RuleExplanationPanel } from './RuleExplanationPanel';
import { TraceabilityPanel } from './TraceabilityPanel';

describe('rule explanation and traceability panels', () => {
  it('keeps API explanations separate from traceability metadata', () => {
    render(
      <>
        <RuleExplanationPanel explanations={['API 原文']} />
        <TraceabilityPanel
          dataSource="YunQi 年度查询 API"
          ruleVersion="YQ-MVP-RULES-1.0.0"
        />
      </>,
    );

    const explanation = screen.getByRole('region', {
      name: '规则结果说明',
    });
    const trace = screen.getByRole('region', {
      name: '追溯信息',
    });
    expect(explanation).toHaveTextContent('API 原文');
    expect(explanation).toHaveTextContent('前端未扩写');
    expect(trace).not.toHaveTextContent('API 原文');
    expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.0.0');
    expect(trace).toHaveTextContent('北京时间 UTC+08');
  });

  it('does not invent an explanation for an empty API array', () => {
    render(<RuleExplanationPanel explanations={[]} />);
    expect(
      screen.getByText('本次结果未提供规则说明'),
    ).toBeInTheDocument();
  });
});
