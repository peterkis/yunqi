import { describe, expect, it } from 'vitest';

import {
  createYunQiCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  formatYunQiCalendarTime,
} from '../src/calendar/time.js';
import { calculateLearning } from '../src/learning/calculate-learning.js';
import { addBeijingCalendarDays, buildMovementSteps } from '../src/learning/movements.js';
import { CLASSICAL_PASSAGES } from '../src/learning/passages.js';
import { annualRelation, compareElements, currentQiRelation } from '../src/learning/relations.js';
import { CLASSICAL_SOURCES } from '../src/learning/sources.js';
import { calculateHostGuestRelation } from '../src/relation/host-guest-relation.js';
import { calculateYearYunQi } from '../src/services/calculate-year-yunqi.js';
import type { HeavenlyStem, Qi } from '../src/types.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

// Independent year lists transcribed from 医宗金鉴·六十年运气上下相临歌.
// Do not derive these expected labels with the production five-element maps.
const ANNUAL_GROUPS = {
  顺化: '癸巳 癸亥 甲子 甲午 甲寅 甲申 乙丑 乙未 辛卯 辛酉 壬辰 壬戌',
  天刑: '己巳 己亥 辛丑 辛未 戊辰 戊戌 庚子 庚午 庚寅 庚申 丁卯 丁酉',
  小逆: '癸丑 癸未 壬子 壬午 壬寅 壬申 辛巳 辛亥 庚辰 庚戌 己卯 己酉',
  不和: '乙巳 乙亥 丙子 丙午 丙寅 丙申 丁丑 丁未 癸卯 癸酉 甲辰 甲戌',
  天符: '丁巳 丁亥 戊子 戊午 戊寅 戊申 己丑 己未 乙卯 乙酉 丙辰 丙戌',
} as const;

// Explicit host/guest five-tone witnesses, not a rotation of production output.
// 素问·六元正纪大论: 太羽→太角 and 少羽→少角 must not flip 太/少.
const MOVEMENT_TONES: Readonly<Record<HeavenlyStem, readonly [string, string]>> = {
  甲: ['太角 少徵 太宫 少商 太羽', '太宫 少商 太羽 太角 少徵'],
  乙: ['太角 少徵 太宫 少商 太羽', '少商 太羽 太角 少徵 太宫'],
  丙: ['太角 少徵 太宫 少商 太羽', '太羽 太角 少徵 太宫 少商'],
  丁: ['少角 太徵 少宫 太商 少羽', '少角 太徵 少宫 太商 少羽'],
  戊: ['少角 太徵 少宫 太商 少羽', '太徵 少宫 太商 少羽 少角'],
  己: ['少角 太徵 少宫 太商 少羽', '少宫 太商 少羽 少角 太徵'],
  庚: ['少角 太徵 少宫 太商 少羽', '太商 少羽 少角 太徵 少宫'],
  辛: ['少角 太徵 少宫 太商 少羽', '少羽 少角 太徵 少宫 太商'],
  壬: ['太角 少徵 太宫 少商 太羽', '太角 少徵 太宫 少商 太羽'],
  癸: ['太角 少徵 太宫 少商 太羽', '少徵 太宫 少商 太羽 太角'],
};

