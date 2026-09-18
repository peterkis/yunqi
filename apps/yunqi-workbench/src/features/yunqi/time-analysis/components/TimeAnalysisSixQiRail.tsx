import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { Badge } from '../../../../components/ui/Badge';
import { Panel } from '../../../../components/ui/Panel';
import type {
  SixQiStageTuple,
  SixQiStageViewModel,
} from '../../presentation/view-model';

export interface TimeAnalysisSixQiRailProps {
  readonly selectedStageIndex: SixQiStageViewModel['index'];
  readonly stages: SixQiStageTuple;
}

export function TimeAnalysisSixQiRail({
  selectedStageIndex,
  stages,
}: TimeAnalysisSixQiRailProps) {
  return (
    <Panel
      eyebrow="Six-Qi Stages"
      title="六气阶段概览"
      description="六阶段等宽展示，不代表实际时长比例。"
    >
      <ol className="time-analysis-stage-rail">
        {stages.map((stage) => {
          const isSelected = stage.index === selectedStageIndex;

          return (
            <li
              className={
                isSelected
                  ? 'time-analysis-stage-rail__stage time-analysis-stage-rail__stage--selected'
                  : 'time-analysis-stage-rail__stage'
              }
              key={stage.index}
            >
              <span className="time-analysis-stage-rail__index">
                第 {stage.index} 步
              </span>
              <strong>{stage.name}</strong>
              {isSelected ? (
                <Badge tone="accent">所选时点</Badge>
              ) : null}
              <span className="time-analysis-stage-rail__qi">
                主气 {stage.hostQi}
              </span>
              <span className="time-analysis-stage-rail__qi">
                客气 {stage.guestQi}
              </span>
              <span className="time-analysis-stage-rail__range">
                <YunQiTimeDisplay
                  showStandard={false}
                  value={stage.start}
                  variant="compact"
                />
                <span aria-hidden="true">—</span>
                <YunQiTimeDisplay
                  showStandard={false}
                  value={stage.end}
                  variant="compact"
                />
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
