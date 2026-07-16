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
  YunQiCalendarTimeDtoSchema,
  YunQiYearDtoSchema,
} from './yunqi.js';

export const contractSchemas = [
  HealthDataSchema,
  YunQiCalendarTimeDtoSchema,
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
] as const;
