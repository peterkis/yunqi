import type { Ref } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../components/design/Button';
import { ElementDot } from '../../../components/design/ElementDot';
import { RelationChip } from '../../../components/design/RelationChip';
import type { MovementViewModel } from '../presentation/map-learning';
import { mapRelationDirection } from '../presentation/visual-mappings';
import type { CurrentSixQiStageViewModel } from '../presentation/view-model';
import { CurrentElementValue, CurrentTimeRange } from './CurrentYunQiParts';

interface StageTimelineItemProps {
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly rootRef: Ref<HTMLElement>;
  readonly step: CurrentSixQiStageViewModel | MovementViewModel;
  readonly rootId: string;
}

export function StageTimelineItem({ isExpanded, onToggle, rootRef, step, rootId }: StageTimelineItemProps) {
  const detailId = `${rootId}-details`;
  const labelId = `${rootId}-label`;
  const Chevron = isExpanded ? ChevronUp : ChevronDown;
  const isQi = 'hostQi' in step;
  const relation = isQi ? {
    tone: mapRelationDirection(step.relation.direction.code).tone,
    label: step.relation.traditionalLabel.replace('，', ' · '),
    explanation: [step.relation.qi.label, step.relation.element.label, step.relation.direction.label].join(' · '),
  } : step.relation;
  return <article id={rootId} ref={rootRef} className={isQi ? 'current-stage-row' : 'current-stage-row current-period'} data-expanded={isExpanded}>
    <div className="current-stage-row__heading">
      <div className="current-stage-row__title">
        <h3>{step.guestElement ? <ElementDot compact semanticTitle element={step.guestElement} label={step.name} /> : step.name}</h3>
        <span className={step.status.code === 'current' ? 'current-stage-badge' : 'current-stage-status'}>{step.status.label}</span>
      </div>
      <CurrentTimeRange start={step.start} end={step.end} variant={isExpanded ? 'compact' : 'date-only'} />
      <Button variant="text" aria-label={`${isExpanded ? '收起' : '展开'}${step.name}详情`}
        aria-controls={detailId} aria-expanded={isExpanded} onClick={onToggle}>
        {isExpanded && '详情'}<Chevron aria-hidden="true" />
      </Button>
    </div>
    <div id={detailId} role="region" aria-labelledby={labelId} hidden={!isExpanded}>
      <h4 id={labelId} className="visually-hidden">{step.name}详情</h4>
      <div className="current-stage-comparison">
        <dl><dt>{isQi ? '主气' : '主运'}</dt><dd><CurrentElementValue element={step.hostElement} label={isQi ? step.hostQi : step.hostLabel} /></dd></dl>
        {relation.explanation && <p className="current-stage-comparison__direction ds-relation__explanation">{relation.explanation}</p>}
        <div className="current-stage-comparison__divider">
          <RelationChip compact={isQi} tone={relation.tone} label={relation.label} />
        </div>
        <dl><dt>{isQi ? '客气' : '客运'}</dt><dd><CurrentElementValue element={step.guestElement} label={isQi ? step.guestQi : step.guestLabel} /></dd></dl>
      </div>
    </div>
  </article>;
}
