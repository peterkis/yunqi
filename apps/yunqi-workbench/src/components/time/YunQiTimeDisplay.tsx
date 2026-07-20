import type { YunQiTimeViewModel } from '../../features/yunqi/presentation/view-model';

export interface YunQiTimeDisplayProps {
  readonly value: YunQiTimeViewModel;
}

function toHumanLocalTime(localTime: string) {
  return localTime.replace('T', ' ').replace(/\+08:00$/, '');
}

export function YunQiTimeDisplay({
  value,
}: YunQiTimeDisplayProps) {
  return (
    <span>
      <time dateTime={value.localTime}>
        {toHumanLocalTime(value.localTime)}
      </time>{' '}
      <span>{value.standard.label}</span>
    </span>
  );
}
