import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { mapCurrentYunQi } from '../presentation/map-current-yunqi';
import { CurrentYunQiPage } from './CurrentYunQiPage';

describe('CurrentYunQiPage', () => {
  it('renders the complete summary-first current YunQi view', () => {
    render(
      <CurrentYunQiPage
        viewModel={mapCurrentYunQi(createYunQiCalculationDto())}
      />,
    );

    expect(
      screen.getByRole('heading', { name: '当前五运六气' }),
    ).toBeInTheDocument();
    const inputTime = screen.getByText('2026-06-19 12:00:00');
    expect(inputTime).toHaveAttribute(
      'dateTime',
      '2026-06-19T12:00:00+08:00',
    );
    expect(inputTime.parentElement).toHaveTextContent(
      '北京时间 UTC+08',
    );

    const yearSummary = screen.getByRole('region', {
      name: '年度概览',
    });
    expect(within(yearSummary).getByText('2026')).toBeInTheDocument();
    expect(within(yearSummary).getByText('丙午')).toBeInTheDocument();
    expect(
      within(yearSummary).getByText('太羽 · 水 · 太过'),
    ).toBeInTheDocument();
    expect(
      within(yearSummary).getByText('少阳相火'),
    ).toBeInTheDocument();
    expect(
      within(yearSummary).getByText('厥阴风木'),
    ).toBeInTheDocument();

    const current = screen.getByRole('region', {
      name: '当前所在六步',
    });
    expect(
      within(current).getByRole('heading', { name: '三之气' }),
    ).toBeInTheDocument();
    expect(within(current).getByText('客生主')).toBeInTheDocument();

    const timeline = screen.getByRole('region', {
      name: '六步交接时间线',
    });
    expect(
      within(timeline).getByRole('navigation', {
        name: '六气年度六阶段概览',
      }),
    ).toBeInTheDocument();
    expect(
      within(timeline).getAllByRole('button', {
        name: /第 [1-6] 步/,
      }),
    ).toHaveLength(6);
    expect(
      within(timeline).getAllByRole('article'),
    ).toHaveLength(6);
    expect(
      within(timeline).getByRole('button', {
        name: '收起三之气详情',
      }),
    ).toHaveAttribute('aria-expanded', 'true');

    const explanation = screen.getByRole('region', {
      name: '规则结果说明',
    });
    expect(explanation).toHaveTextContent(
      '本结果依据冻结规则计算。',
    );
    expect(explanation).toHaveTextContent(
      '传统理论说明仅供医生学习与复盘。',
    );
    expect(explanation).toHaveTextContent('前端未扩写');

    const trace = screen.getByRole('region', {
      name: '追溯信息',
    });
    expect(trace).not.toHaveTextContent(
      '本结果依据冻结规则计算。',
    );
    expect(trace).toHaveTextContent('YunQi 当前查询 API');
    expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.0.0');
    expect(trace).toHaveTextContent('YQ-MVP-RULES-1.0.0');
    expect(trace).toHaveTextContent('北京时间 UTC+08');
  });
});
