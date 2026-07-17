import type { components } from './generated/openapi.js';

type Schemas = components['schemas'];

type GeneratedSixQiStepDto = Schemas['SixQiStepDto'];
type GeneratedSixQiDto = Schemas['SixQiDto'];
type GeneratedYunQiIntervalDto = Schemas['YunQiIntervalDto'];
type GeneratedYunQiYearDto = Schemas['YunQiYearDto'];
type GeneratedYunQiCalculationDto = Schemas['YunQiCalculationDto'];
type GeneratedYearSuccessResponse = Schemas['YearSuccessResponse'];
type GeneratedCalculationSuccessResponse =
  Schemas['CalculationSuccessResponse'];

export const YUNQI_API_CONTRACT_ID =
  'YQ-API-CONTRACT-1.0.0' as const;

export type CalculateRequest = Schemas['CalculateRequest'];
export type ApiErrorResponse = Schemas['ErrorResponse'];
export type StemBranchDto = Schemas['StemBranchDto'];
export type SuiYunDto = Schemas['SuiYunDto'];
export type HostGuestRelationDto = Schemas['HostGuestRelationDto'];
export type YunQiTimeDto = Schemas['YunQiTimeDto'];

export type YunQiCalculationInputTimeDto = YunQiTimeDto;
export type YunQiBoundaryTimeDto = YunQiTimeDto;

export type SixQiStepDto = Omit<
  GeneratedSixQiStepDto,
  'start' | 'end'
> & {
  readonly start: YunQiBoundaryTimeDto;
  readonly end: YunQiBoundaryTimeDto;
};

export type YunQiIntervalDto = Omit<
  GeneratedYunQiIntervalDto,
  'start' | 'end'
> & {
  readonly start: YunQiBoundaryTimeDto;
  readonly end: YunQiBoundaryTimeDto;
};

export type SixQiDto = Omit<GeneratedSixQiDto, 'steps'> & {
  readonly steps: readonly [
    SixQiStepDto,
    SixQiStepDto,
    SixQiStepDto,
    SixQiStepDto,
    SixQiStepDto,
    SixQiStepDto,
  ];
};

export type YunQiYearDto = Omit<
  GeneratedYunQiYearDto,
  'interval' | 'sixQi'
> & {
  readonly interval: YunQiIntervalDto;
  readonly sixQi: SixQiDto;
};

export type YunQiCalculationDto = Omit<
  GeneratedYunQiCalculationDto,
  'interval' | 'sixQi' | 'input' | 'currentStep'
> &
  YunQiYearDto & {
    readonly input: YunQiCalculationInputTimeDto;
    readonly currentStep: SixQiStepDto;
  };

export type YearSuccessResponse = Omit<
  GeneratedYearSuccessResponse,
  'data'
> & {
  readonly data: YunQiYearDto;
};

export type CalculationSuccessResponse = Omit<
  GeneratedCalculationSuccessResponse,
  'data'
> & {
  readonly data: YunQiCalculationDto;
};
