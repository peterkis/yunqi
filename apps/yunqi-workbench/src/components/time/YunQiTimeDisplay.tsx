import type { YunQiTimeViewModel } from '../../features/yunqi/presentation/view-model';

export interface YunQiTimeDisplayProps {
  readonly showStandard?: boolean;
  readonly value: YunQiTimeViewModel;
  readonly variant?: 'compact' | 'full';
}

function toHumanLocalTime(
  localTime: string,
  variant: NonNullable<YunQiTimeDisplayProps['variant']>,
) {
  if (variant === 'compact') {
    return localTime.slice(5, 16).replace('T', ' ');
  }

  return localTime.replace('T', ' ').replace(/\+08:00$/, '');
}

export function YunQiTimeDisplay({
  showStandard = true,
  value,
  variant = 'full',
}: YunQiTimeDisplayProps) {
  return (
    <span className="yunqi-time">
      <time dateTime={value.localTime}>
        {toHumanLocalTime(value.localTime, variant)}
      </time>
      {showStandard ? (
        <span className="yunqi-time__standard">
          {value.standard.label}
        </span>
      ) : null}
    </span>
  );
}
