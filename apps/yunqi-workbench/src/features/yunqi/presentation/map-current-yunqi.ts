import type { YunQiCalculationDto } from '@yunqi/contracts';
import { YUNQI_API_CONTRACT_ID } from '@yunqi/contracts';
import { mapMovementElement, mapQiElement } from './visual-mappings';
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

const STAGE_TICKS = {
  初之气: '初', 二之气: '二', 三之气: '三', 四之气: '四', 五之气: '五', 终之气: '终',
} as const satisfies Record<SixQiStageViewModel['name'], string>;

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
    hostElement: mapQiElement(stage.hostQi),
    guestElement: mapQiElement(stage.guestQi),
    tickLabel: STAGE_TICKS[stage.name],
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
    inputDate: dto.input.localTime.slice(0, 10),
    progressLabel: `六步气进度：${timeline.map((step) => `第${step.index}步${step.name}，${step.status.label}`).join('；')}`,
    annualElements: {
      suiYun: mapMovementElement(dto.suiYun.element),
      sitian: mapQiElement(dto.sixQi.sitian),
      zaiquan: mapQiElement(dto.sixQi.zaiquan),
    },
    summary: mapYunQiYearSummary(dto),
    currentStep,
    timeline,
    explanations: dto.explanations,
    ruleVersion: dto.ruleVersion,
    contractId: YUNQI_API_CONTRACT_ID,
  };
}
