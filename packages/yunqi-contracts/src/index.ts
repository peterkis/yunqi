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
  'YQ-API-CONTRACT-1.4.0' as const;

export type CalculateRequest = Schemas['CalculateRequest'];
export type ApiErrorResponse = Schemas['ErrorResponse'];
export type StemBranchDto = Schemas['StemBranchDto'];
export type SuiYunDto = Schemas['SuiYunDto'];
export type HostGuestRelationDto = Schemas['HostGuestRelationDto'];
export type MovementRelationDto = Schemas['MovementRelationDto'];
export type StageProgressDto = Schemas['StageProgressDto'];
export type SixQiBoundaryTerm = Schemas['SixQiBoundaryTerm'];
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

export type LearningRelationDto = Schemas['LearningRelationDto'];
export type ClassicalPassageDto = Schemas['ClassicalPassageDto'];
export type MovementStepDto = Schemas['MovementStepDto'];
export type YunQiLearningDto = Omit<Schemas['YunQiLearningDto'], 'facts'> & { readonly facts: YunQiCalculationDto };
export type BirthYearRequest = Schemas['BirthYearRequest'];
export type BirthDatePreviewRequest = Schemas['BirthDatePreviewRequest'];
export type BirthDatePreviewDto = Schemas['BirthDatePreviewDto'];
export type BirthYearComparisonDto = Omit<Schemas['BirthYearComparisonDto'], 'current'> & { readonly current: YunQiLearningDto };
export type BirthYearSuccessResponse = Omit<Schemas['BirthYearSuccessResponse'], 'data'> & { readonly data: BirthYearComparisonDto };
export type BirthDatePreviewSuccessResponse = Schemas['BirthDatePreviewSuccessResponse'];
export type BirthComparisonRequest = Schemas['BirthRequest'];
export type BirthComparisonDto = Omit<Schemas['BirthComparisonDto'], 'current' | 'candidates'> & {
  readonly current: YunQiLearningDto;
  readonly candidates: readonly (Omit<Schemas['BirthComparisonDto']['candidates'][number], 'learning'> & {
    readonly learning: YunQiLearningDto;
  })[];
};
export type ConstitutionQuestionnaireDto = Schemas['ConstitutionQuestionnaireDto'];
export type ConstitutionRequest = Schemas['ConstitutionRequest'];
export type ConstitutionAssessmentDto = Schemas['ConstitutionAssessmentDto'];
export type LearningSuccessResponse = Omit<Schemas['LearningSuccessResponse'], 'data'> & { readonly data: YunQiLearningDto };
export type BirthSuccessResponse = Omit<Schemas['BirthSuccessResponse'], 'data'> & { readonly data: BirthComparisonDto };
export type QuestionnaireSuccessResponse = Schemas['QuestionnaireSuccessResponse'];
export type AssessmentSuccessResponse = Schemas['AssessmentSuccessResponse'];
