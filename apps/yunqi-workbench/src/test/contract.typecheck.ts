import type { YunQiClient } from '@yunqi/client';
import {
  YUNQI_API_CONTRACT_ID,
  type YunQiCalculationDto,
  type YunQiTimeDto,
} from '@yunqi/contracts';

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
