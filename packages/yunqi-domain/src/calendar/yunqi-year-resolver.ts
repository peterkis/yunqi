import type { CalendarProvider } from './provider.js';
import {
  assertYunQiCalendarTimeStructure,
  assertYunQiInstant,
  compareBeijingLocalDateTime,
  createYunQiCalendarTimeFromInstant,
  type YunQiCalendarTime,
  type YunQiInstant,
} from './time.js';

export function resolveYunQiYearByCalendarTime(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): number {
  assertYunQiCalendarTimeStructure(input, '输入时间');

  const candidateYear = input.localDateTime.year;
  const dahanInstant = provider.getSolarTermInstant(candidateYear, '大寒');

  assertYunQiInstant(dahanInstant, '大寒节气边界');
  const dahan = createYunQiCalendarTimeFromInstant(dahanInstant);

  return compareBeijingLocalDateTime(
    input.localDateTime,
    dahan.localDateTime,
  ) < 0
    ? candidateYear - 1
    : candidateYear;
}

export function resolveYunQiYear(
  input: YunQiInstant,
  provider: CalendarProvider,
): number {
  assertYunQiInstant(input, '输入时间');

  return resolveYunQiYearByCalendarTime(
    createYunQiCalendarTimeFromInstant(input),
    provider,
  );
}
