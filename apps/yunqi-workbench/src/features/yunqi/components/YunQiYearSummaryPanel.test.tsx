import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createYunQiYearDto } from '../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from '../presentation/map-annual-yunqi';
import { YunQiYearSummaryPanel } from './YunQiYearSummaryPanel';

describe('YunQiYearSummaryPanel', () => {
  // Consensus R-12 puts the movement/state first; the rule table supplies
  // the actual element/state/tone combinations for these display cases.
  it.each([
    {
      suiYun: { element: '水', state: '太过', tone: '太羽' },
      expected: '水运太过（太羽）',
    },
    {
      suiYun: { element: '木', state: '不及', tone: '少角' },
      expected: '木运不及（少角）',
    },
  ] as const)('shows $expected as the primary SuiYun result', ({
    suiYun,
    expected,
  }) => {
    const { summary } = mapAnnualYunQi(createYunQiYearDto());
    render(
      <YunQiYearSummaryPanel summary={{ ...summary, suiYun }} />,
    );

    expect(
      within(screen.getByRole('region', { name: '年度概览' }))
        .getByText(expected),
    ).toBeInTheDocument();
  });
});
