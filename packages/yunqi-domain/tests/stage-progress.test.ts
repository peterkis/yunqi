import { describe, expect, it } from 'vitest';

import { calculateStageProgress, createYunQiCalendarTime, createYunQiInstant } from '../src/index.js';

describe('pure stage progress', () => {
  it.each([
    [0, 3_000, 0, 0],
    [0, 3_000, 1_000, 0.333],
    [0, 3_000, 2_000, 0.667],
    [0, 2_000, 1_999, 0.999],
    [0, 1, 0, 0],
  ])('rounds duration [%i, %i) at %i to %f without reaching one', (start, end, input, ratio) => {
    const result = calculateStageProgress(createYunQiInstant(start), createYunQiInstant(end), createYunQiInstant(input));
    expect(result).toEqual({ elapsedRatio: ratio, remainingCalendarDays: 0, endsOnInputDate: true });
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.elapsedRatio).toBeGreaterThanOrEqual(0);
    expect(result.elapsedRatio).toBeLessThan(1);
  });

  it.each([
    [1_000, 1_000, 1_000],
    [2_000, 1_000, 1_500],
    [1_000, 2_000, 999],
    [1_000, 2_000, 2_000],
    [1_000, 2_000, 2_001],
  ])('rejects invalid interval [%i, %i) or outside input %i', (start, end, input) => {
    expect(() => calculateStageProgress(createYunQiInstant(start), createYunQiInstant(end), createYunQiInstant(input)))
      .toThrowError(RangeError);
  });

  it.each([
    [1900, 1, 0.333],
    [2000, 2, 0.2],
    [2024, 2, 0.2],
    [2100, 1, 0.333],
  ])('uses Gregorian dates across February %i', (year, days, ratio) => {
    const start = createYunQiCalendarTime({ year, month: 2, day: 28, hour: 0, minute: 0, second: 0, millisecond: 0 });
    const input = createYunQiCalendarTime({ ...start.localDateTime, hour: 12 });
    const end = createYunQiCalendarTime({ year, month: 3, day: 1, hour: 12, minute: 0, second: 0, millisecond: 0 });
    expect(calculateStageProgress(start.instant, end.instant, input.instant)).toEqual({
      elapsedRatio: ratio, remainingCalendarDays: days, endsOnInputDate: false,
    });
  });

  it('counts a Beijing midnight crossing as one calendar day even when only one millisecond remains', () => {
    const start = createYunQiCalendarTime({ year: 2026, month: 11, day: 21, hour: 0, minute: 0, second: 0, millisecond: 0 });
    const input = createYunQiCalendarTime({ ...start.localDateTime, hour: 23, minute: 59, second: 59, millisecond: 999 });
    const end = createYunQiCalendarTime({ ...start.localDateTime, day: 22 });
    expect(calculateStageProgress(start.instant, end.instant, input.instant)).toEqual({
      elapsedRatio: 0.999, remainingCalendarDays: 1, endsOnInputDate: false,
    });
  });

  it('reports zero days before the boundary clock time on the same local date', () => {
    const start = createYunQiCalendarTime({ year: 2026, month: 11, day: 21, hour: 12, minute: 0, second: 0, millisecond: 0 });
    const input = createYunQiCalendarTime({ ...start.localDateTime, day: 22, hour: 0 });
    const end = createYunQiCalendarTime({ ...input.localDateTime, hour: 12 });
    expect(calculateStageProgress(start.instant, end.instant, input.instant)).toEqual({
      elapsedRatio: 0.5, remainingCalendarDays: 0, endsOnInputDate: true,
    });
  });

  it('subtracts calendar dates across a year boundary', () => {
    const start = createYunQiCalendarTime({ year: 2026, month: 12, day: 31, hour: 0, minute: 0, second: 0, millisecond: 0 });
    const input = createYunQiCalendarTime({ ...start.localDateTime, hour: 12 });
    const end = createYunQiCalendarTime({ year: 2027, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 });
    expect(calculateStageProgress(start.instant, end.instant, input.instant)).toEqual({
      elapsedRatio: 0.5, remainingCalendarDays: 1, endsOnInputDate: false,
    });
  });
});
