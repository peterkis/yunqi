import type { YunQiTimeViewModel } from '../../features/yunqi/presentation/view-model';

export interface YunQiTimeDisplayProps {
  readonly value: YunQiTimeViewModel;
  readonly variant?: 'compact' | 'month-day' | 'full';
}

function toHumanLocalTime(
  localTime: string,
  variant: NonNullable<YunQiTimeDisplayProps['variant']>,
) {
  if (variant === 'compact') {
    return localTime.slice(5, 16).replace('T', ' ');
  }
  if (variant === 'month-day') {
    return `${localTime.slice(5, 7)}月${localTime.slice(8, 10)}日 ${localTime.slice(11, 16)}`;
  }

  return localTime.replace('T', ' ').replace(/\+08:00$/, '');
}

export function YunQiTimeDisplay({
  value,
  variant = 'full',
}: YunQiTimeDisplayProps) {
  return (
    <span className="yunqi-time">
      <time dateTime={value.localTime}>
        {toHumanLocalTime(value.localTime, variant)}
      </time>
    </span>
  );
}
