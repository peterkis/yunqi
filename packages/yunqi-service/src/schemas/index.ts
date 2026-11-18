import {
  ErrorResponseSchema,
  HealthDataSchema,
  HealthSuccessSchema,
} from './common.js';
import {
  CalculateRequestSchema,
  CalculationSuccessSchema,
  HostGuestRelationDtoSchema,
  IntervalDtoSchema,
  SixQiBoundaryTermSchema,
  SixQiStepDtoSchema,
  SixQiDtoSchema,
  StageProgressDtoSchema,
  StemBranchDtoSchema,
  SuiYunDtoSchema,
  YearParamsSchema,
  YearSuccessSchema,
  YunQiCalculationDtoSchema,
  YunQiTimeDtoSchema,
  YunQiYearDtoSchema,
} from './yunqi.js';
import { learningSchemas } from './learning.js';
import { constitutionSchemas } from './constitution.js';

export const contractSchemas = [
  HealthDataSchema,
  YunQiTimeDtoSchema,
  SixQiBoundaryTermSchema,
  StageProgressDtoSchema,
  HostGuestRelationDtoSchema,
  SixQiStepDtoSchema,
  StemBranchDtoSchema,
  SuiYunDtoSchema,
  IntervalDtoSchema,
  SixQiDtoSchema,
  YunQiYearDtoSchema,
  YunQiCalculationDtoSchema,
  CalculateRequestSchema,
  YearParamsSchema,
  HealthSuccessSchema,
  YearSuccessSchema,
  CalculationSuccessSchema,
  ErrorResponseSchema,
  ...learningSchemas,
  ...constitutionSchemas,
] as const;
