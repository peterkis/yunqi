import type { StageProgress } from '../types.js';
import {
  assertYunQiInstant,
  beijingLocalDateToDayNumber,
  createYunQiCalendarTimeFromInstant,
  type YunQiInstant,
} from './time.js';

/** Duration ratios use epochs; calendar-day meaning comes from local fields. */
export function calculateStageProgress(
  start: YunQiInstant,
  end: YunQiInstant,
  input: YunQiInstant,
): StageProgress {
  assertYunQiInstant(start, '阶段起点');
  assertYunQiInstant(end, '阶段终点');
  assertYunQiInstant(input, '阶段输入');
  const startMs = start.epochMilliseconds;
  const endMs = end.epochMilliseconds;
  const inputMs = input.epochMilliseconds;
  if (endMs <= startMs || inputMs < startMs || inputMs >= endMs) {
    throw new RangeError('阶段须满足 start <= input < end 且 end > start');
  }

  const elapsedRatio = Math.min(0.999, Math.round((inputMs - startMs) / (endMs - startMs) * 1_000) / 1_000);
  const endDate = createYunQiCalendarTimeFromInstant(end).localDateTime;
  const inputDate = createYunQiCalendarTimeFromInstant(input).localDateTime;
  const remainingCalendarDays = Number(beijingLocalDateToDayNumber(endDate) - beijingLocalDateToDayNumber(inputDate));

  return Object.freeze({
    elapsedRatio,
    remainingCalendarDays,
    endsOnInputDate: remainingCalendarDays === 0,
  });
}
