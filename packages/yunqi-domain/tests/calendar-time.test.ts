import { describe, expect, it } from 'vitest';

import {
  BEIJING_CALENDAR_TIME_STANDARD,
  BEIJING_STANDARD_OFFSET,
  assertYunQiCalendarTime,
  assertYunQiInstant,
  compareBeijingLocalDateTime,
  createYunQiCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  formatYunQiCalendarTime,
  type BeijingLocalDateTime,
  type YunQiCalendarTime,
} from '../src/calendar/time.js';

const DAHAN_2024_LOCAL = Object.freeze({
  year: 2024,
  month: 1,
  day: 20,
  hour: 22,
  minute: 7,
  second: 22,
  millisecond: 0,
} satisfies BeijingLocalDateTime);

describe('fixed Beijing calendar time', () => {
  it('derives the immutable instant from authoritative local fields', () => {
    const value = createYunQiCalendarTime(DAHAN_2024_LOCAL);

    expect(value).toEqual({
      localDateTime: DAHAN_2024_LOCAL,
      calendarTimeStandard: 'BeijingStandardTime+08:00',
      instant: {
        epochMilliseconds: 1_705_759_642_000,
        offset: '+08:00',
      },
    });
    expect(value.localDateTime).not.toBe(DAHAN_2024_LOCAL);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.localDateTime)).toBe(true);
    expect(Object.isFrozen(value.instant)).toBe(true);
  });

  it('projects an instant into canonical fixed Beijing local fields', () => {
    const instant = createYunQiInstant(1_705_759_642_000);
    const value = createYunQiCalendarTimeFromInstant(instant);

    expect(value.localDateTime).toEqual(DAHAN_2024_LOCAL);
    expect(value.instant).toBe(instant);
    expect(value.calendarTimeStandard).toBe(BEIJING_CALENDAR_TIME_STANDARD);
  });

  it('preserves milliseconds in both conversion directions', () => {
    const localDateTime = {
      ...DAHAN_2024_LOCAL,
      millisecond: 123,
    };
    const fromLocal = createYunQiCalendarTime(localDateTime);
    const fromInstant = createYunQiCalendarTimeFromInstant(fromLocal.instant);

    expect(fromLocal.instant.epochMilliseconds).toBe(1_705_759_642_123);
    expect(fromInstant.localDateTime).toEqual(localDateTime);
    expect(formatYunQiCalendarTime(fromInstant)).toBe(
      '2024-01-20T22:07:22.123+08:00',
    );
  });

  it('uses the approved literals and canonical whole-second formatting', () => {
    const value = createYunQiCalendarTime(DAHAN_2024_LOCAL);

    expect(BEIJING_STANDARD_OFFSET).toBe('+08:00');
    expect(BEIJING_CALENDAR_TIME_STANDARD).toBe(
      'BeijingStandardTime+08:00',
    );
    expect(value.instant.offset).toBe(BEIJING_STANDARD_OFFSET);
    expect(formatYunQiCalendarTime(value)).toBe(
      '2024-01-20T22:07:22+08:00',
    );
  });

  it('normalizes equivalent fixed Beijing and UTC representations to the approved epoch', () => {
    const local = createYunQiCalendarTime({
      year: 2026,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      second: 0,
      millisecond: 0,
    });
    const fromAbsolute = createYunQiCalendarTimeFromInstant(
      createYunQiInstant(1_767_240_000_000),
    );

    expect(local).toEqual(fromAbsolute);
    expect(local.instant.epochMilliseconds).toBe(1_767_240_000_000);
  });

  it('accepts Gregorian leap days', () => {
    const leapDay = createYunQiCalendarTime({
      year: 2024,
      month: 2,
      day: 29,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    });

    expect(leapDay.localDateTime.day).toBe(29);
    expect(
      createYunQiCalendarTimeFromInstant(leapDay.instant).localDateTime,
    ).toEqual(leapDay.localDateTime);
  });

  it.each([
    ['non-leap day', { ...DAHAN_2024_LOCAL, year: 2023, month: 2, day: 29 }],
    ['month zero', { ...DAHAN_2024_LOCAL, month: 0 }],
    ['month thirteen', { ...DAHAN_2024_LOCAL, month: 13 }],
    ['day zero', { ...DAHAN_2024_LOCAL, day: 0 }],
    ['invalid month day', { ...DAHAN_2024_LOCAL, month: 4, day: 31 }],
    ['hour twenty-four', { ...DAHAN_2024_LOCAL, hour: 24 }],
    ['minute sixty', { ...DAHAN_2024_LOCAL, minute: 60 }],
    ['second sixty', { ...DAHAN_2024_LOCAL, second: 60 }],
    ['millisecond one thousand', { ...DAHAN_2024_LOCAL, millisecond: 1_000 }],
    ['fractional field', { ...DAHAN_2024_LOCAL, second: 22.5 }],
    ['non-finite field', { ...DAHAN_2024_LOCAL, year: Number.NaN }],
  ] as const)('rejects invalid local fields: %s', (_name, localDateTime) => {
    expect(() => createYunQiCalendarTime(localDateTime)).toThrowError(
      RangeError,
    );
  });

  it('deeply validates forged aggregates and immutability', () => {
    const valid = createYunQiCalendarTime(DAHAN_2024_LOCAL);
    const mutable = {
      localDateTime: { ...valid.localDateTime },
      calendarTimeStandard: valid.calendarTimeStandard,
      instant: { ...valid.instant },
    };
    const inconsistent = Object.freeze({
      localDateTime: Object.freeze({
        ...valid.localDateTime,
        second: valid.localDateTime.second + 1,
      }),
      calendarTimeStandard: valid.calendarTimeStandard,
      instant: valid.instant,
    }) as YunQiCalendarTime;
    const wrongStandard = Object.freeze({
      ...valid,
      calendarTimeStandard: 'UTC+08',
    }) as unknown as YunQiCalendarTime;
    const wrongOffset = Object.freeze({
      ...valid,
      instant: Object.freeze({
        epochMilliseconds: valid.instant.epochMilliseconds,
        offset: 'Z',
      }),
    }) as unknown as YunQiCalendarTime;

    expect(() => assertYunQiCalendarTime(mutable)).toThrowError(RangeError);
    expect(() => assertYunQiCalendarTime(inconsistent)).toThrowError(RangeError);
    expect(() => assertYunQiCalendarTime(wrongStandard)).toThrowError(RangeError);
    expect(() => assertYunQiCalendarTime(wrongOffset)).toThrowError(RangeError);
    expect(() => assertYunQiCalendarTime(valid)).not.toThrow();
  });

  it('rejects inherited or accessor-backed semantic fields', () => {
    const valid = createYunQiCalendarTime(DAHAN_2024_LOCAL);
    const inheritedInstant = Object.freeze(
      Object.create({
        epochMilliseconds: valid.instant.epochMilliseconds,
        offset: valid.instant.offset,
      }),
    ) as YunQiCalendarTime['instant'];
    const inheritedAggregate = Object.freeze(
      Object.create(valid),
    ) as YunQiCalendarTime;
    let dynamicSecond = valid.localDateTime.second;
    const accessorLocalDateTime = Object.freeze({
      ...valid.localDateTime,
      get second() {
        return dynamicSecond;
      },
    });
    const accessorAggregate = Object.freeze({
      ...valid,
      localDateTime: accessorLocalDateTime,
    }) as YunQiCalendarTime;

    expect(() => assertYunQiInstant(inheritedInstant)).toThrowError(RangeError);
    expect(() =>
      createYunQiCalendarTimeFromInstant(inheritedInstant),
    ).toThrowError(RangeError);
    expect(() =>
      assertYunQiCalendarTime(inheritedAggregate),
    ).toThrowError(RangeError);
    expect(() =>
      assertYunQiCalendarTime(accessorAggregate),
    ).toThrowError(RangeError);

    dynamicSecond += 1;
    expect(accessorLocalDateTime.second).toBe(
      valid.localDateTime.second + 1,
    );
  });

  it('compares the canonical seven-field local tuple', () => {
    const earlier = { ...DAHAN_2024_LOCAL, millisecond: 999 };
    const later = {
      ...DAHAN_2024_LOCAL,
      second: DAHAN_2024_LOCAL.second + 1,
      millisecond: 0,
    };

    expect(compareBeijingLocalDateTime(earlier, later)).toBeLessThan(0);
    expect(compareBeijingLocalDateTime(later, earlier)).toBeGreaterThan(0);
    expect(compareBeijingLocalDateTime(earlier, { ...earlier })).toBe(0);
  });
});
