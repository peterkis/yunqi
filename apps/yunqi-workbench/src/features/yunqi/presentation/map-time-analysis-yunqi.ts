import type { YunQiCalculationDto } from '@yunqi/contracts';
import {
  mapSixQiStageTuple,
  mapYunQiTime,
  mapYunQiYearSummary,
} from './map-yunqi-shared';
import type { TimeAnalysisYunQiViewModel } from './view-model';

export function mapTimeAnalysisYunQi(
  dto: YunQiCalculationDto,
): TimeAnalysisYunQiViewModel {
  const stages = mapSixQiStageTuple(dto.sixQi.steps);
  const selectedStage = stages.find(
    (stage) => stage.index === dto.currentStep.index,
  );

  if (!selectedStage) {
    throw new Error(
      'Selected YunQi stage is missing from sixQi.steps',
    );
  }

  return {
    analysisTime: mapYunQiTime(dto.input),
    summary: mapYunQiYearSummary(dto),
    selectedStage,
    stages,
    explanations: dto.explanations,
    ruleVersion: dto.ruleVersion,
  };
}
