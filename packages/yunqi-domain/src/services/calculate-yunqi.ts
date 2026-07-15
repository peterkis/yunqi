import type { CalendarProvider } from '../calendar/provider.js';
import { assertYunQiInstant, type YunQiInstant } from '../calendar/time.js';
import { resolveYunQiYear } from '../calendar/yunqi-year-resolver.js';
import type { YunQiResult } from '../types.js';
import { calculateYearYunQi } from './calculate-year-yunqi.js';

export function calculateYunQi(
  input: YunQiInstant,
  provider: CalendarProvider,
): YunQiResult {
  assertYunQiInstant(input, '输入时间');

  const year = resolveYunQiYear(input, provider);
  const annual = calculateYearYunQi(year, provider);
  const currentStep = annual.steps.find(
    (step) =>
      step.start.epochMilliseconds <= input.epochMilliseconds &&
      input.epochMilliseconds < step.end.epochMilliseconds,
  );

  if (currentStep === undefined) {
    throw new RangeError('输入时间未匹配到当前运气年的六步区间');
  }

  return {
    ...annual,
    input,
    currentStep,
  };
}
