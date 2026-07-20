import type { YunQiTimeViewModel } from '../../features/yunqi/presentation/view-model';

export interface YunQiTimeDisplayProps {
  readonly showStandard?: boolean;
  readonly value: YunQiTimeViewModel;
}

function toHumanLocalTime(localTime: string) {
  return localTime.replace('T', ' ').replace(/\+08:00$/, '');
}

export function YunQiTimeDisplay({
  showStandard = true,
  value,
}: YunQiTimeDisplayProps) {
  return (
    <span className="yunqi-time">
      <time dateTime={value.localTime}>
        {toHumanLocalTime(value.localTime)}
      </time>
      {showStandard ? (
        <span className="yunqi-time__standard">
          {value.standard.label}
        </span>
      ) : null}
    </span>
  );
}
