import { InfoCard } from '../design/InfoCard';
import type { YunQiTimeEntryViewModel } from '../../features/yunqi/presentation/map-drilldown';
import { YunQiTimeDisplay, YunQiTimeRange } from './YunQiTimeDisplay';

/** Full precision is reserved for the enclosing calculation disclosure. */
export function YunQiTimeDetails({ entries }: {
  readonly entries: readonly YunQiTimeEntryViewModel[];
}) {
  return <InfoCard label="精确时刻">
    <p>区间起点包含，终点不包含。</p>
    <dl className="yunqi-time-details">
      {entries.map((entry) => <div key={entry.label}>
        <dt>{entry.label}</dt>
        <dd>{entry.end ? <YunQiTimeRange start={entry.start} end={entry.end} variant="full" />
          : <YunQiTimeDisplay value={entry.start} variant="full" />}
        </dd>
      </div>)}
    </dl>
  </InfoCard>;
}
