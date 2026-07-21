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
      <div className="annual-six-qi-selector__options">
        {stages.map((stage) => (
          <label
            className="annual-six-qi-selector__option"
            key={stage.index}
          >
            <input
              checked={stage.index === selectedStepIndex}
              name={groupName}
              onChange={() => onSelect(stage.index)}
              type="radio"
              value={String(stage.index)}
            />
            <span className="annual-six-qi-selector__index">
              第 {stage.index} 步
            </span>
            <strong>{stage.name}</strong>
            <span className="annual-six-qi-selector__range">
              <YunQiTimeDisplay value={stage.start} />
              <span aria-hidden="true">—</span>
              <YunQiTimeDisplay value={stage.end} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
