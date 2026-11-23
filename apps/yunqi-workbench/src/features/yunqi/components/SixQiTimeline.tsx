import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../components/design/Button';
import { InfoCard } from '../../../components/design/InfoCard';
import type { CurrentSixQiStageTuple } from '../presentation/view-model';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';
import { SixQiTimelineItem } from './SixQiTimelineItem';

export interface SixQiTimelineProps {
  readonly currentStepIndex: number;
  readonly steps: CurrentSixQiStageTuple;
}

export function SixQiTimeline({
  currentStepIndex,
  steps,
}: SixQiTimelineProps) {
  const timelineId = `sixqi-timeline-${useId()}`;
  const stepRoots = useRef(new Map<number, HTMLElement>());
  const [expandedSteps, setExpandedSteps] = useState<
    ReadonlySet<number>
  >(() => new Set([currentStepIndex]));

  useEffect(() => {
    setExpandedSteps((current) => {
      if (current.has(currentStepIndex)) return current;

      const next = new Set(current);
      next.add(currentStepIndex);
      return next;
    });
  }, [currentStepIndex]);

  function toggleStep(index: number) {
    setExpandedSteps((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function revealStep(index: number) {
    setExpandedSteps((current) => {
      if (current.has(index)) return current;

      const next = new Set(current);
      next.add(index);
      return next;
    });

    stepRoots.current.get(index)?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <InfoCard label="六步交接时间线">
      <p className="current-copy">当前步默认展开；可同时展开多个节点比较客主关系。</p>
      <nav className="current-stage-navigation" aria-label="六气年度六阶段概览">
        {steps.map((step) => <Button key={step.index} variant="text"
          aria-label={`第 ${step.index} 步 ${step.name}，${step.status.label}`}
          aria-controls={getSixQiTimelineIds(timelineId, step.index).rootId}
          aria-expanded={expandedSteps.has(step.index)}
          aria-current={step.status.code === 'current' ? 'step' : undefined}
          onClick={() => revealStep(step.index)}>{step.tickLabel}</Button>)}
      </nav>
      <div className="current-stage-list">
        {steps.map((step) => (
          <SixQiTimelineItem
            key={step.index}
            step={step}
            isExpanded={expandedSteps.has(step.index)}
            onToggle={() => toggleStep(step.index)}
            timelineId={timelineId}
            rootRef={(element) => {
              if (element) {
                stepRoots.current.set(step.index, element);
              } else {
                stepRoots.current.delete(step.index);
              }
            }}
          />
        ))}
      </div>
    </InfoCard>
  );
}
