import { describe, expect, it } from 'vitest';
import { parseDateTimeInput, formatBeijingDateTime } from '../src/calendar/beijing-time.js';
import {
  defaultCalendarProvider,
  tymeCalendarProvider,
} from '../src/calendar/tyme-calendar-provider.js';
import * as publicApi from '../src/index.js';

describe('Beijing time', () => {
  it('requires an absolute instant and formats it in UTC+08:00', () => {
    expect(() => parseDateTimeInput('2024-01-20T22:07:08')).toThrow(/时区/);
    const instant = parseDateTimeInput('2024-01-20T14:07:08Z');
    expect(formatBeijingDateTime(instant)).toBe('2024-01-20T22:07:08+08:00');
  });

  it('rejects an invalid Date value', () => {
    expect(() => parseDateTimeInput(new Date(Number.NaN))).toThrow(/无效/);
  });

  it.each([
    '2024-02-30T00:00:00+08:00',
    '2023-02-29T00:00:00+08:00',
    '2024-04-31T00:00:00+08:00',
    '2024-01-01T24:00:00+08:00',
  ])('rejects overflowing calendar fields in %s', (input) => {
    expect(() => parseDateTimeInput(input)).toThrowError(RangeError);
    expect(() => parseDateTimeInput(input)).toThrow(/格式或日历字段无效/);
  });

  it('rejects non-contract syntax even when a timezone is present', () => {
    expect(() => parseDateTimeInput('2024-02-29 00:00:00+08:00')).toThrowError(
      RangeError,
    );
    expect(() => parseDateTimeInput('2024-02-29 00:00:00+08:00')).toThrow(
      /格式或日历字段无效/,
    );
  });

  it('accepts a valid leap day and one-to-three fractional second digits', () => {
    expect(parseDateTimeInput('2024-02-29T00:00:00+08:00')).toBe(
      Date.UTC(2024, 1, 28, 16, 0, 0),
    );
    expect(parseDateTimeInput('2024-03-20T03:06:25.987Z')).toBe(
      Date.UTC(2024, 2, 20, 3, 6, 25, 987),
    );
    expect(parseDateTimeInput('2024-03-20T03:06:25.9Z')).toBe(
      Date.UTC(2024, 2, 20, 3, 6, 25, 900),
    );
    expect(parseDateTimeInput('2024-03-20T03:06:25.01Z')).toBe(
      Date.UTC(2024, 2, 20, 3, 6, 25, 10),
    );
  });

  it.each([
    ['2024-03-20T08:36:25.01+05:30', Date.UTC(2024, 2, 20, 3, 6, 25, 10)],
    ['2024-03-19T22:36:25.01-04:30', Date.UTC(2024, 2, 20, 3, 6, 25, 10)],
  ] as const)(
    'converts signed non-hour offset input %s to the exact instant',
    (input, expected) => {
      expect(parseDateTimeInput(input)).toBe(expected);
    },
  );

  it('gets the 2024 Dahan instant from tyme4ts at second precision', () => {
    const dahan = tymeCalendarProvider.getSolarTermTime(2024, '大寒');
    expect(dahan.iso).toBe('2024-01-20T22:07:22+08:00');
  });

  it('returns matching ISO and epoch representations for a solar term', () => {
    const dahan = tymeCalendarProvider.getSolarTermTime(2024, '大寒');

    expect(dahan.epochMilliseconds).toBe(Date.parse(dahan.iso));
    expect(formatBeijingDateTime(dahan.epochMilliseconds)).toBe(dahan.iso);
  });

  it('freezes the tyme calendar provider', () => {
    expect(Object.isFrozen(tymeCalendarProvider)).toBe(true);
  });

  it('uses the tyme calendar provider as the default', () => {
    expect(defaultCalendarProvider).toBe(tymeCalendarProvider);
  });

  it('exports the calendar contracts from the package entrypoint', () => {
    expect(publicApi.parseDateTimeInput).toBe(parseDateTimeInput);
    expect(publicApi.formatBeijingDateTime).toBe(formatBeijingDateTime);
    expect(publicApi.tymeCalendarProvider).toBe(tymeCalendarProvider);
    expect(publicApi.defaultCalendarProvider).toBe(defaultCalendarProvider);
  });
});
