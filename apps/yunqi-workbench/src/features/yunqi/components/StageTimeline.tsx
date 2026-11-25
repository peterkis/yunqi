import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../../components/design/Button';
import type { MovementViewModel } from '../presentation/map-learning';
import type { CurrentSixQiStageTuple } from '../presentation/view-model';
import { StageTimelineItem } from './StageTimelineItem';

export type StageTimelineProps = { readonly currentStepIndex: number } & (
  | { readonly kind: 'qi'; readonly steps: CurrentSixQiStageTuple }
  | { readonly kind: 'movement'; readonly steps: readonly MovementViewModel[] }
);

export function StageTimeline({ currentStepIndex, steps, kind }: StageTimelineProps) {
  const timelineId = `${kind === 'qi' ? 'sixqi' : 'movement'}-timeline-${useId()}`;
  const rootId = (index: number) => `${timelineId}-step-${index}`;
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

  function toggleFromNavigation(index: number) {
    if (!expandedSteps.has(index)) stepRoots.current.get(index)?.scrollIntoView({ block: 'nearest' });
    toggleStep(index);
  }

  const methods = kind === 'movement' ? [...new Set(steps.map(step => step.explanation).filter(Boolean))] : [];

  return (
    <section className="current-chronicle" data-kind={kind} aria-labelledby={`${timelineId}-title`}>
      <header className="current-chronicle__header">
        <h2 id={`${timelineId}-title`}>{kind === 'qi' ? '六气交接时间线' : '五运全表'}</h2>
        <span className="current-meta">可展开多步对比</span>
      </header>
      <nav className="current-stage-navigation" aria-label={kind === 'qi' ? '六气年度六阶段概览' : '五运年度五阶段概览'}>
        {steps.map(step => <Button key={step.index} variant="text"
          aria-label={`第 ${step.index} 步 ${step.name}，${step.status.label}`}
          aria-controls={rootId(step.index)}
          aria-expanded={expandedSteps.has(step.index)}
          aria-current={step.status.code === 'current' ? 'step' : undefined}
          onClick={() => toggleFromNavigation(step.index)}>
          <span className="current-stage-navigation__point" aria-hidden="true" />
          <span className="current-stage-navigation__label">{step.tickLabel}</span>
        </Button>)}
      </nav>
      <div className="current-stage-list">
        {steps.map((step) => (
          <StageTimelineItem
            key={step.index}
            step={step}
            isExpanded={expandedSteps.has(step.index)}
            onToggle={() => toggleStep(step.index)}
            rootId={rootId(step.index)}
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
      {methods.length > 0 && <footer className="current-stage-method" role="group" aria-labelledby={`${timelineId}-method`}>
        <strong id={`${timelineId}-method`}>推演口径</strong>
        {methods.map(text => <p key={text}>{text}</p>)}
      </footer>}
    </section>
  );
}
