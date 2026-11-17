import { InfoCard } from '../../../../components/design/InfoCard';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
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
    <InfoCard label="六气阶段概览" meta="北京时间 UTC+08">
      <p className="drilldown-meta">按步序排列，仅标明所选时点所在阶段。</p>
      <ol className="drilldown-stage-overview">
        {stages.map((stage) => {
          const isSelected = stage.index === selectedStageIndex;

          return (
            <li
              className="drilldown-stage-overview__stage"
              key={stage.index}
            >
              <span className="drilldown-meta">
                第 {stage.index} 步
              </span>
              <strong>{stage.name}</strong>
              {isSelected ? (
                <span className="drilldown-selection-label">所选时点</span>
              ) : null}
              <span className="drilldown-copy">
                主气 {stage.hostQi}
              </span>
              <span className="drilldown-copy">
                客气 {stage.guestQi}
              </span>
              <span className="drilldown-boundaries">
                <YunQiTimeDisplay
                  variant="compact"
                  showStandard={false}
                  value={stage.start}
                />
                <span>→ <YunQiTimeDisplay
                  variant="compact"
                  showStandard={false}
                  value={stage.end}
                /></span>
              </span>
            </li>
          );
        })}
      </ol>
    </InfoCard>
  );
}
