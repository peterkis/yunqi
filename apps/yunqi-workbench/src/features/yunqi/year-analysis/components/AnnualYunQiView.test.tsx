import { createClientStub } from '../../../../test/learning-fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { YunQiClient } from '@yunqi/client';
import { describe, expect, it, vi } from 'vitest';
import { createTestWrapper } from '../../../../test/test-utils';
import { createYunQiYearDto } from '../../../../test/yunqi-fixtures';
import { AnnualYunQiView } from './AnnualYunQiView';

function createClient(overrides: Partial<YunQiClient> = {}): YunQiClient {
  return {
    ...createClientStub(),
    getCurrent: vi.fn(),
    getYear: vi.fn(),
    calculate: vi.fn(),
    ...overrides,
  };
}

describe('AnnualYunQiView', () => {
  it('renders a dedicated pending state without annual facts', async () => {
    const client = createClient({
      ...createClientStub(),
      getYear: vi.fn(
        () =>
          new Promise<ReturnType<typeof createYunQiYearDto>>(
            () => undefined,
          ),
      ),
    });

    render(<AnnualYunQiView year={2026} />, {
      wrapper: createTestWrapper(client),
    });

    expect(
      await screen.findByText('正在加载 2026 年年度五运六气数据'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: '年度概览' }),
    ).not.toBeInTheDocument();
  });

  it('sanitizes annual errors and retries the query', async () => {
    const user = userEvent.setup();
    const client = createClient({
      ...createClientStub(),
      getYear: vi
        .fn()
        .mockRejectedValueOnce(
          new Error('internal database password and host leaked'),
        )
        .mockResolvedValueOnce(createYunQiYearDto()),
    });

    render(<AnnualYunQiView year={2026} />, {
      wrapper: createTestWrapper(client),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '年度数据加载失败',
    );
    expect(
      screen.queryByText(/internal database password and host leaked/),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(
      await screen.findByRole('region', { name: '年度概览' }),
    ).toBeInTheDocument();
    expect(client.getYear).toHaveBeenCalledTimes(2);
  });

  it('renders an explicit annual empty state', async () => {
    const client = createClient({
      ...createClientStub(),
      getYear: vi.fn().mockResolvedValue(null),
    });

    render(<AnnualYunQiView year={2026} />, {
      wrapper: createTestWrapper(client),
    });

    expect(
      await screen.findByText('该年度暂无可展示数据'),
    ).toBeInTheDocument();
  });

  it('maps successful annual data using canonical localTime only', async () => {
    const user = userEvent.setup();
    const dto = createYunQiYearDto();
    const client = createClient({
      ...createClientStub(),
      getYear: vi.fn().mockResolvedValue(dto),
    });

    render(<AnnualYunQiView year={2026} />, {
      wrapper: createTestWrapper(client),
    });

    const annual = await screen.findByRole('region', { name: '年度概览' });
    expect(annual).toBeVisible();
    expect(screen.getAllByText('北京时间 UTC+08').length).toBeGreaterThan(0);
    expect(annual.querySelector('.ds-info-card__meta time')).toHaveTextContent('01-20 09:00');
    expect(annual.querySelector('.ds-info-card__meta time')).toHaveAttribute('datetime', dto.interval.start.localTime);
    expect(annual.textContent).not.toMatch(/\d{2}:\d{2}:\d{2}|\.\d{3}/);
    const summary = screen.getByText('计算说明与版本');
    const calculation = summary.closest('details')!;
    const boundaries = calculation.querySelectorAll('time');
    expect(calculation).not.toHaveAttribute('open');
    expect(boundaries[0]).not.toBeVisible();
    await user.click(summary);
    for (const [index, boundary] of [dto.interval.start, dto.interval.end].entries()) {
      expect(boundaries[index]).toBeVisible();
      expect(boundaries[index]).toHaveTextContent(boundary.localTime.replace('T', ' ').replace(/\+08:00$/, ''));
      expect(boundaries[index]).toHaveAttribute('datetime', boundary.localTime);
    }
    expect(screen.queryByText('当前')).not.toBeInTheDocument();
    expect(screen.queryByText('已结束')).not.toBeInTheDocument();
    expect(screen.queryByText('未开始')).not.toBeInTheDocument();
  });
});
