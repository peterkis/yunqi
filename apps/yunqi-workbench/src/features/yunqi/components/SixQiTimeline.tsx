import { useEffect, useState } from 'react';
import { Panel } from '../../../components/ui/Panel';
import type { SixQiTimelineViewModel } from '../presentation/view-model';
import { AnnualStageRail } from './AnnualStageRail';
import { SixQiTimelineItem } from './SixQiTimelineItem';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';

export interface SixQiTimelineProps {
  readonly currentStepIndex: number;
  readonly steps: SixQiTimelineViewModel;
}

export function SixQiTimeline({
  currentStepIndex,
  steps,
}: SixQiTimelineProps) {
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

    document
      .getElementById(getSixQiTimelineIds(index).rootId)
      ?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <Panel
      eyebrow="Six-Qi Sequence"
      title="六步交接时间线"
      description="当前步默认展开；可同时展开多个节点比较客主关系。"
    >
      <AnnualStageRail
        steps={steps}
        expandedSteps={expandedSteps}
        onRevealStep={revealStep}
      />
      <div className="sixqi-timeline">
        {steps.map((step) => (
          <SixQiTimelineItem
            key={step.index}
            step={step}
            isExpanded={expandedSteps.has(step.index)}
            onToggle={() => toggleStep(step.index)}
          />
        ))}
      </div>
    </Panel>
  );
}
