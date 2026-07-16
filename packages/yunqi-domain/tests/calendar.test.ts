import { describe, expect, it } from 'vitest';

import {
  assertYunQiInstant,
  createYunQiInstant,
  formatYunQiInstant,
  getBeijingCivilYear,
} from '../src/calendar/time.js';
import * as publicApi from '../src/index.js';
import {
  fixed2024BoundaryInstants,
  fixedCalendarProvider,
} from './helpers/fixed-calendar-provider.js';

describe('YunQi instant value', () => {
  it('creates the exact immutable fixed-offset value', () => {
    const instant = createYunQiInstant(1_705_759_642_000);

    expect(instant).toEqual({
      epochMilliseconds: 1_705_759_642_000,
      offset: '+08:00',
    });
    expect(Object.isFrozen(instant)).toBe(true);
    expect(fixedCalendarProvider.getSolarTermInstant(2024, '大寒')).toEqual(instant);
  });

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1_705_759_642_000.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects the invalid or non-integer epoch %s', (epochMilliseconds) => {
    expect(() => createYunQiInstant(epochMilliseconds)).toThrowError(RangeError);
  });

  it('rejects structurally invalid values and incorrect provider offsets', () => {
    expect(() =>
      assertYunQiInstant({
        epochMilliseconds: 1_705_759_642_000,
        offset: 'Z',
      }),
    ).toThrowError(RangeError);
    expect(() =>
      assertYunQiInstant({
        epochMilliseconds: 1_705_759_642_000.5,
        offset: '+08:00',
      }),
    ).toThrowError(RangeError);
  });
});

describe('pure Beijing civil conversion', () => {
  it.each([
    [0, '1970-01-01T08:00:00+08:00', 1970],
    [951_782_400_000, '2000-02-29T08:00:00+08:00', 2000],
    [1_705_759_642_000, '2024-01-20T22:07:22+08:00', 2024],
    [1_704_038_400_000, '2024-01-01T00:00:00+08:00', 2024],
    [-28_800_001, '1969-12-31T23:59:59+08:00', 1969],
  ] as const)(
    'formats epoch %i with integer Gregorian arithmetic',
    (epochMilliseconds, expected, expectedYear) => {
      const instant = createYunQiInstant(epochMilliseconds);

      expect(formatYunQiInstant(instant)).toBe(expected);
      expect(getBeijingCivilYear(instant)).toBe(expectedYear);
    },
  );

  it('keeps explanation formatting at whole-second precision', () => {
    expect(formatYunQiInstant(createYunQiInstant(1_710_903_985_987))).toBe(
      '2024-03-20T11:06:25+08:00',
    );
  });

  it('exports only the pure calendar contracts from the package entrypoint', () => {
    expect(publicApi.createYunQiInstant).toBe(createYunQiInstant);
    expect(publicApi.assertYunQiInstant).toBe(assertYunQiInstant);
    expect(publicApi.formatYunQiInstant).toBe(formatYunQiInstant);
    expect(publicApi.getBeijingCivilYear).toBe(getBeijingCivilYear);
    expect('tymeCalendarProvider' in publicApi).toBe(false);
    expect('defaultCalendarProvider' in publicApi).toBe(false);
    expect(fixed2024BoundaryInstants.every(Object.isFrozen)).toBe(true);
  });
});
