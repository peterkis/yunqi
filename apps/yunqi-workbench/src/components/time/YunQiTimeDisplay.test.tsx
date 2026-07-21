import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { YunQiTimeViewModel } from '../../features/yunqi/presentation/view-model';
import { YunQiTimeDisplay } from './YunQiTimeDisplay';

describe('YunQiTimeDisplay', () => {
  it('renders canonical fixed-Beijing local time from a presentation model', () => {
    const value: YunQiTimeViewModel = {
      localTime: '2026-01-01T12:00:00+08:00',
      standard: {
        code: 'BeijingStandardTime+08:00',
        label: '北京时间 UTC+08',
      },
    };

    render(<YunQiTimeDisplay value={value} />);

    const time = screen.getByText('2026-01-01 12:00:00');

    expect(time).toHaveAttribute(
      'dateTime',
      '2026-01-01T12:00:00+08:00',
    );
    expect(screen.getByText('北京时间 UTC+08')).toBeInTheDocument();
  });

  it.each([
    '2026-01-01T12:00:00+08:00',
    '2026-01-01T12:00:00.123+08:00',
  ])(
    'projects canonical local time into a compact string without changing dateTime: %s',
    (localTime) => {
      const value: YunQiTimeViewModel = {
        localTime,
        standard: {
          code: 'BeijingStandardTime+08:00',
          label: '北京时间 UTC+08',
        },
      };

      render(
        <YunQiTimeDisplay
          value={value}
          variant="compact"
          showStandard={false}
        />,
      );

      expect(screen.getByText('01-01 12:00')).toHaveAttribute(
        'dateTime',
        localTime,
      );
      expect(
        screen.queryByText('北京时间 UTC+08'),
      ).not.toBeInTheDocument();
    },
  );
});
