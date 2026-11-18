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
import { MOVEMENT_BOUNDARY_EPOCHS_2026, stageFacts2026Provider } from './fixtures/stage-facts-2026.js';

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
  it('preserves every captured 2026 boundary to the millisecond, including provider fractional seconds', () => {
    const provider = {
      getSolarTermInstant(year: number, term: Parameters<typeof stageFacts2026Provider.getSolarTermInstant>[1]) {
        return createYunQiInstant(stageFacts2026Provider.getSolarTermInstant(year, term).epochMilliseconds + 987);
      },
    };
    for (const [calendar, fractionalMs] of [[stageFacts2026Provider, 0], [provider, 987]] as const) {
      const annual = calculateYearYunQi(2026, calendar);
      const movements = buildMovementSteps(annual, calendar);
      expect([...movements.map((step) => step.start.epochMilliseconds), movements[4].end.epochMilliseconds])
        .toEqual(MOVEMENT_BOUNDARY_EPOCHS_2026.map((epoch) => epoch + fractionalMs));
    }
  });

  it('labels all five movement boundaries and six qi boundaries with adjacent endpoints', () => {
    const annual = calculateYearYunQi(2026, stageFacts2026Provider);
    const movements = buildMovementSteps(annual, stageFacts2026Provider);
    expect(annual.steps.map(({ startTerm, endTerm }) => [startTerm, endTerm])).toEqual([
      ['大寒', '春分'], ['春分', '小满'], ['小满', '大暑'],
      ['大暑', '秋分'], ['秋分', '小雪'], ['小雪', '大寒'],
    ]);
    expect(movements.map(({ startLabel, endLabel }) => [startLabel, endLabel])).toEqual([
      ['大寒', '春分后13日'], ['春分后13日', '芒种后10日'], ['芒种后10日', '处暑后7日'],
      ['处暑后7日', '立冬后4日'], ['立冬后4日', '大寒'],
    ]);
    annual.steps.slice(0, -1).forEach((step, index) => expect(step.endTerm).toBe(annual.steps[index + 1].startTerm));
    movements.slice(0, -1).forEach((step, index) => expect(step.endLabel).toBe(movements[index + 1].startLabel));
  });

  it.each([
    [2022, '木', 'NONE', '同属木'],
    [2023, '火', 'HOST_GENERATES_GUEST', '主运生客运'],
    [2024, '土', 'HOST_CONTROLS_GUEST', '主运克客运'],
    [2025, '金', 'GUEST_CONTROLS_HOST', '客运克主运'],
    [2026, '水', 'GUEST_GENERATES_HOST', '客运生主运'],
  ])('keeps all five %i movement directions consistent for annual %s', (year, element, direction, label) => {
    const annual = calculateYearYunQi(year, fixedCalendarProvider);
    const movements = buildMovementSteps(annual, fixedCalendarProvider);
    expect(annual.suiYun.element).toBe(element);
    expect(movements.map((step) => step.relation.direction)).toEqual(Array(5).fill(direction));
    expect(movements[0].relation.traditionalLabel).toBe(label);
    for (const step of movements) {
      expect(step.relation.traditionalLabel).toBe(direction === 'NONE' ? `同属${step.host.element}` : label);
      expect(step.relation.traditionalLabel).not.toMatch(/相得|顺|逆/);
      expect(step.relation).not.toHaveProperty('qiRelation');
      expect(Object.isFrozen(step.relation)).toBe(true);
      if (step.host.element === step.guest.element) expect(step.host).toEqual(step.guest);
    }
  });

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

