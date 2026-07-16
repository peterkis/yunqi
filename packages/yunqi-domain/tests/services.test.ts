import { describe, expect, it } from 'vitest';

import type { CalendarProvider, SolarTerm } from '../src/calendar/provider.js';
import {
  BEIJING_CALENDAR_TIME_STANDARD,
  createYunQiCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  formatYunQiInstant,
  type YunQiCalendarTime,
  type YunQiInstant,
} from '../src/calendar/time.js';
import { buildSixQiSteps } from '../src/liuqi/six-qi.js';
import { calculateYearYunQi } from '../src/services/calculate-year-yunqi.js';
import {
  calculateYunQi,
  calculateYunQiByCalendarTime,
} from '../src/services/calculate-yunqi.js';
import { getCurrentStep } from '../src/services/get-current-step.js';
import * as publicApi from '../src/index.js';
import {
  FIXED_2024_BOUNDARY_EPOCHS,
  fixed2024BoundaryInstants,
  fixedCalendarProvider,
} from './helpers/fixed-calendar-provider.js';

const EXPECTED_BOUNDARY_REQUESTS = [
  [2024, '大寒'],
  [2024, '春分'],
  [2024, '小满'],
  [2024, '大暑'],
  [2024, '秋分'],
  [2024, '小雪'],
  [2025, '大寒'],
] as const satisfies readonly (readonly [number, SolarTerm])[];

function createRecordingProvider(): {
  provider: CalendarProvider;
  requests: Array<readonly [number, SolarTerm]>;
} {
  const requests: Array<readonly [number, SolarTerm]> = [];
  const provider: CalendarProvider = {
    getSolarTermInstant(year, term) {
      requests.push([year, term]);
      return fixedCalendarProvider.getSolarTermInstant(year, term);
    },
  };

  return { provider, requests };
}

function createBoundaryOverrideProvider(
  termToOverride: SolarTerm,
  override: (boundary: YunQiInstant) => YunQiInstant,
): CalendarProvider {
  return {
    getSolarTermInstant(year, term) {
      const boundary = fixedCalendarProvider.getSolarTermInstant(year, term);
      return term === termToOverride ? override(boundary) : boundary;
    },
  };
}

