import type { YunQiTimeViewModel } from '../../features/yunqi/presentation/view-model';

export interface YunQiTimeDisplayProps {
  readonly value: YunQiTimeViewModel;
  readonly variant?: 'compact' | 'year-minute' | 'month-day' | 'date-only' | 'month-day-second' | 'full';
}

function toHumanLocalTime(
  localTime: string,
  variant: NonNullable<YunQiTimeDisplayProps['variant']>,
) {
  if (variant === 'date-only') return localTime.slice(5, 10);
  if (variant === 'compact' || variant === 'year-minute') {
    return localTime.slice(variant === 'compact' ? 5 : 0, 16).replace('T', ' ');
  }
  if (variant === 'month-day') {
    return `${localTime.slice(5, 7)}月${localTime.slice(8, 10)}日 ${localTime.slice(11, 16)}`;
  }
  if (variant === 'month-day-second') {
    return localTime.slice(5, 19).replace('T', ' ');
  }

  return localTime.replace('T', ' ').replace(/\+08:00$/, '');
}

export function YunQiTimeDisplay({
  value,
  variant = 'full',
}: YunQiTimeDisplayProps) {
  const exact = variant === 'month-day-second' || variant === 'year-minute' || variant === 'date-only' ? toHumanLocalTime(value.localTime, 'full') : undefined;
  return (
    <span className="yunqi-time">
      <time dateTime={value.localTime} title={exact} aria-label={exact}>
        {toHumanLocalTime(value.localTime, variant)}
      </time>
    </span>
  );
}

export function YunQiTimeRange({ start, end, variant = 'compact' }: {
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly variant?: 'compact' | 'full';
}) {
  return <span className="yunqi-time-range"><YunQiTimeDisplay value={start} variant={variant} />{' '}
    <span className="yunqi-time-range__end"><span aria-hidden="true">→</span><span className="visually-hidden">至</span>{' '}
      <YunQiTimeDisplay value={end} variant={variant} /></span>
  </span>;
}
