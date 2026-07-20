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
    expect(
      screen.getByText('2026-06-19 12:00:00'),
    ).toHaveAttribute(
      'dateTime',
      '2026-06-19T12:00:00+08:00',
    );
    expect(screen.getByText('北京时间 UTC+08')).toBeInTheDocument();

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
      within(timeline).getAllByRole('article'),
    ).toHaveLength(6);
    expect(
      within(timeline).getByRole('button', {
        name: '收起三之气详情',
      }),
    ).toHaveAttribute('aria-expanded', 'true');

    const theory = screen.getByRole('region', {
      name: '理论说明与追溯',
    });
    expect(theory).toHaveTextContent('本结果依据冻结规则计算。');
    expect(theory).toHaveTextContent(
      '传统理论说明仅供医生学习与复盘。',
    );
    expect(theory).toHaveTextContent('YQ-MVP-RULES-1.0.0');
  });
});