describe('six-step timeline', () => {
  it('builds the exact continuous 2024 timeline from fixed Provider seconds', () => {
    const result = calculateYearYunQi(2024, fixedCalendarProvider);

    expect(result).toMatchObject({
      year: 2024,
      ganzhi: '甲辰',
      stem: '甲',
      branch: '辰',
      start: fixed2024BoundaryInstants[0],
      end: fixed2024BoundaryInstants[6],
      suiYun: { element: '土', state: '太过', tone: '太宫' },
      sitian: '太阳寒水',
      zaiquan: '太阴湿土',
      ruleVersion: 'YQ-MVP-RULES-1.0.0',
    });
    expect(result.steps[0].start).toEqual(
      createYunQiInstant(1_705_759_642_000),
    );
    expect(result.steps).toHaveLength(6);
    expect(result.steps.map(({ index, name }) => [index, name])).toEqual([
      [1, '初之气'],
      [2, '二之气'],
      [3, '三之气'],
      [4, '四之气'],
      [5, '五之气'],
      [6, '终之气'],
    ]);
    expect(result.steps.map(({ start }) => start)).toEqual(
      fixed2024BoundaryInstants.slice(0, 6),
    );
    expect(result.steps.map(({ end }) => end)).toEqual(
      fixed2024BoundaryInstants.slice(1),
    );
    expect(
      result.steps.map(({ hostQi, guestQi, relation }) => [hostQi, guestQi, relation]),
    ).toEqual([
      [
        '厥阴风木',
        '少阳相火',
        {
          qiRelation: 'DIFFERENT_QI',
          elementRelation: 'DIFFERENT_ELEMENT',
          direction: 'HOST_GENERATES_GUEST',
          traditionalLabel: '主生客，相得',
        },
      ],
      [
        '少阴君火',
        '阳明燥金',
        {
          qiRelation: 'DIFFERENT_QI',
          elementRelation: 'DIFFERENT_ELEMENT',
          direction: 'HOST_CONTROLS_GUEST',
          traditionalLabel: '主克客',
        },
      ],
      [
        '少阳相火',
        '太阳寒水',
        {
          qiRelation: 'DIFFERENT_QI',
          elementRelation: 'DIFFERENT_ELEMENT',
          direction: 'GUEST_CONTROLS_HOST',
          traditionalLabel: '客克主',
        },
      ],
      [
        '太阴湿土',
        '厥阴风木',
        {
          qiRelation: 'DIFFERENT_QI',
          elementRelation: 'DIFFERENT_ELEMENT',
          direction: 'GUEST_CONTROLS_HOST',
          traditionalLabel: '客克主',
        },
      ],
      [
        '阳明燥金',
        '少阴君火',
        {
          qiRelation: 'DIFFERENT_QI',
          elementRelation: 'DIFFERENT_ELEMENT',
          direction: 'GUEST_CONTROLS_HOST',
          traditionalLabel: '客克主',
        },
      ],
      [
        '太阳寒水',
        '太阴湿土',
        {
          qiRelation: 'DIFFERENT_QI',
          elementRelation: 'DIFFERENT_ELEMENT',
          direction: 'GUEST_CONTROLS_HOST',
          traditionalLabel: '客克主',
        },
      ],
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
        getSolarTermInstant() {
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
    const first = buildSixQiSteps(2024, '太阳寒水', fixedCalendarProvider);
    const second = buildSixQiSteps(2024, '太阳寒水', fixedCalendarProvider);

    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first.every(Object.isFrozen)).toBe(true);
    expect(
      first.every(
        (step) => typeof step.relation === 'object' && Object.isFrozen(step.relation),
      ),
    ).toBe(true);
    expect(
      second.every(
        (step) => typeof step.relation === 'object' && Object.isFrozen(step.relation),
      ),
    ).toBe(true);
  });

  it('rejects Provider boundaries that are not strictly increasing', () => {
    const provider: CalendarProvider = {
      getSolarTermInstant(year, term) {
        if (year === 2024 && term === '小满') {
          return fixedCalendarProvider.getSolarTermInstant(2024, '春分');
        }

        return fixedCalendarProvider.getSolarTermInstant(year, term);
      },
    };

    expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(
      /边界.*严格递增/,
    );
  });

  it.each([
    [
      'a non-integer epoch',
      {
        epochMilliseconds: FIXED_2024_BOUNDARY_EPOCHS[1] + 0.5,
        offset: '+08:00',
      },
      /边界.*安全整数/,
    ],
    [
      'an incorrect offset',
      {
        epochMilliseconds: FIXED_2024_BOUNDARY_EPOCHS[1],
        offset: 'Z',
      },
      /边界.*固定偏移.*\+08:00/,
    ],
  ] as const)(
    'rejects a Provider boundary with %s',
    (_name, invalidBoundary, message) => {
      const provider = createBoundaryOverrideProvider(
        '春分',
        () => invalidBoundary as unknown as YunQiInstant,
      );

      expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrowError(
        RangeError,
      );
      expect(() => buildSixQiSteps(2024, '太阳寒水', provider)).toThrow(message);
    },
  );
});

describe('left-closed and right-open selection', () => {
  it.each([
    [21, 2023, 6],
    [22, 2024, 1],
    [23, 2024, 1],
  ] as const)(
    'selects the specified 2024 Dahan second %i from calendar fields',
    (second, expectedYear, expectedStep) => {
      const input = createYunQiCalendarTime({
        year: 2024,
        month: 1,
        day: 20,
        hour: 22,
        minute: 7,
        second,
        millisecond: 0,
      });
      const result = calculateYunQiByCalendarTime(
        input,
        fixedCalendarProvider,
      );

      expect([result.year, result.currentStep.index]).toEqual([
        expectedYear,
        expectedStep,
      ]);
      expect(result.input).toBe(input);
    },
  );

  it.each([
    [21, 999, 2023, 6],
    [22, 0, 2024, 1],
    [22, 1, 2024, 1],
  ] as const)(
    'uses millisecond-precise calendar tuple ownership at Dahan: %i.%i',
    (second, millisecond, expectedYear, expectedStep) => {
      const result = calculateYunQiByCalendarTime(
        createYunQiCalendarTime({
          year: 2024,
          month: 1,
          day: 20,
          hour: 22,
          minute: 7,
          second,
          millisecond,
        }),
        fixedCalendarProvider,
      );

      expect([result.year, result.currentStep.index]).toEqual([
        expectedYear,
        expectedStep,
      ]);
    },
  );

  it.each([
    [0, 2023, 6, 2024, 1],
    [1, 2024, 1, 2024, 2],
    [2, 2024, 2, 2024, 3],
    [3, 2024, 3, 2024, 4],
    [4, 2024, 4, 2024, 5],
    [5, 2024, 5, 2024, 6],
    [6, 2024, 6, 2025, 1],
  ] as const)(
    'switches at fixed boundary %i after assigning its preceding second to the adjacent step',
    (boundaryIndex, beforeYear, beforeStep, exactYear, exactStep) => {
      const boundaryMilliseconds = FIXED_2024_BOUNDARY_EPOCHS[boundaryIndex];
      const before = calculateYunQi(
        createYunQiInstant(boundaryMilliseconds - 1_000),
        fixedCalendarProvider,
      );
      const exact = calculateYunQi(
        createYunQiInstant(boundaryMilliseconds),
        fixedCalendarProvider,
      );

      expect([before.year, before.currentStep.index]).toEqual([beforeYear, beforeStep]);
      expect([exact.year, exact.currentStep.index]).toEqual([exactYear, exactStep]);
    },
  );
});

describe('service composition', () => {
  it('takes the candidate year and interval position from calendar fields', () => {
    const requests: Array<readonly [number, SolarTerm]> = [];
    const provider: CalendarProvider = {
      getSolarTermInstant(year, term) {
        requests.push([year, term]);
        return fixedCalendarProvider.getSolarTermInstant(year, term);
      },
    };
    const input = Object.freeze({
      localDateTime: Object.freeze({
        year: 2024,
        month: 5,
        day: 20,
        hour: 21,
        minute: 0,
        second: 0,
        millisecond: 0,
      }),
      calendarTimeStandard: BEIJING_CALENDAR_TIME_STANDARD,
      instant: createYunQiInstant(1_748_000_000_000),
    }) as YunQiCalendarTime;

    const result = calculateYunQiByCalendarTime(input, provider);

    expect([result.year, result.currentStep.index]).toEqual([2024, 3]);
    expect(requests[0]).toEqual([2024, '大寒']);
    expect(result.input).toBe(input);
  });

  it('requires and uses the explicit Provider in every public service', () => {
    const year = calculateYearYunQi(2024, fixedCalendarProvider);
    const input = createYunQiInstant(FIXED_2024_BOUNDARY_EPOCHS[2]);
    const result = calculateYunQi(input, fixedCalendarProvider);
    const step = getCurrentStep(input, fixedCalendarProvider);

    expect(year.start).toEqual(fixed2024BoundaryInstants[0]);
    expect([result.year, result.currentStep.index]).toEqual([2024, 3]);
    expect(step.index).toBe(3);
  });

  it('preserves the injected Provider through annual composition', () => {
    const { provider, requests } = createRecordingProvider();

    const result = calculateYearYunQi(2024, provider);

    expect(result.start).toEqual(fixed2024BoundaryInstants[0]);
    expect(requests).toEqual(EXPECTED_BOUNDARY_REQUESTS);
  });

  it('preserves the injected Provider through year resolution and dated composition', () => {
    const { provider, requests } = createRecordingProvider();

    const result = calculateYunQi(fixed2024BoundaryInstants[2], provider);

    expect(result.currentStep.index).toBe(3);
    expect(requests).toEqual([[2024, '大寒'], ...EXPECTED_BOUNDARY_REQUESTS]);
  });

  it('preserves the injected Provider through getCurrentStep', () => {
    const { provider, requests } = createRecordingProvider();

    const step = getCurrentStep(fixed2024BoundaryInstants[2], provider);

    expect(step.index).toBe(3);
    expect(requests).toEqual([[2024, '大寒'], ...EXPECTED_BOUNDARY_REQUESTS]);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 2024.5])(
    'rejects the non-finite or non-integer public year %s',
    (year) => {
      expect(() => calculateYearYunQi(year, fixedCalendarProvider)).toThrow(
        /年份.*(?:有限|整数)/,
      );
    },
  );

  it('retains the immutable input and selected step object identity', () => {
    const input = createYunQiInstant(FIXED_2024_BOUNDARY_EPOCHS[1] + 987);
    const result = calculateYunQi(input, fixedCalendarProvider);

    expect(result.input).toBe(input);
    expect(formatYunQiInstant(result.input)).toBe('2024-03-20T11:06:25+08:00');
    expect(result.currentStep).toBe(result.steps[1]);
  });

  it('keeps one authoritative dated calculation with an instant compatibility adapter', () => {
    const input = createYunQiInstant(FIXED_2024_BOUNDARY_EPOCHS[2] + 123);
    const calendarInput = createYunQiCalendarTimeFromInstant(input);
    const authoritative = calculateYunQiByCalendarTime(
      calendarInput,
      fixedCalendarProvider,
    );
    const compatibility = calculateYunQi(input, fixedCalendarProvider);

    expect(compatibility).toEqual({
      ...authoritative,
      input,
    });
    expect(authoritative.input).toBe(calendarInput);
    expect(compatibility.input).toBe(input);
    expect(compatibility.currentStep).toBe(compatibility.steps[2]);
  });

  it('rejects invalid instant values at the public service boundary', () => {
    const invalidEpoch = {
      epochMilliseconds: Number.NaN,
      offset: '+08:00',
    } as unknown as YunQiInstant;
    const invalidOffset = {
      epochMilliseconds: FIXED_2024_BOUNDARY_EPOCHS[2],
      offset: 'Z',
    } as unknown as YunQiInstant;

    expect(() => calculateYunQi(invalidEpoch, fixedCalendarProvider)).toThrowError(
      RangeError,
    );
    expect(() => getCurrentStep(invalidOffset, fixedCalendarProvider)).toThrowError(
      RangeError,
    );
  });

  it('re-exports all four service APIs by identity from the package root', () => {
    expect(publicApi.buildSixQiSteps).toBe(buildSixQiSteps);
    expect(publicApi.calculateYearYunQi).toBe(calculateYearYunQi);
    expect(publicApi.calculateYunQi).toBe(calculateYunQi);
    expect(publicApi.calculateYunQiByCalendarTime).toBe(
      calculateYunQiByCalendarTime,
    );
    expect(publicApi.getCurrentStep).toBe(getCurrentStep);
  });
});
