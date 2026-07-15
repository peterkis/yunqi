import type { CalendarProvider } from './provider.js';
import {
  assertYunQiInstant,
  getBeijingCivilYear,
  type YunQiInstant,
} from './time.js';

export function resolveYunQiYear(
  input: YunQiInstant,
  provider: CalendarProvider,
): number {
  assertYunQiInstant(input, '输入时间');

  const beijingCivilYear = getBeijingCivilYear(input);
  const dahan = provider.getSolarTermInstant(beijingCivilYear, '大寒');

  assertYunQiInstant(dahan, '大寒节气边界');

  return input.epochMilliseconds < dahan.epochMilliseconds
    ? beijingCivilYear - 1
    : beijingCivilYear;
}
