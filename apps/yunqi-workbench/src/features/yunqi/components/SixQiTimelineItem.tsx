import type { Ref } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { TimelineItem } from '../../../components/ui/TimelineItem';
import type { CurrentSixQiStageViewModel } from '../presentation/view-model';
import { GuestHostRelationDetail } from './GuestHostRelationDetail';
import { YunQiTimeRange } from './YunQiTimeRange';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';

export interface SixQiTimelineItemProps {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly rootRef: Ref<HTMLElement>;
  readonly step: CurrentSixQiStageViewModel;
  readonly timelineId: string;
}

export function SixQiTimelineItem({
  isExpanded,
  onToggle,
  rootRef,
  step,
  timelineId,
}: SixQiTimelineItemProps) {
  const ids = getSixQiTimelineIds(timelineId, step.index);
  const isCurrent = step.status.code === 'current';

  return (
    <TimelineItem
      id={ids.rootId}
      title={step.name}
      isCurrent={isCurrent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      rootRef={rootRef}
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
