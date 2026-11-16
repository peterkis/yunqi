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
  SixQiStepDtoSchema,
  SixQiDtoSchema,
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
