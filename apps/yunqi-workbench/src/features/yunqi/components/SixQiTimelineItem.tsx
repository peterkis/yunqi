import { TimelineItem } from '../../../components/ui/TimelineItem';
import type { SixQiTimelineItemViewModel } from '../presentation/view-model';
import { GuestHostRelationDetail } from './GuestHostRelationDetail';
import { YunQiTimeRange } from './YunQiTimeRange';

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
  return (
    <TimelineItem
      id={`sixqi-step-${step.index}`}
      title={step.name}
      isCurrent={step.isCurrent}
      isExpanded={isExpanded}
      onToggle={onToggle}
      summary={
        <div className="sixqi-step-summary">
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

