import { useId } from 'react';
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
    <fieldset className="annual-six-qi-selector">
      <legend>选择六气阶段</legend>
      <p className="stage-selector-hint">选择后在下方查看详情 · 北京时间 UTC+08</p>
      <div className="annual-six-qi-selector__options">
        {stages.map((stage) => (
          <label
            className="annual-six-qi-selector__option"
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
            <span className="annual-six-qi-selector__range">
              <YunQiTimeDisplay value={stage.start} showStandard={false} variant="compact" />
              <span aria-hidden="true">—</span>
              <YunQiTimeDisplay value={stage.end} showStandard={false} variant="compact" />
            </span>
            <span className="visually-hidden" id={`${groupName}-${stage.index}-range`}>
              开始 {stage.start.localTime}，结束 {stage.end.localTime}，北京时间 UTC+08
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