describe('current stage facts', () => {
  const input = createYunQiCalendarTime({
    year: 2026, month: 11, day: 18, hour: 8, minute: 44, second: 0, millisecond: 0,
  });

  it('matches the 2026-11-18 08:44 Beijing golden facts and progress', () => {
    const result = calculateLearning(input, stageFacts2026Provider);
    expect({
      ruleVersion: result.ruleVersion,
      coreRuleVersion: result.facts.ruleVersion,
      qi: { name: result.facts.currentStep.name, startTerm: result.facts.currentStep.startTerm,
        endTerm: result.facts.currentStep.endTerm, progress: result.facts.currentStepProgress },
      movement: { name: result.currentMovement.name, host: result.currentMovement.host, guest: result.currentMovement.guest,
        startLabel: result.currentMovement.startLabel, endLabel: result.currentMovement.endLabel,
        relation: result.currentMovement.relation, progress: result.currentMovementProgress },
    }).toMatchInlineSnapshot(`
      {
        "coreRuleVersion": "YQ-MVP-RULES-1.1.0",
        "movement": {
          "endLabel": "大寒",
          "guest": {
            "element": "金",
            "state": "不及",
            "tone": "少商",
          },
          "host": {
            "element": "水",
            "state": "太过",
            "tone": "太羽",
          },
          "name": "终运",
          "progress": {
            "elapsedRatio": 0.095,
            "endsOnInputDate": false,
            "remainingCalendarDays": 63,
          },
          "relation": {
            "direction": "GUEST_GENERATES_HOST",
            "elementRelation": "DIFFERENT_ELEMENT",
            "traditionalLabel": "客运生主运",
          },
          "startLabel": "立冬后4日",
        },
        "qi": {
          "endTerm": "小雪",
          "name": "五之气",
          "progress": {
            "elapsedRatio": 0.929,
            "endsOnInputDate": false,
            "remainingCalendarDays": 4,
          },
          "startTerm": "秋分",
        },
        "ruleVersion": "YQ-LEARNING-RULES-1.1.0",
      }
    `);
    expect(result.movements.every((step) => !('progress' in step) && !('currentMovementProgress' in step))).toBe(true);
    expect(result.facts.steps.every((step) => !('progress' in step) && !('currentStepProgress' in step))).toBe(true);
    expect(Object.isFrozen(result.currentMovementProgress)).toBe(true);
    expect(Object.isFrozen(result.facts.currentStepProgress)).toBe(true);
  });

  it('starts progress at zero at every qi and movement boundary independently', () => {
    const annual = calculateYearYunQi(2026, stageFacts2026Provider);
    for (const step of annual.steps) {
      const result = calculateLearning(createYunQiCalendarTimeFromInstant(step.start), stageFacts2026Provider);
      expect(result.facts.currentStep.index).toBe(step.index);
      expect(result.facts.currentStepProgress.elapsedRatio).toBe(0);
    }
    for (const movement of buildMovementSteps(annual, stageFacts2026Provider)) {
      const result = calculateLearning(createYunQiCalendarTimeFromInstant(movement.start), stageFacts2026Provider);
      expect(result.currentMovement.index).toBe(movement.index);
      expect(result.currentMovementProgress.elapsedRatio).toBe(0);
    }
  });

  it('ends both final stages at next-year Dahan and handles its local date before the boundary', () => {
    const result = calculateLearning(createYunQiCalendarTime({
      year: 2027, month: 1, day: 20, hour: 0, minute: 0, second: 0, millisecond: 0,
    }), stageFacts2026Provider);
    expect(result.facts.year).toBe(2026);
    expect(result.facts.currentStep.index).toBe(6);
    expect(result.currentMovement.index).toBe(5);
    expect(result.facts.currentStep.endTerm).toBe('大寒');
    expect(result.currentMovement.endLabel).toBe('大寒');
    expect(formatYunQiCalendarTime(createYunQiCalendarTimeFromInstant(result.facts.currentStep.end)))
      .toBe('2027-01-20T15:29:50+08:00');
    expect(result.currentMovement.end).toEqual(result.facts.currentStep.end);
    for (const progress of [result.facts.currentStepProgress, result.currentMovementProgress]) {
      expect(progress.remainingCalendarDays).toBe(0);
      expect(progress.endsOnInputDate).toBe(true);
      expect(progress.elapsedRatio).toBeLessThan(1);
    }
    const lastMillisecond = calculateLearning(createYunQiCalendarTimeFromInstant(
      createYunQiInstant(result.facts.end.epochMilliseconds - 1)), stageFacts2026Provider);
    expect(lastMillisecond.facts.currentStepProgress.elapsedRatio).toBe(0.999);
    expect(lastMillisecond.currentMovementProgress.elapsedRatio).toBe(0.999);
    const atBoundary = calculateLearning(createYunQiCalendarTimeFromInstant(result.facts.end), stageFacts2026Provider);
    expect(atBoundary.facts.year).toBe(2027);
    expect(atBoundary.facts.currentStep.index).toBe(1);
    expect(atBoundary.currentMovement.index).toBe(1);
    expect(atBoundary.facts.currentStepProgress.elapsedRatio).toBe(0);
    expect(atBoundary.currentMovementProgress.elapsedRatio).toBe(0);
  });

  it('uses authoritative local fields for both progress values even when an auxiliary epoch disagrees', () => {
    const auxiliaryMismatch = Object.freeze({ ...input, instant: createYunQiInstant(0) });
    const expected = calculateLearning(input, stageFacts2026Provider);
    const actual = calculateLearning(auxiliaryMismatch, stageFacts2026Provider);
    expect(actual.facts.input).toBe(auxiliaryMismatch);
    expect(actual.facts.currentStepProgress).toEqual(expected.facts.currentStepProgress);
    expect(actual.currentMovementProgress).toEqual(expected.currentMovementProgress);
  });
});
