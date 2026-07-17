import {
  YUNQI_API_CONTRACT_ID,
  type ApiErrorResponse,
  type CalculateRequest,
  type CalculationSuccessResponse,
  type HostGuestRelationDto,
  type SixQiDto,
  type SixQiStepDto,
  type StemBranchDto,
  type SuiYunDto,
  type YunQiBoundaryTimeDto,
  type YunQiCalculationDto,
  type YunQiCalculationInputTimeDto,
  type YunQiIntervalDto,
  type YunQiTimeDto,
  type YunQiYearDto,
  type YearSuccessResponse,
} from '../src/index.js';

const contractId: 'YQ-API-CONTRACT-1.0.0' = YUNQI_API_CONTRACT_ID;
const time: YunQiTimeDto = {
  localTime: '2026-01-01T12:00:00+08:00',
  epochMilliseconds: 1_767_240_000_000,
  offset: '+08:00',
  calendarTimeStandard: 'BeijingStandardTime+08:00',
};
const inputTime: YunQiCalculationInputTimeDto = time;
const boundaryTime: YunQiBoundaryTimeDto = time;
const request: CalculateRequest = {
  dateTime: '2026-01-01T12:00:00',
};

declare const relation: HostGuestRelationDto;
declare const step: SixQiStepDto;
declare const sixQi: SixQiDto;
declare const stemBranch: StemBranchDto;
declare const suiYun: SuiYunDto;
declare const interval: YunQiIntervalDto;
declare const year: YunQiYearDto;
declare const calculation: YunQiCalculationDto;
declare const yearResponse: YearSuccessResponse;
declare const calculationResponse: CalculationSuccessResponse;
declare const errorResponse: ApiErrorResponse;

const sixSteps: readonly [
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
] = sixQi.steps;
const calculationInput: YunQiCalculationInputTimeDto = calculation.input;
const stepStart: YunQiBoundaryTimeDto = step.start;
const stepEnd: YunQiBoundaryTimeDto = step.end;
const calculationYear: YunQiYearDto = calculation;

void {
  contractId,
  time,
  inputTime,
  boundaryTime,
  request,
  relation,
  stemBranch,
  suiYun,
  interval,
  year,
  sixSteps,
  calculationInput,
  stepStart,
  stepEnd,
  calculationYear,
  yearResponse,
  calculationResponse,
  errorResponse,
};

// @ts-expect-error The public API does not expose Domain time model names.
type ForbiddenDomainTime = import('../src/index.js').YunQiCalendarTime;
// @ts-expect-error The retired public DTO name is not exported.
type ForbiddenCalendarTimeDto = import('../src/index.js').YunQiCalendarTimeDto;
// @ts-expect-error Generated OpenAPI components remain internal.
type ForbiddenComponents = import('../src/index.js').components;
// @ts-expect-error Generated OpenAPI paths remain internal.
type ForbiddenPaths = import('../src/index.js').paths;
// @ts-expect-error No alternate calendarTime wire field exists.
void calculation.calendarTime;
// @ts-expect-error The retired timezone field is not part of YunQiTimeDto.
void calculation.input.timezone;
// @ts-expect-error The canonical calculation input is required.
const missingInput: YunQiCalculationDto =
  {} as Omit<YunQiCalculationDto, 'input'>;
const extraTime: YunQiCalculationInputTimeDto = {
  ...time,
  // @ts-expect-error Public time DTOs reject additional wire fields.
  timezone: 'Asia/Shanghai',
};
// @ts-expect-error Public DTO fields are readonly.
calculation.input.localTime = '2026-01-01T13:00:00+08:00';
// @ts-expect-error SixQi steps are a readonly fixed-length tuple.
sixQi.steps.push(step);

declare const fiveSteps: readonly [
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
];
declare const sevenSteps: readonly [
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
  SixQiStepDto,
];
// @ts-expect-error SixQi requires exactly six steps.
const invalidFiveSteps: SixQiDto['steps'] = fiveSteps;
// @ts-expect-error SixQi requires exactly six steps.
const invalidSevenSteps: SixQiDto['steps'] = sevenSteps;

void {
  missingInput,
  extraTime,
  invalidFiveSteps,
  invalidSevenSteps,
};
