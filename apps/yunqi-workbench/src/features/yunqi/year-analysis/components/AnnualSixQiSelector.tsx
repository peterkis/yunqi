import { useId } from 'react';
import { InfoCard } from '../../../../components/design/InfoCard';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import type {
  SixQiStageTuple,
  SixQiStageViewModel,
} from '../../presentation/view-model';

export interface AnnualSixQiSelectorProps {
  readonly onSelect: (index: SixQiStageViewModel['index']) => void;
  readonly selectedStepIndex: SixQiStageViewModel['index'];
  readonly stages: SixQiStageTuple;
}

export function AnnualSixQiSelector({
  onSelect,
  selectedStepIndex,
  stages,
}: AnnualSixQiSelectorProps) {
  const groupName = `annual-six-qi-${useId()}`;

  return (
    <InfoCard label="六气 · 年度阶段">
      <fieldset className="drilldown-stage-selector">
        <legend>选择六气阶段</legend>
        <p className="drilldown-meta">选择后在下方查看详情 · 北京时间 UTC+08</p>
        <div className="drilldown-stage-selector__options">
          {stages.map((stage) => (
            <label
              className="drilldown-stage-selector__option"
              key={stage.index}
            >
              <input
                aria-label={`第 ${stage.index} 步 ${stage.name}`}
                aria-describedby={`${groupName}-${stage.index}-range`}
                checked={stage.index === selectedStepIndex}
                name={groupName}
                onChange={() => onSelect(stage.index)}
                type="radio"
                value={String(stage.index)}
              />
              <strong>{stage.name}</strong>
              <span className="drilldown-stage-selector__range">
                <YunQiTimeDisplay value={stage.start} variant="compact" showStandard={false} />
                <span>→ <YunQiTimeDisplay value={stage.end} variant="compact" showStandard={false} /></span>
              </span>
              <span className="visually-hidden" id={`${groupName}-${stage.index}-range`}>
                开始 {stage.start.localTime.slice(5, 16).replace('T', ' ')}，结束 {stage.end.localTime.slice(5, 16).replace('T', ' ')}，北京时间 UTC+08；精确边界见计算说明与版本
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </InfoCard>
  );
}
