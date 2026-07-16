import { describe, expect, it } from 'vitest';

import type { CalendarProvider } from '../src/calendar/provider.js';
import {
  createYunQiCalendarTime,
  createYunQiInstant,
  type YunQiInstant,
} from '../src/calendar/time.js';
import {
  resolveYunQiYear,
  resolveYunQiYearByCalendarTime,
} from '../src/calendar/yunqi-year-resolver.js';
import { calculateStemBranch } from '../src/ganzhi/stem-branch.js';
import { STEM_RULES } from '../src/rules/phase1-rules.js';
import { calculateSuiYun } from '../src/wuyun/sui-yun.js';
import * as publicApi from '../src/index.js';
import {
  FIXED_2024_BOUNDARY_EPOCHS,
  fixedCalendarProvider,
} from './helpers/fixed-calendar-provider.js';

describe('annual Ganzhi and SuiYun calculations', () => {
  it('cycles all 60 Ganzhi from the 1984 Jiazi anchor', () => {
    const names = Array.from(
      { length: 60 },
      (_, offset) => calculateStemBranch(1984 + offset).ganzhi,
    );

    expect(new Set(names).size).toBe(60);
    expect(names[0]).toBe('甲子');
    expect(calculateStemBranch(2044).ganzhi).toBe('甲子');
  });

  it.each([
    [2024, '甲辰', '土', '太过', '太宫'],
    [2025, '乙巳', '金', '不及', '少商'],
    [2026, '丙午', '水', '太过', '太羽'],
    [2027, '丁未', '木', '不及', '少角'],
    [2028, '戊申', '火', '太过', '太徵'],
  ] as const)('calculates %i', (year, ganzhi, element, state, tone) => {
    const stemBranch = calculateStemBranch(year);

    expect(stemBranch.ganzhi).toBe(ganzhi);
    expect(calculateSuiYun(stemBranch.stem)).toEqual({ element, state, tone });
  });

  it('returns a new SuiYun object on every calculation', () => {
    const first = calculateSuiYun('甲');
    const second = calculateSuiYun('甲');

    expect(first).toEqual(STEM_RULES.甲);
    expect(first).not.toBe(STEM_RULES.甲);
    expect(second).not.toBe(first);
  });

  it('covers every year from 1900 through 2100 with a defined stem rule', () => {
    for (let year = 1900; year <= 2100; year += 1) {
      const stemBranch = calculateStemBranch(year);

      expect(stemBranch.ganzhi).toHaveLength(2);
      expect(STEM_RULES[stemBranch.stem]).toBeDefined();
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2024.5])(
    'rejects the non-finite or non-integer helper year %s descriptively',
    (year) => {
      expect(() => calculateStemBranch(year)).toThrowError(RangeError);
      expect(() => calculateStemBranch(year)).toThrow(/年份必须是有限整数/);
    },
  );
});

describe('YunQi year resolution', () => {
  it('resolves the authoritative calendar input at the exact Dahan tuple', () => {
    const before = createYunQiCalendarTime({
      year: 2024,
      month: 1,
      day: 20,
      hour: 22,
      minute: 7,
      second: 21,
      millisecond: 999,
    });
    const exact = createYunQiCalendarTime({
      year: 2024,
      month: 1,
      day: 20,
      hour: 22,
      minute: 7,
      second: 22,
      millisecond: 0,
    });

    expect(resolveYunQiYearByCalendarTime(before, fixedCalendarProvider)).toBe(
      2023,
    );
    expect(resolveYunQiYearByCalendarTime(exact, fixedCalendarProvider)).toBe(
      2024,
    );
  });

  it('changes YunQi year at the exact 2024 Dahan second', () => {
    expect(
      resolveYunQiYear(
        createYunQiInstant(FIXED_2024_BOUNDARY_EPOCHS[0] - 1_000),
        fixedCalendarProvider,
      ),
    ).toBe(2023);
    expect(
      resolveYunQiYear(
        createYunQiInstant(FIXED_2024_BOUNDARY_EPOCHS[0]),
        fixedCalendarProvider,
      ),
    ).toBe(2024);
  });

  it('queries Dahan using the Beijing civil year of the absolute instant', () => {
    const requests: Array<{ year: number; term: string }> = [];
    const provider: CalendarProvider = {
      getSolarTermInstant(year, term) {
        requests.push({ year, term });
        return fixedCalendarProvider.getSolarTermInstant(year, term);
      },
    };

    expect(resolveYunQiYear(createYunQiInstant(1_704_038_400_000), provider)).toBe(2023);
    expect(requests).toEqual([{ year: 2024, term: '大寒' }]);
  });

  it.each([
    [
      'a non-safe epoch',
      { epochMilliseconds: Number.NaN, offset: '+08:00' },
      /大寒.*安全整数/,
    ],
    [
      'an incorrect offset',
      { epochMilliseconds: FIXED_2024_BOUNDARY_EPOCHS[0], offset: 'Z' },
      /大寒.*固定偏移.*\+08:00/,
    ],
  ] as const)('rejects a Dahan Provider result with %s', (_name, dahan, message) => {
    const provider: CalendarProvider = {
      getSolarTermInstant() {
        return dahan as unknown as YunQiInstant;
      },
    };

    const input = createYunQiInstant(1_706_716_800_000);

    expect(() => resolveYunQiYear(input, provider)).toThrowError(RangeError);
    expect(() => resolveYunQiYear(input, provider)).toThrow(message);
  });
});

describe('annual calculator public API', () => {
  it('exports all three annual calculators from the package entrypoint', () => {
    expect(publicApi.calculateStemBranch).toBe(calculateStemBranch);
    expect(publicApi.resolveYunQiYear).toBe(resolveYunQiYear);
    expect(publicApi.calculateSuiYun).toBe(calculateSuiYun);
  });
});
