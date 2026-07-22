import type { YunQiCalculationDto } from '@yunqi/contracts';
import {
  labeledCode,
  mapSixQiStageTuple,
  mapYunQiTime,
  mapYunQiYearSummary,
} from './map-yunqi-shared';
import type {
  CurrentSixQiStageTuple,
  CurrentSixQiStageViewModel,
  CurrentYunQiViewModel,
  SixQiStageViewModel,
  YunQiStageStatusCode,
} from './view-model';

const STAGE_STATUS_LABELS = {
  completed: '已结束',
  current: '当前',
  upcoming: '未开始',
} as const satisfies Record<YunQiStageStatusCode, string>;

function enhanceCurrentStage(
  stage: SixQiStageViewModel,
  currentStepIndex: number,
): CurrentSixQiStageViewModel {
  const status: YunQiStageStatusCode =
    stage.index < currentStepIndex
      ? 'completed'
      : stage.index === currentStepIndex
        ? 'current'
        : 'upcoming';

  return {
    ...stage,
    status: labeledCode(status, STAGE_STATUS_LABELS),
  };
}

function mapCurrentSixQiStageTuple(
  dto: YunQiCalculationDto,
): CurrentSixQiStageTuple {
  const [first, second, third, fourth, fifth, sixth] =
    mapSixQiStageTuple(dto.sixQi.steps);
  const currentStepIndex = dto.currentStep.index;

  return [
    enhanceCurrentStage(first, currentStepIndex),
    enhanceCurrentStage(second, currentStepIndex),
    enhanceCurrentStage(third, currentStepIndex),
    enhanceCurrentStage(fourth, currentStepIndex),
    enhanceCurrentStage(fifth, currentStepIndex),
    enhanceCurrentStage(sixth, currentStepIndex),
  ];
}

export function mapCurrentYunQi(
  dto: YunQiCalculationDto,
): CurrentYunQiViewModel {
  const timeline = mapCurrentSixQiStageTuple(dto);
  const currentStep = timeline.find(
    (step) => step.status.code === 'current',
  );

  if (!currentStep) {
    throw new Error(
      'Current YunQi step is missing from sixQi.steps',
    );
  }

  return {
    inputTime: mapYunQiTime(dto.input),
    summary: mapYunQiYearSummary(dto),
    currentStep,
    timeline,
    explanations: dto.explanations,
    ruleVersion: dto.ruleVersion,
  };
}
