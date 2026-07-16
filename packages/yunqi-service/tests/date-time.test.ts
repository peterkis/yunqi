import { describe, expect, it } from 'vitest';
import { parseApiDateTime } from '../src/services/date-time.js';

describe('parseApiDateTime', () => {
  it('remains a compatibility alias for the CalendarTime normalizer', () => {
    expect(parseApiDateTime('2024-05-20T21:00:00')).toEqual({
      localDateTime: {
        year: 2024,
        month: 5,
        day: 20,
        hour: 21,
        minute: 0,
        second: 0,
        millisecond: 0,
      },
      calendarTimeStandard: 'BeijingStandardTime+08:00',
      instant: {
        epochMilliseconds: 1_716_210_000_000,
        offset: '+08:00',
      },
    });
  });

  it('preserves supported millisecond precision', () => {
    expect(
      parseApiDateTime('2024-05-20T21:00:00.123')
        .instant.epochMilliseconds,
    ).toBe(1_716_210_000_123);
  });

  it.each([
    '2024-05-20 21:00:00',
    '2024-05-20T21:00',
    '2024-02-30T21:00:00',
    '2024-05-20T21:00:00.1',
    '2024-05-20T21:00:00.1234',
    '2024-05-20T21:00:00+09:00',
    'not-a-date',
  ])('rejects malformed input %s', (value) => {
    expect(() => parseApiDateTime(value)).toThrow(RangeError);
  });

  it.each([
    '1991-04-14T02:30:00',
    '1991-09-15T01:30:00',
  ])('accepts former IANA gap/overlap input as fixed +08 time %s', (value) => {
    expect(() => parseApiDateTime(value)).not.toThrow();
  });

  it('brands parser failures as service-owned invalid arguments', () => {
    let thrown: unknown;
    try {
      parseApiDateTime('not-a-date');
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ name: 'InvalidArgumentError' });
  });
});
