import type { YunQiYearDto } from '@yunqi/contracts';
import {
  mapSixQiStageTuple,
  mapYunQiYearSummary,
} from './map-yunqi-shared';
import type { AnnualYunQiViewModel } from './view-model';

export function mapAnnualYunQi(
  dto: YunQiYearDto,
): AnnualYunQiViewModel {
  return {
    summary: mapYunQiYearSummary(dto),
    stages: mapSixQiStageTuple(dto.sixQi.steps),
    explanations: dto.explanations,
    ruleVersion: dto.ruleVersion,
  };
}
