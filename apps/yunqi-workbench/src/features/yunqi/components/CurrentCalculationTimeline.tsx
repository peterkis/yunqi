import { useId } from 'react';
import { InfoCard } from '../../../components/design/InfoCard';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { LearningViewModel, MovementViewModel } from '../presentation/map-learning';
import type { YunQiTimeViewModel } from '../presentation/view-model';
import './CurrentCalculationTimeline.css';

function TimeRange({ start, end, variant }: {
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly variant: 'year-minute' | 'month-day-second';
}) {
  return <span className="calculation-timeline__range">
    <YunQiTimeDisplay value={start} variant={variant} />
    <span aria-hidden="true" className="calculation-timeline__arrow">→</span>
    <span className="visually-hidden">至</span>
    <YunQiTimeDisplay value={end} variant={variant} />
  </span>;
}

function StageSequence({ kind, stages, currentIndex, years }: {
  readonly kind: 'qi' | 'movement';
  readonly stages: readonly Pick<MovementViewModel, 'index' | 'name' | 'start' | 'end'>[];
  readonly currentIndex: number;
  readonly years?: string;
}) {
  const headingId = useId();
  return <section className="calculation-sequence" data-kind={kind} aria-labelledby={headingId}>
    <header><h4 id={headingId}>{kind === 'qi' ? '六步气' : '五步运'}</h4>{years && <span>{years}</span>}</header>
    <ol>{stages.map(stage => {
      const current = stage.index === currentIndex;
      return <li key={stage.index} aria-current={current ? 'step' : undefined}>
        <span className="calculation-sequence__label">{stage.name}{current && <span className="calculation-sequence__badge">当前</span>}</span>
        <TimeRange start={stage.start} end={stage.end} variant="month-day-second" />
      </li>;
    })}</ol>
  </section>;
}

export function CurrentCalculationTimeline({ learning }: { readonly learning: LearningViewModel }) {
  const { inputTime, summary, timeline, currentStep } = learning.facts;
  const { start, end } = summary.interval;
  const years = `${start.localTime.slice(0, 4)}–${end.localTime.slice(0, 4)}`;
  return <InfoCard className="calculation-timeline" label="精确时刻" meta={<span className="calculation-timeline__convention">区间：含起不含终</span>}>
    <dl className="calculation-timeline__anchors">
      <div><dt>计算时刻</dt><dd><YunQiTimeDisplay value={inputTime} /></dd></div>
      <div><dt>运气年</dt><dd><TimeRange start={start} end={end} variant="year-minute" /></dd></div>
    </dl>
    <StageSequence kind="qi" stages={timeline} currentIndex={currentStep.index} years={years} />
    <StageSequence kind="movement" stages={learning.movements} currentIndex={learning.currentMovement.index} />
  </InfoCard>;
}
