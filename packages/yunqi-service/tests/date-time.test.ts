import { describe, expect, it } from 'vitest';
import { parseApiDateTime } from '../src/services/date-time.js';

describe('parseApiDateTime', () => {
  it.each([
    '2024-05-20T21:00:00',
    '2024-05-20T13:00:00Z',
    '2024-05-20T21:00:00+08:00',
  ])('normalizes %s to the same absolute instant', (value) => {
    expect(parseApiDateTime(value)).toEqual({
      epochMilliseconds: 1_716_210_000_000,
      timezone: 'Asia/Shanghai',
    });
  });

  it('preserves supported millisecond precision', () => {
    expect(parseApiDateTime('2024-05-20T21:00:00.123').epochMilliseconds)
      .toBe(1_716_210_000_123);
  });

  it.each([
    '2024-05-20 21:00:00',
    '2024-05-20T21:00',
    '2024-02-30T21:00:00',
    '2024-05-20T21:00:00.1234',
    'not-a-date',
  ])('rejects malformed input %s', (value) => {
    expect(() => parseApiDateTime(value)).toThrow(RangeError);
  });

  it.each([
    '1991-04-14T02:30:00',
    '1991-09-15T01:30:00',
  ])('rejects a nonexistent or ambiguous Shanghai wall time %s', (value) => {
    expect(() => parseApiDateTime(value)).toThrow(RangeError);
  });
});
