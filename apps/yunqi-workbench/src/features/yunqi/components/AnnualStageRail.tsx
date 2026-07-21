import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type {
  SixQiTimelineItemViewModel,
  SixQiTimelineViewModel,
} from '../presentation/view-model';
import { getSixQiTimelineIds } from './six-qi-timeline-ids';

export interface AnnualStageRailProps {
  readonly expandedSteps: ReadonlySet<
    SixQiTimelineItemViewModel['index']
  >;
  readonly onRevealStep: (
    index: SixQiTimelineItemViewModel['index'],
  ) => void;
  readonly steps: SixQiTimelineViewModel;
}

function stageAccessibleName(step: SixQiTimelineItemViewModel) {
  return [
    `第 ${step.index} 步`,
    step.name,
    step.status.label,
    `开始 ${step.start.localTime}`,
    `结束 ${step.end.localTime}`,
  ].join('，');
}

export function AnnualStageRail({
  expandedSteps,
  onRevealStep,
  steps,
}: AnnualStageRailProps) {
  return (
    <nav className="annual-stage-rail" aria-label="六气年度六阶段概览">
      <ol className="annual-stage-rail__stages">
        {steps.map((step) => {
          const ids = getSixQiTimelineIds(step.index);
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
                aria-label={stageAccessibleName(step)}
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
