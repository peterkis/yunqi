import { describe, expect, it } from 'vitest';

import type { CalendarProvider } from '../src/calendar/calendar-provider.js';
import { tymeCalendarProvider } from '../src/calendar/tyme-calendar-provider.js';
import { buildSixQiSteps } from '../src/liuqi/six-qi.js';
import { calculateYearYunQi } from '../src/services/calculate-year-yunqi.js';
import { calculateYunQi } from '../src/services/calculate-yunqi.js';
import { getCurrentStep } from '../src/services/get-current-step.js';
import type { BeijingDateTime, SixStepBoundaryTerm } from '../src/types.js';
import * as publicApi from '../src/index.js';

const REAL_2024_BOUNDARIES = [
  '2024-01-20T22:07:22+08:00',
  '2024-03-20T11:06:25+08:00',
  '2024-05-20T20:59:31+08:00',
  '2024-07-22T15:44:26+08:00',
  '2024-09-22T20:43:42+08:00',
  '2024-11-22T03:56:31+08:00',
  '2025-01-20T04:00:08+08:00',
] as const;

const EXPECTED_BOUNDARY_REQUESTS = [
  [2024, '大寒'],
  [2024, '春分'],
  [2024, '小满'],
  [2024, '大暑'],
  [2024, '秋分'],
  [2024, '小雪'],
  [2025, '大寒'],
] as const satisfies readonly (readonly [number, SixStepBoundaryTerm])[];

function createRecordingProvider(): {
  provider: CalendarProvider;
  requests: Array<readonly [number, SixStepBoundaryTerm]>;
} {
  const requests: Array<readonly [number, SixStepBoundaryTerm]> = [];
  const provider: CalendarProvider = {
    getSolarTermTime(year, term) {
      requests.push([year, term]);
      return tymeCalendarProvider.getSolarTermTime(year, term);
    },
  };

  return { provider, requests };
}

function createBoundaryOverrideProvider(
  termToOverride: SixStepBoundaryTerm,
  override: (boundary: BeijingDateTime) => BeijingDateTime,
): CalendarProvider {
  return {
    getSolarTermTime(year, term) {
      const boundary = tymeCalendarProvider.getSolarTermTime(year, term);
      return term === termToOverride ? override(boundary) : boundary;
    },
  };
}

describe('six-step timeline', () => {
  it('builds the exact continuous 2024 timeline from real Provider seconds', () => {
    const result = calculateYearYunQi(2024);

    expect(result).toMatchObject({
      year: 2024,
      ganzhi: '甲辰',
      stem: '甲',
      branch: '辰',
      start: REAL_2024_BOUNDARIES[0],
      end: REAL_2024_BOUNDARIES[6],
      suiYun: { element: '土', state: '太过', tone: '太宫' },
      sitian: '太阳寒水',
      zaiquan: '太阴湿土',
      ruleVersion: 'V1.0-2026.7.7-implementation.1',
    });
    expect(result.steps).toHaveLength(6);
    expect(result.steps.map(({ index, name }) => [index, name])).toEqual([
      [1, '初之气'],
      [2, '二之气'],
      [3, '三之气'],
      [4, '四之气'],
      [5, '五之气'],
      [6, '终之气'],
    ]);
    expect(result.steps.map(({ start }) => start)).toEqual(REAL_2024_BOUNDARIES.slice(0, 6));
    expect(result.steps.map(({ end }) => end)).toEqual(REAL_2024_BOUNDARIES.slice(1));
    expect(
      result.steps.map(({ hostQi, guestQi, relation }) => [hostQi, guestQi, relation]),
    ).toEqual([
      ['厥阴风木', '少阳相火', 'HOST_GENERATES_GUEST'],
      ['少阴君火', '阳明燥金', 'HOST_CONTROLS_GUEST'],
      ['少阳相火', '太阳寒水', 'GUEST_CONTROLS_HOST'],
      ['太阴湿土', '厥阴风木', 'GUEST_CONTROLS_HOST'],
      ['阳明燥金', '少阴君火', 'GUEST_CONTROLS_HOST'],
      ['太阳寒水', '太阴湿土', 'GUEST_CONTROLS_HOST'],
    ]);
    expect(result.steps[2].guestQi).toBe(result.sitian);
    expect(result.steps[5].guestQi).toBe(result.zaiquan);
    expect(result.explanations).toEqual([
      '2024 运气年以北京时间 2024 年大寒实际交节时刻为起点。',
      '该运气年的实际区间为 2024-01-20T22:07:22+08:00 至 2025-01-20T04:00:08+08:00（左闭右开）。',
      '年干甲按规则表对应土运太过（太宫）。',
      '年支辰按规则表对应司天太阳寒水、在泉太阴湿土。',
      '三之气客气与司天同为太阳寒水。',
      '终之气客气与在泉同为太阴湿土。',
    ]);
    expect(Object.isFrozen(result.explanations)).toBe(true);
  });

  it('requests exactly the six same-year starts and the next Dahan', () => {
    const { provider, requests } = createRecordingProvider();

    buildSixQiSteps(2024, '太阳寒水', provider);

    expect(requests).toEqual(EXPECTED_BOUNDARY_REQUESTS);
    expect(requests).toHaveLength(7);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2024.5])(
    'rejects the invalid build year %s before calling the Provider',
    (year) => {
      let providerCalls = 0;
      const provider: CalendarProvider = {
        getSolarTermTime() {
          providerCalls += 1;
          throw new Error('Provider must not be called for an invalid year');
        },
      };

      expect(() => buildSixQiSteps(year, '太阳寒水', provider)).toThrow(
        /年份必须是有限整数/,
      );
      expect(providerCalls).toBe(0);
    },
  );

  it('freezes the six-item collection and every newly built step', () => {
    const first = buildSixQiSteps(2024, '太阳寒水', tymeCalendarProvider);
    const second = buildSixQiSteps(2024, '太阳寒水', tymeCalendarProvider);

    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every(Object.isFrozen)).toBe(true);
  });

  it('rejects Provider boundaries that are not strictly increasing', () => {
    const provider: CalendarProvider = {
      getSolarTermTime(year, term) {
        if (year === 2024 && term === '小满') {
          return tymeCalendarProvider.getSolarTermTime(2024, '春分');
        }

        return tymeCalendarProvider.getSolarTermTime(year, term);
      },
    };

    expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(/边界.*严格递增/);
  });

  it('rejects a Provider boundary with a non-finite epoch', () => {
    const provider = createBoundaryOverrideProvider('春分', (boundary) => ({
      ...boundary,
      epochMilliseconds: Number.NaN,
    }));

    expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(/边界.*有限/);
  });

  it('rejects a Provider boundary with an invalid ISO value', () => {
    const provider = createBoundaryOverrideProvider('春分', (boundary) => ({
      ...boundary,
      iso: 'not-a-date',
    }));

    expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(/边界.*ISO.*无效/);
  });

  it('rejects a same-instant Provider boundary outside canonical Beijing format', () => {
    const provider = createBoundaryOverrideProvider('春分', (boundary) => ({
      ...boundary,
      iso: '2024-03-20T03:06:25Z',
    }));

    expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(
      /边界.*规范.*北京时间/,
    );
  });

  it('rejects a Provider boundary whose ISO and epoch represent different instants', () => {
    const provider = createBoundaryOverrideProvider('春分', (boundary) => ({
      ...boundary,
      iso: REAL_2024_BOUNDARIES[0],
    }));

    expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(/边界.*不一致/);
  });
});

