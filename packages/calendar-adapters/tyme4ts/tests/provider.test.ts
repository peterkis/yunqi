import type { CalendarProvider } from '@yunqi/domain';
import { SolarTerm as TymeSolarTerm } from 'tyme4ts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Tyme4tsCalendarProvider,
  toYunQiInstant,
  tyme4tsCalendarProvider,
} from '../src/index.js';
import type { DateTimeInput } from '../src/index.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toYunQiInstant', () => {
  it('converts an explicitly zoned string to a fixed Beijing instant', () => {
    expect(toYunQiInstant('2024-01-20T14:07:22Z')).toEqual({
      epochMilliseconds: 1_705_759_642_000,
      offset: '+08:00',
    });
  });

  it('uses the absolute millisecond value from a valid Date', () => {
    const input: DateTimeInput = new Date(1_705_759_642_000);

    expect(toYunQiInstant(input)).toEqual({
      epochMilliseconds: 1_705_759_642_000,
      offset: '+08:00',
    });
  });

  it('requires string inputs to include Z or a signed HH:mm offset', () => {
    expect(() => toYunQiInstant('2024-01-20T22:07:22')).toThrowError(RangeError);
    expect(() => toYunQiInstant('2024-01-20T22:07:22')).toThrow(/时区/);
  });

  it.each([
    '2024-02-30T00:00:00+08:00',
    '2023-02-29T00:00:00+08:00',
    '2024-04-31T00:00:00+08:00',
    '2024-01-01T24:00:00+08:00',
  ])('rejects impossible calendar fields in %s', (input) => {
    expect(() => toYunQiInstant(input)).toThrowError(RangeError);
    expect(() => toYunQiInstant(input)).toThrow(/格式或日历字段无效/);
  });

  it.each([
    '2024-01-20T22:07:22+24:00',
    '2024-01-20T22:07:22+08:60',
    '2024-01-20T22:07:22+0800',
    '2024-01-20T22:07:22+8:00',
    '2024-01-20 22:07:22+08:00',
    '2024-01-20T22:07:22.1234+08:00',
  ])('rejects malformed offset or non-contract syntax in %s', (input) => {
    expect(() => toYunQiInstant(input)).toThrowError(RangeError);
  });

  it('rejects an invalid Date value', () => {
    expect(() => toYunQiInstant(new Date(Number.NaN))).toThrowError(RangeError);
    expect(() => toYunQiInstant(new Date(Number.NaN))).toThrow(/无效/);
  });

  it.each([
    ['2024-02-29T00:00:00+08:00', Date.UTC(2024, 1, 28, 16, 0, 0)],
    ['2024-03-20T03:06:25.9Z', Date.UTC(2024, 2, 20, 3, 6, 25, 900)],
    ['2024-03-20T03:06:25.01Z', Date.UTC(2024, 2, 20, 3, 6, 25, 10)],
    ['2024-03-20T03:06:25.987Z', Date.UTC(2024, 2, 20, 3, 6, 25, 987)],
    ['2024-03-20T08:36:25.01+05:30', Date.UTC(2024, 2, 20, 3, 6, 25, 10)],
    ['2024-03-19T22:36:25.01-04:30', Date.UTC(2024, 2, 20, 3, 6, 25, 10)],
  ] as const)('converts valid strict input %s exactly', (input, expected) => {
    expect(toYunQiInstant(input).epochMilliseconds).toBe(expected);
  });
});

describe('Tyme4tsCalendarProvider', () => {
  it('implements the domain CalendarProvider contract', () => {
    const provider: CalendarProvider = new Tyme4tsCalendarProvider();

    expect(provider).toBeInstanceOf(Tyme4tsCalendarProvider);
  });

  it('gets the exact 2024 Dahan instant from tyme4ts', () => {
    expect(tyme4tsCalendarProvider.getSolarTermInstant(2024, '大寒')).toEqual({
      epochMilliseconds: 1_705_759_642_000,
      offset: '+08:00',
    });
  });

  it('exports a frozen singleton provider', () => {
    expect(tyme4tsCalendarProvider).toBeInstanceOf(Tyme4tsCalendarProvider);
    expect(Object.isFrozen(tyme4tsCalendarProvider)).toBe(true);
  });

  it.each([
    ['year', TymeSolarTerm.fromName(2025, '大寒')],
    ['name', TymeSolarTerm.fromName(2024, '春分')],
  ] as const)('rejects a tyme4ts result with a mismatched %s', (_field, result) => {
    vi.spyOn(TymeSolarTerm, 'fromName').mockReturnValue(result);

    expect(() =>
      new Tyme4tsCalendarProvider().getSolarTermInstant(2024, '大寒'),
    ).toThrowError(RangeError);
    expect(() =>
      new Tyme4tsCalendarProvider().getSolarTermInstant(2024, '大寒'),
    ).toThrow(/不一致/);
  });
});
