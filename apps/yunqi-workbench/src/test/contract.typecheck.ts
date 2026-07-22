import type { YunQiClient } from '@yunqi/client';
import {
  YUNQI_API_CONTRACT_ID,
  type YunQiCalculationDto,
  type YunQiTimeDto,
} from '@yunqi/contracts';
import type {
  AnnualYunQiViewModel,
  SixQiStageTuple,
} from '../features/yunqi/presentation/view-model';

const contractId: 'YQ-API-CONTRACT-1.0.0' =
  YUNQI_API_CONTRACT_ID;
const time: YunQiTimeDto = {
  localTime: '2026-01-01T12:00:00+08:00',
  epochMilliseconds: 1_767_240_000_000,
  offset: '+08:00',
  calendarTimeStandard: 'BeijingStandardTime+08:00',
};

declare const calculation: YunQiCalculationDto;
declare const client: YunQiClient;

const calculationResult: Promise<YunQiCalculationDto> =
  client.getCurrent();
const calculationTime: YunQiTimeDto = calculation.input;

void {
  contractId,
  time,
  calculationResult,
  calculationTime,
};

// @ts-expect-error The retired timezone field is not in public time DTOs.
void time.timezone;
// @ts-expect-error No alternate calendarTime field exists in the public calculation DTO.
void calculation.calendarTime;

declare const annual: AnnualYunQiViewModel;
declare const stages: SixQiStageTuple;
void stages[5].index;
// @ts-expect-error Annual analysis has no seventh stage.
void stages[6];
// @ts-expect-error Annual analysis has no current-step field.
void annual.currentStep;
// @ts-expect-error Neutral annual stages have no status.
void annual.stages[0].status;
