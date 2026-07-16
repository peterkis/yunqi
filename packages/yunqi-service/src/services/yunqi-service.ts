import {
  calculateYearYunQi,
  calculateYunQiByCalendarTime,
  type CalendarProvider,
  type YunQiCalendarTime,
} from '@yunqi/domain';
import {
  mapCalculationResult,
  mapYearResult,
} from '../mappers/yunqi-mapper.js';
import { normalizeEpochMilliseconds } from '../modules/time-normalizer/index.js';
import type {
  YunQiCalculationDto,
  YunQiYearDto,
} from '../schemas/yunqi.js';
import { InvalidArgumentError } from './invalid-argument-error.js';
import { protectCalendarProvider } from './provider-boundary.js';

export const MIN_SUPPORTED_YEAR = 1901;
export const MAX_SUPPORTED_YEAR = 2099;

export function assertSupportedYear(year: number): void {
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR
  ) {
    throw new InvalidArgumentError('年份必须是 1901 到 2099 的整数');
  }
}

function calculateWithProtectedProvider<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidArgumentError('请求参数无效', { cause: error });
    }
    throw error;
  }
}

function assertResolvableCivilYear(input: YunQiCalendarTime): void {
  const civilYear = input.localDateTime.year;

  if (
    civilYear < MIN_SUPPORTED_YEAR ||
    civilYear > MAX_SUPPORTED_YEAR + 1
  ) {
    throw new InvalidArgumentError(
      'dateTime 对应的运气年不在 1901 到 2099 支持范围内',
    );
  }
}

export function calculateAnnualDto(
  year: number,
  provider: CalendarProvider,
): YunQiYearDto {
  assertSupportedYear(year);
  const protectedProvider = protectCalendarProvider(provider);
  const result = calculateWithProtectedProvider(() =>
    calculateYearYunQi(year, protectedProvider),
  );
  return mapYearResult(result);
}

export function calculateAtDto(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): YunQiCalculationDto {
  assertResolvableCivilYear(input);
  const protectedProvider = protectCalendarProvider(provider);
  const result = calculateWithProtectedProvider(() =>
    calculateYunQiByCalendarTime(input, protectedProvider),
  );
  assertSupportedYear(result.year);
  return mapCalculationResult(result);
}

export function currentCalendarTime(
  now: () => number,
): YunQiCalendarTime {
  return normalizeEpochMilliseconds(now());
}
