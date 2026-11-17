import type { Ref } from 'react';
import { Button } from '../../../components/design/Button';
import type { CurrentSixQiStageViewModel } from '../presentation/view-model';
import { CurrentElementValue, CurrentTimeRange } from './CurrentYunQiParts';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';

export interface SixQiTimelineItemProps {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly rootRef: Ref<HTMLElement>;
  readonly step: CurrentSixQiStageViewModel;
  readonly timelineId: string;
}

export function SixQiTimelineItem({ isExpanded, onToggle, rootRef, step, timelineId }: SixQiTimelineItemProps) {
  const ids = getSixQiTimelineIds(timelineId, step.index);
  const detailId = `${ids.rootId}-details`;
  const labelId = `${ids.rootId}-label`;
  return <article id={ids.rootId} ref={rootRef} className="current-stage-row">
    <div className="current-stage-row__heading">
      <h3>{step.name}</h3><span className="current-meta">{step.status.label}</span>
      <Button variant="text" aria-label={`${isExpanded ? '收起' : '展开'}${step.name}详情`}
        aria-controls={detailId} aria-expanded={isExpanded} onClick={onToggle}>详情</Button>
    </div>
    <CurrentTimeRange start={step.start} end={step.end} />
    <dl className="current-pair">
      <div><dt>主气</dt><dd><CurrentElementValue element={step.hostElement} label={step.hostQi} /></dd></div>
      <div><dt>客气</dt><dd><CurrentElementValue element={step.guestElement} label={step.guestQi} /></dd></div>
    </dl>
    <p className="current-copy">{step.relation.traditionalLabel}</p>
    <div id={detailId} role="region" aria-labelledby={labelId} hidden={!isExpanded}>
      <h4 id={labelId} className="visually-hidden">{step.name}详情</h4>
      <dl className="current-relation-facts">
        <div><dt>气关系</dt><dd>{step.relation.qi.label}</dd></div>
        <div><dt>五行关系</dt><dd>{step.relation.element.label}</dd></div>
        <div><dt>方向关系</dt><dd>{step.relation.direction.label}</dd></div>
        <div><dt>传统描述</dt><dd>{step.relation.traditionalLabel}</dd></div>
      </dl>
    </div>
  </article>;
}
