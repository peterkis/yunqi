import { render, screen } from '@testing-library/react';
import type { YunQiTimeDto } from '@yunqi/contracts';
import { describe, expect, it } from 'vitest';
import { YunQiTimeDisplay } from './YunQiTimeDisplay';

describe('YunQiTimeDisplay', () => {
  it('renders canonical fixed-Beijing local time without displaying the epoch value', () => {
    const value: YunQiTimeDto = {
      localTime: '2026-01-01T12:00:00+08:00',
      epochMilliseconds: 1,
      offset: '+08:00',
      calendarTimeStandard: 'BeijingStandardTime+08:00',
    };

    render(<YunQiTimeDisplay value={value} />);

    const time = screen.getByText('2026-01-01 12:00:00');

    expect(time).toHaveAttribute(
      'dateTime',
      '2026-01-01T12:00:00+08:00',
    );
    expect(screen.getByText('北京时间 UTC+08')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });
});
