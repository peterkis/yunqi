import { formatBeijingDateTime, parseDateTimeInput } from '../calendar/beijing-time.js';
import type { CalendarProvider } from '../calendar/calendar-provider.js';
import { defaultCalendarProvider } from '../calendar/tyme-calendar-provider.js';
import { resolveYunQiYear } from '../calendar/yunqi-year-resolver.js';
import type { DateTimeInput, YunQiResult } from '../types.js';
import { calculateYearYunQi } from './calculate-year-yunqi.js';

export function calculateYunQi(
  input: DateTimeInput,
  provider: CalendarProvider = defaultCalendarProvider,
): YunQiResult {
  const epochMilliseconds = parseDateTimeInput(input);
  const year = resolveYunQiYear(new Date(epochMilliseconds), provider);
  const annual = calculateYearYunQi(year, provider);
  const currentStep = annual.steps.find(
    (step) =>
      Date.parse(step.start) <= epochMilliseconds && epochMilliseconds < Date.parse(step.end),
  );

  if (currentStep === undefined) {
    throw new RangeError('输入时间未匹配到当前运气年的六步区间');
  }

  return {
    ...annual,
    input: formatBeijingDateTime(epochMilliseconds),
    currentStep,
  };
}
