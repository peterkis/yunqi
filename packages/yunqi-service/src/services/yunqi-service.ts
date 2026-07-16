import {
  calculateYearYunQi,
  calculateYunQi,
  createYunQiInstant,
  type CalendarProvider,
  type YunQiInstant,
} from '@yunqi/domain';
import {
  mapCalculationResult,
  mapYearResult,
} from '../mappers/yunqi-mapper.js';
import type {
  YunQiCalculationDto,
  YunQiYearDto,
} from '../schemas/yunqi.js';
import { protectCalendarProvider } from './provider-boundary.js';

export const MIN_SUPPORTED_YEAR = 1901;
export const MAX_SUPPORTED_YEAR = 2099;

export function assertSupportedYear(year: number): void {
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR
  ) {
    throw new RangeError('年份必须是 1901 到 2099 的整数');
  }
}

export function calculateAnnualDto(
  year: number,
  provider: CalendarProvider,
): YunQiYearDto {
  assertSupportedYear(year);
  return mapYearResult(
    calculateYearYunQi(year, protectCalendarProvider(provider)),
  );
}

export function calculateAtDto(
  input: YunQiInstant,
  provider: CalendarProvider,
): YunQiCalculationDto {
  const result = calculateYunQi(input, protectCalendarProvider(provider));
  assertSupportedYear(result.year);
  return mapCalculationResult(result);
}

export function currentInstant(now: () => number): YunQiInstant {
  return createYunQiInstant(now());
}
