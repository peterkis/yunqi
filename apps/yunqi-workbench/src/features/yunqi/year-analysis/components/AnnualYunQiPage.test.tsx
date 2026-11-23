import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createYunQiYearDto } from '../../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from '../../presentation/map-annual-yunqi';
import { AnnualYunQiPage } from './AnnualYunQiPage';

describe('AnnualYunQiPage', () => {
  it('selects the first API stage without current-state language', () => {
    const viewModel = mapAnnualYunQi(createYunQiYearDto());
    render(<AnnualYunQiPage viewModel={viewModel} />);

    expect(screen.getByText('规则实现基线，待正式专家冻结与验证。')).toBeInTheDocument();

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(6);
    expect(radios[0]).toBeChecked();
    expect(
      screen.getByRole('region', { name: '已选择：初之气' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('当前')).not.toBeInTheDocument();
    expect(screen.queryByText('已结束')).not.toBeInTheDocument();
    expect(screen.queryByText('未开始')).not.toBeInTheDocument();
  });

  it('changes only the single detail panel', async () => {
    const user = userEvent.setup();
    render(
      <AnnualYunQiPage
        viewModel={mapAnnualYunQi(createYunQiYearDto())}
      />,
    );

    await user.click(screen.getByRole('radio', { name: /三之气/ }));
    expect(
      screen.getByRole('region', { name: '已选择：三之气' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('region', { name: /已选择：/ }),
    ).toHaveLength(1);
  });

  it('supports native radio keyboard selection', async () => {
    const user = userEvent.setup();
    render(
      <AnnualYunQiPage
        viewModel={mapAnnualYunQi(createYunQiYearDto())}
      />,
    );

    const firstStage = screen.getByRole('radio', { name: /初之气/ });
    const secondStage = screen.getByRole('radio', { name: /二之气/ });

    firstStage.focus();
    await user.keyboard('{ArrowRight}');

    expect(secondStage).toHaveFocus();
    expect(secondStage).toBeChecked();
    expect(
      screen.getByRole('region', { name: '已选择：二之气' }),
    ).toBeInTheDocument();
  });

  it('announces the selected stage with compact boundaries and a precision disclosure reference', () => {
    render(
      <AnnualYunQiPage
        viewModel={mapAnnualYunQi(createYunQiYearDto())}
      />,
    );

    expect(screen.getByRole('heading', { name: '已选择：初之气' }))
      .toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('radio', { name: '第 1 步 初之气' }))
      .toHaveAccessibleDescription('开始 01-20 09:00，结束 03-21 10:00；精确边界见计算说明与版本');
  });

  it('keeps the new single-column stage list and unwrapped boundary times without document clipping', () => {
    const stylesheet = readFileSync('src/styles/views/drilldown.css', 'utf8');
    const bodyDeclarations = readFileSync('src/styles/global.css', 'utf8').match(
      /\nbody\s*\{([^}]*)\}/s,
    )?.[1];
    const pageDeclarations = stylesheet.match(
      /\.drilldown-page\s*\{([^}]*)\}/s,
    )?.[1];
    const selectorDeclarations = stylesheet.match(
      /\.drilldown-stage-selector__options\s*\{([^}]*)\}/s,
    )?.[1];
    const rangeDeclarations = stylesheet.match(
      /\.drilldown-stage-selector__range time\s*\{([^}]*)\}/s,
    )?.[1];

    expect(bodyDeclarations).not.toContain('overflow-x');
    expect(pageDeclarations).toContain('min-width: 0;');
    expect(selectorDeclarations).toContain('min-width: 0;');
    expect(selectorDeclarations).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(rangeDeclarations).toContain('white-space: nowrap;');
  });

  it('shows both complete API boundaries for all six choices and a three-column annual card', () => {
    const viewModel = mapAnnualYunQi(createYunQiYearDto());
    const { container } = render(<AnnualYunQiPage viewModel={viewModel} />);
    const options = container.querySelectorAll('.drilldown-stage-selector__option');
    expect(options).toHaveLength(6);
    for (const [index, option] of [...options].entries()) {
      const times = [...option.querySelectorAll('time')];
      expect(times.map((time) => time.dateTime)).toEqual([
        viewModel.stages[index].start.localTime, viewModel.stages[index].end.localTime,
      ]);
      for (const time of times) expect(time.textContent).toBe(time.dateTime.slice(5, 16).replace('T', ' '));
    }
    const annual = screen.getByRole('region', { name: '年度概览' });
    expect(within(annual).getByText('全年 · 2026')).toBeInTheDocument();
    expect(annual.querySelector('.ds-info-card__meta time')).toHaveAttribute('datetime', viewModel.summary.interval.start.localTime);
    expect(annual.querySelector('.ds-info-card')).toBeInTheDocument();
    expect([...annual.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['岁运', '司天', '在泉']);
    expect(annual.querySelectorAll('.ds-element__dot')).toHaveLength(3);
  });

  it('reserves all complete year and stage boundaries for calculation details', async () => {
    const user = userEvent.setup();
    const viewModel = mapAnnualYunQi(createYunQiYearDto());
    const { container } = render(<AnnualYunQiPage viewModel={viewModel} />);
    for (const time of container.querySelectorAll('time')) {
      if (!time.closest('.drilldown-technical')) expect(time.textContent).not.toMatch(/\d{2}:\d{2}:\d{2}|\.\d{3}/);
    }
    const details = screen.getByText('计算说明与版本').closest('details')!;
    expect(details).not.toHaveAttribute('open');
    await user.click(within(details).getByText('计算说明与版本'));
    const times = [...details.querySelectorAll('time')];
    expect(times.map((time) => time.dateTime)).toEqual([
      viewModel.summary.interval.start.localTime, viewModel.summary.interval.end.localTime,
      ...viewModel.stages.flatMap((stage) => [stage.start.localTime, stage.end.localTime]),
    ]);
    for (const time of times) expect(time).toBeVisible();
  });

  it('retains an explicit explanation empty state inside calculation details', async () => {
    const user = userEvent.setup();
    render(<AnnualYunQiPage viewModel={{ ...mapAnnualYunQi(createYunQiYearDto()), explanations: [] }} />);
    expect(screen.getByText('本次结果未提供规则说明')).not.toBeVisible();
    await user.click(screen.getByText('计算说明与版本'));
    expect(screen.getByText('本次结果未提供规则说明')).toBeVisible();
  });

  it('resets selection to the first returned stage when the year changes', async () => {
    const user = userEvent.setup();
    const dto = createYunQiYearDto();
    const { rerender } = render(
      <AnnualYunQiPage viewModel={mapAnnualYunQi(dto)} />,
    );

    await user.click(screen.getByRole('radio', { name: /三之气/ }));
    expect(screen.getByRole('radio', { name: /三之气/ })).toBeChecked();

    rerender(
      <AnnualYunQiPage
        viewModel={mapAnnualYunQi({ ...dto, year: dto.year + 1 })}
      />,
    );

    expect(screen.getByRole('radio', { name: /初之气/ })).toBeChecked();
    expect(
      screen.getByRole('region', { name: '已选择：初之气' }),
    ).toBeInTheDocument();
  });

  it('rejects a selected index missing from the annual model', async () => {
    const user = userEvent.setup();
    const viewModel = mapAnnualYunQi(createYunQiYearDto());
    const { rerender } = render(
      <AnnualYunQiPage viewModel={viewModel} />,
    );

    await user.click(screen.getByRole('radio', { name: /三之气/ }));

    const inconsistentViewModel = {
      ...viewModel,
      stages: [
        viewModel.stages[0],
        viewModel.stages[1],
        viewModel.stages[1],
        viewModel.stages[3],
        viewModel.stages[4],
        viewModel.stages[5],
      ],
    } as const;

    expect(() =>
      rerender(<AnnualYunQiPage viewModel={inconsistentViewModel} />),
    ).toThrowError('Selected annual Six-Qi stage is missing');
  });
});
