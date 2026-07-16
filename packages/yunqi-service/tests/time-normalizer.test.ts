import type { YunQiCalendarTime } from '@yunqi/domain';
import { describe, expect, it } from 'vitest';
import {
  formatYunQiCalendarTime,
  normalizeApiDateTime,
  normalizeEpochMilliseconds,
  normalizeYunQiInstant,
} from '../src/modules/time-normalizer/index.js';

const EXPECTED_2026_NOON: YunQiCalendarTime = {
  localDateTime: {
    year: 2026,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    second: 0,
    millisecond: 0,
  },
  calendarTimeStandard: 'BeijingStandardTime+08:00',
  instant: {
    epochMilliseconds: 1_767_240_000_000,
    offset: '+08:00',
  },
};

describe('Business Time Normalizer', () => {
  it.each([
    '2026-01-01T12:00:00',
    '2026-01-01T12:00:00+08:00',
    '2026-01-01T04:00:00Z',
  ])('normalizes equivalent input %s to one fixed Beijing CalendarTime', (input) => {
    expect(normalizeApiDateTime(input)).toEqual(EXPECTED_2026_NOON);
  });

  it('projects UTC across a calendar-year boundary without server time-zone input', () => {
    expect(normalizeApiDateTime('2025-12-31T16:00:00.123Z')).toEqual({
      localDateTime: {
        year: 2026,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 123,
      },
      calendarTimeStandard: 'BeijingStandardTime+08:00',
      instant: {
        epochMilliseconds: 1_767_196_800_123,
        offset: '+08:00',
      },
    });
  });

  it('normalizes an approved Domain instant through the stable module boundary', () => {
    expect(normalizeYunQiInstant({
      epochMilliseconds: 1_705_759_642_000,
      offset: '+08:00',
    }).localDateTime).toEqual({
      year: 2024,
      month: 1,
      day: 20,
      hour: 22,
      minute: 7,
      second: 22,
      millisecond: 0,
    });
  });

  it('normalizes an epoch-only runtime clock through the stable module boundary', () => {
    expect(
      formatYunQiCalendarTime(
        normalizeEpochMilliseconds(1_705_759_642_000),
      ).localTime,
    ).toBe('2024-01-20T22:07:22+08:00');
  });

  it.each([
    '2024-02-29T00:00:00',
    '1991-04-14T02:30:00',
    '1991-09-15T01:30:00',
  ])('accepts valid Gregorian fixed-offset local input %s', (input) => {
    expect(() => normalizeApiDateTime(input)).not.toThrow();
  });

  it.each([
    '2026-01-01T12:00:00.1',
    '2026-01-01T12:00:00.12',
    '2026-01-01T12:00:00.1234',
    '2026-01-01T12:00:00+09:00',
    '2026-01-01T04:00:00-00:00',
    '2026-01-01T12:00:00+0800',
    '2026-01-01 12:00:00',
    '2026/01/01 12:00:00',
    '2026-01-01T04:00:00z',
    '2026-02-29T12:00:00',
    '2026-04-31T12:00:00',
    '2026-01-01T24:00:00',
  ])('rejects unsupported or invalid input %s', (input) => {
    expect(() => normalizeApiDateTime(input)).toThrowError(
      expect.objectContaining({ name: 'InvalidArgumentError' }),
    );
  });

  it('formats zero milliseconds without a fractional component', () => {
    expect(formatYunQiCalendarTime(normalizeApiDateTime(
      '2026-01-01T12:00:00.000+08:00',
    ))).toEqual({
      localTime: '2026-01-01T12:00:00+08:00',
      epochMilliseconds: 1_767_240_000_000,
      offset: '+08:00',
      calendarTimeStandard: 'BeijingStandardTime+08:00',
    });
  });

  it('formats non-zero milliseconds as exactly three digits', () => {
    expect(formatYunQiCalendarTime(normalizeApiDateTime(
      '2026-01-01T12:00:00.007',
    )).localTime).toBe('2026-01-01T12:00:00.007+08:00');
  });

  it('returns immutable aggregate and nested Domain values', () => {
    const value = normalizeApiDateTime('2026-01-01T12:00:00');

    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.localDateTime)).toBe(true);
    expect(Object.isFrozen(value.instant)).toBe(true);
  });
});