describe('versioned learning relations and independent classical witnesses', () => {
  it('matches all 60 explicit annual classifications, with 12 years in each group', () => {
    const expected = new Map(Object.entries(ANNUAL_GROUPS).flatMap(([label, years]) => {
      expect(years.split(' ')).toHaveLength(12);
      return years.split(' ').map((ganzhi) => [ganzhi, label] as const);
    }));
    expect(expected.size).toBe(60);

    for (let year = 1984; year < 2044; year++) {
      const annual = calculateYearYunQi(year, fixedCalendarProvider);
      expect(annualRelation(annual.suiYun, annual.sitian).label, annual.ganzhi)
        .toBe(expected.get(annual.ganzhi));
    }
  });

  it.each(Object.keys(MOVEMENT_TONES) as HeavenlyStem[])(
    'preserves the explicit host and guest five-tone sequences for %s years',
    (stem) => {
      const index = '甲乙丙丁戊己庚辛壬癸'.indexOf(stem);
      const annual = calculateYearYunQi(1984 + index, fixedCalendarProvider);
      const movements = buildMovementSteps(annual, fixedCalendarProvider);
      expect(annual.stem).toBe(stem);
      expect(movements.map((step) => step.host.tone).join(' ')).toBe(MOVEMENT_TONES[stem][0]);
      expect(movements.map((step) => step.guest.tone).join(' ')).toBe(MOVEMENT_TONES[stem][1]);
      expect(movements.map((step) => step.host.element)).toEqual(['木', '火', '土', '金', '水']);
      expect(movements[0].guest).toEqual(annual.suiYun);
      for (const movement of movements) {
        expect(movement.host.state).toBe(movement.host.tone.startsWith('太') ? '太过' : '不及');
        expect(movement.guest.state).toBe(movement.guest.tone.startsWith('太') ? '太过' : '不及');
      }
    },
  );

  it.each([
    ['厥阴风木', '少阴君火', '相生 · 相得', '主木生客火'],
    ['少阴君火', '厥阴风木', '相生 · 相得', '客木生主火'],
    ['厥阴风木', '太阴湿土', '逆 · 主胜客', '主木克客土'],
    ['太阴湿土', '厥阴风木', '顺 · 客胜主', '客木克主土'],
    ['少阳相火', '少阴君火', '顺 · 君位臣', '客少阴君火加临主少阳相火'],
    ['少阴君火', '少阳相火', '逆 · 臣位君', '客少阳相火加临主少阴君火'],
    ['少阴君火', '少阴君火', '同气', '主客均为少阴君火'],
    ['少阳相火', '少阳相火', '同气', '主客均为少阳相火'],
  ] as const)('keeps the relation and direction distinct for host %s / guest %s',
    (hostQi, guestQi, label, relation) => {
      const step = calculateYearYunQi(2026, fixedCalendarProvider).steps[0];
      expect(currentQiRelation({ ...step, hostQi, guestQi,
        relation: calculateHostGuestRelation(hostQi, guestQi) })).toMatchObject({ label, relation });
    });

  it('can show annual 不和 and current 客胜主顺 at the same instant without collapsing them', () => {
    const result = calculateLearning(createYunQiCalendarTime({
      year: 2026, month: 11, day: 16, hour: 8, minute: 0, second: 0, millisecond: 0,
    }), fixedCalendarProvider);
    expect(result.facts.ganzhi).toBe('丙午');
    expect(result.annualRelation.label).toBe('不和');
    expect(result.currentQi.label).toBe('顺 · 客胜主');
    expect(result.currentMovement).toMatchObject({
      index: 5, name: '终运', host: { tone: '太羽' }, guest: { tone: '少商' },
    });
  });

  it('resolves every relation source ID to a real book, chapter and HTTPS source', () => {
    const qi: readonly Qi[] = ['厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水'];
    const step = calculateYearYunQi(2026, fixedCalendarProvider).steps[0];
    const relations = [
      annualRelation({ element: '水', state: '太过', tone: '太羽' }, '少阴君火'),
      compareElements('出生与当前中运', '水', '火'),
      ...qi.flatMap((hostQi) => qi.map((guestQi) => currentQiRelation({ ...step, hostQi, guestQi,
        relation: calculateHostGuestRelation(hostQi, guestQi) }))),
    ];
    for (const relation of relations) {
      expect(relation.sourceIds.length).toBeGreaterThan(0);
      for (const id of relation.sourceIds) {
        const source = CLASSICAL_SOURCES[id];
        expect(source.id).toBe(id);
        expect(source.work).not.toBe('');
        expect(source.chapter).not.toBe('');
        expect(source.sourceUrl).toMatch(/^https:\/\//);
      }
    }
  });
});

describe('learning passage selection', () => {
  it('has 52 unique excerpts with separate engineering explanations and traceable sources', () => {
    expect(CLASSICAL_PASSAGES).toHaveLength(52);
    expect(new Set(CLASSICAL_PASSAGES.map((passage) => passage.id)).size).toBe(52);
    expect(CLASSICAL_PASSAGES.filter((passage) => passage.scope === 'annual-movement')).toHaveLength(10);
    expect(CLASSICAL_PASSAGES.filter((passage) => passage.scope === 'annual-qi')).toHaveLength(6);
    expect(CLASSICAL_PASSAGES.filter((passage) => passage.scope === 'qi-period')).toHaveLength(36);
    for (const passage of CLASSICAL_PASSAGES) {
      expect(passage.isExcerpt).toBe(true);
      expect(passage.interpretationKind).toBe('工程释义');
      expect(passage.quote).not.toBe('');
      expect(passage.explanation).not.toBe(passage.quote);
      expect(passage.sourceUrl).toBe(CLASSICAL_SOURCES[passage.sourceId].sourceUrl);
    }
  });

  it('matches all 360 year/qi-step combinations by actual annual movement and sitian', () => {
    for (let year = 1984; year < 2044; year++) {
      const annual = calculateYearYunQi(year, fixedCalendarProvider);
      for (const step of annual.steps) {
        const result = calculateLearning(createYunQiCalendarTimeFromInstant(step.start), fixedCalendarProvider);
        expect(result.annualPassages.map((passage) => passage.match)).toEqual([
          { scope: 'annual-movement', element: annual.suiYun.element, state: annual.suiYun.state },
          { scope: 'annual-qi', sitian: annual.sitian },
        ]);
        expect(result.currentPassages.map((passage) => passage.match)).toEqual([
          { scope: 'qi-period', sitian: annual.sitian, qiPeriod: step.index },
        ]);
      }
    }
  });
});

describe('five-movement teaching boundaries', () => {
  it('implements the declared term offsets without silently switching to a 73.05-day step', () => {
    const annual = calculateYearYunQi(2024, fixedCalendarProvider);
    const movements = buildMovementSteps(annual, fixedCalendarProvider);
    expect(movements.slice(1).map((step) =>
      formatYunQiCalendarTime(createYunQiCalendarTimeFromInstant(step.start)))).toEqual([
      '2024-04-02T11:06:25+08:00',
      '2024-06-15T12:09:54+08:00',
      '2024-08-29T22:55:03+08:00',
      '2024-11-11T06:19:49+08:00',
    ]);
    expect(movements[0].start).toEqual(annual.start);
    expect(movements[4].end).toEqual(annual.end);
    expect(movements.every((step) => step.boundaryMethod.includes('教学口径'))).toBe(true);
    expect(movements.every((step) => step.boundaryMethod.includes('待专家确认'))).toBe(true);
    expect(movements.every((step) => step.explanation.includes('不等同'))).toBe(true);
  });

  it.each([2024, 2025, 2026])('assigns each internal %i boundary to the new movement at the exact millisecond', (year) => {
    const annual = calculateYearYunQi(year, fixedCalendarProvider);
    const movements = buildMovementSteps(annual, fixedCalendarProvider);
    for (let i = 1; i < movements.length; i++) {
      const boundary = movements[i].start;
      expect(movements[i - 1].end).toEqual(boundary);
      const before = createYunQiCalendarTimeFromInstant(createYunQiInstant(boundary.epochMilliseconds - 1));
      const at = createYunQiCalendarTimeFromInstant(boundary);
      expect(calculateLearning(before, fixedCalendarProvider).currentMovement.index).toBe(i);
      expect(calculateLearning(at, fixedCalendarProvider).currentMovement.index).toBe(i + 1);
    }
  });

  it('changes the annual and current passages at Dahan, not at midnight or New Year', () => {
    const boundary = fixedCalendarProvider.getSolarTermInstant(2026, '大寒');
    const before = calculateLearning(createYunQiCalendarTimeFromInstant(
      createYunQiInstant(boundary.epochMilliseconds - 1)), fixedCalendarProvider);
    const at = calculateLearning(createYunQiCalendarTimeFromInstant(boundary), fixedCalendarProvider);
    expect(before.facts.ganzhi).toBe('乙巳');
    expect(before.currentMovement.index).toBe(5);
    expect(before.currentPassages[0].match).toEqual({ scope: 'qi-period', sitian: '厥阴风木', qiPeriod: 6 });
    expect(at.facts.ganzhi).toBe('丙午');
    expect(at.currentMovement.index).toBe(1);
    expect(at.currentPassages[0].match).toEqual({ scope: 'qi-period', sitian: '少阴君火', qiPeriod: 1 });
  });

  it.each([
    [1900, 2, 28, 1, '1900-03-01T14:15:16+08:00'],
    [2000, 2, 28, 1, '2000-02-29T14:15:16+08:00'],
    [2024, 2, 28, 2, '2024-03-01T14:15:16+08:00'],
    [2026, 12, 31, 1, '2027-01-01T14:15:16+08:00'],
  ] as const)('retains fixed Beijing clock fields across %i-%i-%i + %i days',
    (year, month, day, days, expected) => {
      const input = createYunQiCalendarTime({ year, month, day, hour: 14, minute: 15, second: 16, millisecond: 0 });
      expect(formatYunQiCalendarTime(addBeijingCalendarDays(input, days))).toBe(expected);
    });
});
