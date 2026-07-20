import type { YunQiTimeDto } from '@yunqi/contracts';

export interface YunQiTimeDisplayProps {
  readonly value: YunQiTimeDto;
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
      <span>北京时间 UTC+08</span>
    </span>
  );
}
