import { InfoCard } from '../../../../components/design/InfoCard';
import { ElementDot } from '../../../../components/design/ElementDot';
import { YunQiTimeRange } from '../../../../components/time/YunQiTimeDisplay';
import { mapQiElement } from '../../presentation/visual-mappings';
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
    <InfoCard label="六气阶段概览" className="drilldown-stage-overview-card">
      <p className="drilldown-meta">按步序排列，仅标明所选时点所在阶段。</p>
      <ol className="drilldown-stage-overview">
        {stages.map((stage) => {
          const isSelected = stage.index === selectedStageIndex;
          const guestElement = mapQiElement(stage.guestQi);
          const hostElement = mapQiElement(stage.hostQi);

          return (
            <li
              className="drilldown-stage-overview__stage"
              key={stage.index}
            >
              <div className="drilldown-stage-overview__heading">
                <strong>{guestElement ? <ElementDot compact semanticTitle element={guestElement} label={stage.name} /> : stage.name}</strong>
                <YunQiTimeRange start={stage.start} end={stage.end} />
                <span className="drilldown-stage-overview__step">
                  {isSelected && <span className="drilldown-selection-label">所选时点</span>}
                  <span>第 {stage.index} 步</span>
                </span>
              </div>
              <div className="drilldown-stage-overview__qi">
                <span>主气 {hostElement ? <ElementDot compact element={hostElement} label={stage.hostQi} /> : stage.hostQi}</span>
                <span>客气 {guestElement ? <ElementDot compact element={guestElement} label={stage.guestQi} /> : stage.guestQi}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </InfoCard>
  );
}
