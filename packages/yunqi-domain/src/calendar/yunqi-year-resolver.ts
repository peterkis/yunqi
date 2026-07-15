import type { DateTimeInput } from '../types.js';
import {
  formatBeijingDateTime,
  parseDateTimeInput,
  validateBeijingDateTime,
} from './beijing-time.js';
import type { CalendarProvider } from './calendar-provider.js';

export function resolveYunQiYear(input: DateTimeInput, provider: CalendarProvider): number {
  const epochMilliseconds = parseDateTimeInput(input);
  const beijingCivilYear = Number(formatBeijingDateTime(epochMilliseconds).slice(0, 4));
  const dahan = provider.getSolarTermTime(beijingCivilYear, '大寒');

  validateBeijingDateTime(dahan, '大寒节气边界');

  return epochMilliseconds < dahan.epochMilliseconds
    ? beijingCivilYear - 1
    : beijingCivilYear;
}