describe('left-closed and right-open selection', () => {
  it.each([
    [REAL_2024_BOUNDARIES[0], 2023, 6, 2024, 1],
    [REAL_2024_BOUNDARIES[1], 2024, 1, 2024, 2],
    [REAL_2024_BOUNDARIES[2], 2024, 2, 2024, 3],
    [REAL_2024_BOUNDARIES[3], 2024, 3, 2024, 4],
    [REAL_2024_BOUNDARIES[4], 2024, 4, 2024, 5],
    [REAL_2024_BOUNDARIES[5], 2024, 5, 2024, 6],
    [REAL_2024_BOUNDARIES[6], 2024, 6, 2025, 1],
  ] as const)(
    'switches at %s after assigning its preceding second to the adjacent step',
    (boundary, beforeYear, beforeStep, exactYear, exactStep) => {
      const boundaryMilliseconds = Date.parse(boundary);
      const before = calculateYunQi(new Date(boundaryMilliseconds - 1_000));
      const exact = calculateYunQi(new Date(boundaryMilliseconds));

      expect([before.year, before.currentStep.index]).toEqual([beforeYear, beforeStep]);
      expect([exact.year, exact.currentStep.index]).toEqual([exactYear, exactStep]);
    },
  );
});

describe('service composition', () => {
  it('uses the default Provider when each public service omits it', () => {
    const year = calculateYearYunQi(2024);
    const result = calculateYunQi(REAL_2024_BOUNDARIES[2]);
    const step = getCurrentStep(REAL_2024_BOUNDARIES[2]);

    expect(year.start).toBe(REAL_2024_BOUNDARIES[0]);
    expect([result.year, result.currentStep.index]).toEqual([2024, 3]);
    expect(step.index).toBe(3);
  });

  it('preserves the injected Provider through annual composition', () => {
    const { provider, requests } = createRecordingProvider();

    const result = calculateYearYunQi(2024, provider);

    expect(result.start).toBe(REAL_2024_BOUNDARIES[0]);
    expect(requests).toEqual(EXPECTED_BOUNDARY_REQUESTS);
  });

  it('preserves the injected Provider through year resolution and dated composition', () => {
    const { provider, requests } = createRecordingProvider();

    const result = calculateYunQi(REAL_2024_BOUNDARIES[2], provider);

    expect(result.currentStep.index).toBe(3);
    expect(requests).toEqual([[2024, '大寒'], ...EXPECTED_BOUNDARY_REQUESTS]);
  });

  it('preserves the injected Provider through getCurrentStep', () => {
    const { provider, requests } = createRecordingProvider();

    const step = getCurrentStep(REAL_2024_BOUNDARIES[2], provider);

    expect(step.index).toBe(3);
    expect(requests).toEqual([[2024, '大寒'], ...EXPECTED_BOUNDARY_REQUESTS]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2024.5])(
    'rejects the non-finite or non-integer public year %s',
    (year) => {
      expect(() => calculateYearYunQi(year)).toThrow(/年份.*(?:有限|整数)/);
    },
  );

  it('normalizes input to Beijing seconds and retains the selected step object identity', () => {
    const result = calculateYunQi('2024-03-20T03:06:25.987Z');

    expect(result.input).toBe('2024-03-20T11:06:25+08:00');
    expect(result.currentStep).toBe(result.steps[1]);
  });

  it('propagates strict timezone and invalid-input errors', () => {
    expect(() => calculateYunQi('2024-03-20T11:06:25')).toThrow(/时区/);
    expect(() => getCurrentStep(new Date(Number.NaN))).toThrow(/无效/);
  });

  it('re-exports all four service APIs by identity from the package root', () => {
    expect(publicApi.buildSixQiSteps).toBe(buildSixQiSteps);
    expect(publicApi.calculateYearYunQi).toBe(calculateYearYunQi);
    expect(publicApi.calculateYunQi).toBe(calculateYunQi);
    expect(publicApi.getCurrentStep).toBe(getCurrentStep);
  });
});
