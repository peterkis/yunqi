import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createYunQiYearDto } from '../../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from '../../presentation/map-annual-yunqi';
import { AnnualYunQiPage } from './AnnualYunQiPage';

describe('AnnualYunQiPage', () => {
  it('selects the first API stage without current-state language', () => {
    const viewModel = mapAnnualYunQi(createYunQiYearDto());
    render(<AnnualYunQiPage viewModel={viewModel} />);

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

  it('keeps the detail eyebrow neutral outside checked-selection styling', () => {
    render(
      <AnnualYunQiPage
        viewModel={mapAnnualYunQi(createYunQiYearDto())}
      />,
    );

    const eyebrow = screen.getByText('Stage Detail');
    expect(eyebrow).toHaveClass('annual-six-qi-detail__eyebrow');
    expect(eyebrow).not.toHaveClass('section-label');
  });

  it('contains annual overflow locally without clipping the document', () => {
    const stylesheet = readFileSync('src/styles/global.css', 'utf8');
    const bodyDeclarations = stylesheet.match(
      /\nbody\s*\{([^}]*)\}/s,
    )?.[1];
    const pageDeclarations = stylesheet.match(
      /\.annual-yunqi-page\s*\{([^}]*)\}/s,
    )?.[1];
    const selectorDeclarations = stylesheet.match(
      /\.annual-six-qi-selector__options\s*\{([^}]*)\}/s,
    )?.[1];
    const rangeDeclarations = stylesheet.match(
      /\.annual-six-qi-selector__range\s*\{([^}]*)\}/s,
    )?.[1];

    expect(bodyDeclarations).not.toContain('overflow-x');
    expect(pageDeclarations).toContain('min-width: 0;');
    expect(selectorDeclarations).toContain('min-width: 0;');
    expect(selectorDeclarations).toContain('grid-template-columns:');
    expect(rangeDeclarations).toContain('overflow-wrap: anywhere;');
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
