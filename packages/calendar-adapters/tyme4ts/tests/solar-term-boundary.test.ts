import {
  calculateYearYunQi,
  calculateYunQi,
  createYunQiInstant,
  type SixQiStep,
  type SolarTerm,
  type YunQiInstant,
} from '@yunqi/domain';
import { describe, expect, it } from 'vitest';

import { tyme4tsCalendarProvider } from '../src/index.js';

interface ExpectedPosition {
  readonly year: number;
  readonly stepIndex: SixQiStep['index'];
}

interface BoundaryCase {
  readonly requestedYear: number;
  readonly term: SolarTerm;
  readonly before: ExpectedPosition;
  readonly fromExact: ExpectedPosition;
}

const BOUNDARY_CASES = Object.freeze([
  {
    requestedYear: 2024,
    term: '大寒',
    before: { year: 2023, stepIndex: 6 },
    fromExact: { year: 2024, stepIndex: 1 },
  },
  {
    requestedYear: 2024,
    term: '春分',
    before: { year: 2024, stepIndex: 1 },
    fromExact: { year: 2024, stepIndex: 2 },
  },
  {
    requestedYear: 2024,
    term: '小满',
    before: { year: 2024, stepIndex: 2 },
    fromExact: { year: 2024, stepIndex: 3 },
  },
  {
    requestedYear: 2024,
    term: '大暑',
    before: { year: 2024, stepIndex: 3 },
    fromExact: { year: 2024, stepIndex: 4 },
  },
  {
    requestedYear: 2024,
    term: '秋分',
    before: { year: 2024, stepIndex: 4 },
    fromExact: { year: 2024, stepIndex: 5 },
  },
  {
    requestedYear: 2024,
    term: '小雪',
    before: { year: 2024, stepIndex: 5 },
    fromExact: { year: 2024, stepIndex: 6 },
  },
  {
    requestedYear: 2025,
    term: '大寒',
    before: { year: 2024, stepIndex: 6 },
    fromExact: { year: 2025, stepIndex: 1 },
  },
] as const satisfies readonly BoundaryCase[]);

function shift(instant: YunQiInstant, milliseconds: number): YunQiInstant {
  return createYunQiInstant(instant.epochMilliseconds + milliseconds);
}

function positionAt(instant: YunQiInstant): ExpectedPosition {
  const result = calculateYunQi(instant, tyme4tsCalendarProvider);

  return { year: result.year, stepIndex: result.currentStep.index };
}

function owns(step: SixQiStep, instant: YunQiInstant): boolean {
  return (
    step.start.epochMilliseconds <= instant.epochMilliseconds &&
    instant.epochMilliseconds < step.end.epochMilliseconds
  );
}

describe('real tyme4ts solar-term boundaries', () => {
  it.each(BOUNDARY_CASES)(
    'switches at $requestedYear $term with exact 1 ms precision',
    ({ requestedYear, term, before, fromExact }) => {
      const boundary = tyme4tsCalendarProvider.getSolarTermInstant(
        requestedYear,
        term,
      );

      expect(positionAt(shift(boundary, -1))).toEqual(before);
      expect(positionAt(boundary)).toEqual(fromExact);
      expect(positionAt(shift(boundary, 1))).toEqual(fromExact);
    },
  );

  it('assigns the ending 2025 大寒 exact instant only to the next year step 1', () => {
    const boundary = tyme4tsCalendarProvider.getSolarTermInstant(2025, '大寒');
    const outgoing = calculateYearYunQi(2024, tyme4tsCalendarProvider);
    const next = calculateYearYunQi(2025, tyme4tsCalendarProvider);

    expect(outgoing.steps.filter((step) => owns(step, boundary))).toHaveLength(0);
    expect(next.steps.filter((step) => owns(step, boundary))).toEqual([
      next.steps[0],
    ]);
    expect(positionAt(boundary)).toEqual({ year: 2025, stepIndex: 1 });
    expect(positionAt(shift(boundary, 1))).toEqual({
      year: 2025,
      stepIndex: 1,
    });
  });
});
