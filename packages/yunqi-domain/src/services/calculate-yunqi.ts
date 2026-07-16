import type { CalendarProvider } from '../calendar/provider.js';
import {
  assertYunQiCalendarTimeStructure,
  assertYunQiInstant,
  compareBeijingLocalDateTime,
  createYunQiCalendarTimeFromInstant,
  type YunQiCalendarTime,
  type YunQiInstant,
} from '../calendar/time.js';
import { resolveYunQiYearByCalendarTime } from '../calendar/yunqi-year-resolver.js';
import type {
  SixQiStep,
  YunQiCalendarResult,
  YunQiResult,
} from '../types.js';
import { calculateYearYunQi } from './calculate-year-yunqi.js';

function containsCalendarTime(
  step: SixQiStep,
  input: YunQiCalendarTime,
): boolean {
  const start = createYunQiCalendarTimeFromInstant(step.start);
  const end = createYunQiCalendarTimeFromInstant(step.end);

  return (
    compareBeijingLocalDateTime(
      start.localDateTime,
      input.localDateTime,
    ) <= 0 &&
    compareBeijingLocalDateTime(
      input.localDateTime,
      end.localDateTime,
    ) < 0
  );
}

export function calculateYunQiByCalendarTime(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): YunQiCalendarResult {
  assertYunQiCalendarTimeStructure(input, '输入时间');

  const year = resolveYunQiYearByCalendarTime(input, provider);
  const annual = calculateYearYunQi(year, provider);
  const currentStep = annual.steps.find((step) =>
    containsCalendarTime(step, input),
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

export function calculateYunQi(
  input: YunQiInstant,
  provider: CalendarProvider,
): YunQiResult {
  assertYunQiInstant(input, '输入时间');

  const result = calculateYunQiByCalendarTime(
    createYunQiCalendarTimeFromInstant(input),
    provider,
  );

  return {
    ...result,
    input,
  };
}
