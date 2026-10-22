import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type {
  CurrentSixQiStageTuple,
  CurrentSixQiStageViewModel,
} from '../presentation/view-model';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';

export interface AnnualStageRailProps {
  readonly expandedSteps: ReadonlySet<
    CurrentSixQiStageViewModel['index']
  >;
  readonly onRevealStep: (
    index: CurrentSixQiStageViewModel['index'],
  ) => void;
  readonly steps: CurrentSixQiStageTuple;
  readonly timelineId: string;
}

export function AnnualStageRail({
  expandedSteps,
  onRevealStep,
  steps,
  timelineId,
}: AnnualStageRailProps) {
  return (
    <nav className="annual-stage-rail" aria-label="六气年度六阶段概览">
      <ol className="annual-stage-rail__stages">
        {steps.map((step) => {
          const ids = getSixQiTimelineIds(timelineId, step.index);
          const isCurrent = step.status.code === 'current';

          return (
            <li
              key={step.index}
              className={`annual-stage-rail__stage annual-stage-rail__stage--${step.status.code}`}
            >
              <button
                className="annual-stage-rail__button"
                type="button"
                aria-controls={ids.detailsId}
                aria-current={isCurrent ? 'step' : undefined}
                aria-expanded={expandedSteps.has(step.index)}
                aria-describedby={`${ids.rootId}-boundaries`}
                onClick={() => onRevealStep(step.index)}
              >
                <span className="annual-stage-rail__index">
                  第 {step.index} 步
                </span>
                <strong>{step.name}</strong>
                <span className="annual-stage-rail__status">
                  {step.status.label}
                </span>
                <span className="annual-stage-rail__range">
                  <YunQiTimeDisplay
                    value={step.start}
                    variant="compact"
                    showStandard={false}
                  />
                  <span aria-hidden="true">—</span>
                  <YunQiTimeDisplay
                    value={step.end}
                    variant="compact"
                    showStandard={false}
                  />
                </span>
              </button>
              <span className="visually-hidden" id={`${ids.rootId}-boundaries`}>
                开始 {step.start.localTime}，结束 {step.end.localTime}，北京时间 UTC+08
              </span>
            </li>
          );
        })}
      </ol>
      <p className="annual-stage-rail__disclaimer">
        阶段等宽展示，不代表实际时长比例。
      </p>
    </nav>
  );
}
