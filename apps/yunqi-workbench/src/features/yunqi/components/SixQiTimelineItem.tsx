import { Badge } from '../../../components/ui/Badge';
import { TimelineItem } from '../../../components/ui/TimelineItem';
import type { SixQiTimelineItemViewModel } from '../presentation/view-model';
import { GuestHostRelationDetail } from './GuestHostRelationDetail';
import { YunQiTimeRange } from './YunQiTimeRange';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';

export interface SixQiTimelineItemProps {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly step: SixQiTimelineItemViewModel;
}

export function SixQiTimelineItem({
  isExpanded,
  onToggle,
  step,
}: SixQiTimelineItemProps) {
  const ids = getSixQiTimelineIds(step.index);
  const isCurrent = step.status.code === 'current';

  return (
    <TimelineItem
      id={ids.rootId}
      title={step.name}
      isCurrent={isCurrent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summary={
        <div className="sixqi-step-summary">
          {!isCurrent ? (
            <Badge tone="neutral">{step.status.label}</Badge>
          ) : null}
          <YunQiTimeRange start={step.start} end={step.end} />
          <span>
            主气 {step.hostQi} · 客气 {step.guestQi}
          </span>
          <strong>{step.relation.traditionalLabel}</strong>
        </div>
      }
    >
      <GuestHostRelationDetail relation={step.relation} />
    </TimelineItem>
  );
}
