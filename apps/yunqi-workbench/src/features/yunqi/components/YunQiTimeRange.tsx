import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { YunQiTimeViewModel } from '../presentation/view-model';

export interface YunQiTimeRangeProps {
  readonly end: YunQiTimeViewModel;
  readonly start: YunQiTimeViewModel;
}

export function YunQiTimeRange({
  end,
  start,
}: YunQiTimeRangeProps) {
  return (
    <span className="yunqi-time-range">
      <YunQiTimeDisplay value={start} showStandard={false} />
      <span aria-hidden="true">—</span>
      <YunQiTimeDisplay value={end} showStandard={false} />
    </span>
  );
}
