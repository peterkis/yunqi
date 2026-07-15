import { describe, expect, it } from 'vitest';

import type { CalendarProvider } from '../src/calendar/calendar-provider.js';
import { tymeCalendarProvider } from '../src/calendar/tyme-calendar-provider.js';
import { resolveYunQiYear } from '../src/calendar/yunqi-year-resolver.js';
import { calculateStemBranch } from '../src/ganzhi/stem-branch.js';
import { STEM_RULES } from '../src/rules/phase1-rules.js';
import { calculateSuiYun } from '../src/wuyun/sui-yun.js';
import * as publicApi from '../src/index.js';

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
});

describe('YunQi year resolution', () => {
  it('changes YunQi year at the exact 2024 Dahan second', () => {
    expect(resolveYunQiYear('2024-01-20T22:07:21+08:00', tymeCalendarProvider)).toBe(2023);
    expect(resolveYunQiYear('2024-01-20T22:07:22+08:00', tymeCalendarProvider)).toBe(2024);
  });

  it('queries Dahan using the Beijing civil year of the absolute instant', () => {
    const requests: Array<{ year: number; term: string }> = [];
    const provider: CalendarProvider = {
      getSolarTermTime(year, term) {
        requests.push({ year, term });
        return tymeCalendarProvider.getSolarTermTime(year, term);
      },
    };

    expect(resolveYunQiYear('2023-12-31T16:00:00Z', provider)).toBe(2023);
    expect(requests).toEqual([{ year: 2024, term: '大寒' }]);
  });
});

describe('annual calculator public API', () => {
  it('exports all three annual calculators from the package entrypoint', () => {
    expect(publicApi.calculateStemBranch).toBe(calculateStemBranch);
    expect(publicApi.resolveYunQiYear).toBe(resolveYunQiYear);
    expect(publicApi.calculateSuiYun).toBe(calculateSuiYun);
  });
});
