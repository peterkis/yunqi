import {
  calculateHostGuestRelation,
  calculateYearYunQi,
  createYunQiInstant,
  getCurrentStep,
  type Element,
  type HostGuestDirection,
  type HostGuestRelationResult,
  type Qi,
  type SixQiStep,
  type YunQiInstant,
} from '@yunqi/domain';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { tyme4tsCalendarProvider } from '../src/index.js';

// Independent relation oracle. These values are intentionally not imported
// from the domain rule constants that they verify.
const EXPECTED_QI_VALUES = Object.freeze([
  '厥阴风木',
  '少阴君火',
  '太阴湿土',
  '少阳相火',
  '阳明燥金',
  '太阳寒水',
] as const satisfies readonly Qi[]);

const EXPECTED_QI_ELEMENTS = Object.freeze({
  厥阴风木: '木',
  少阴君火: '火',
  太阴湿土: '土',
  少阳相火: '火',
  阳明燥金: '金',
  太阳寒水: '水',
} satisfies Readonly<Record<Qi, Element>>);

const EXPECTED_GENERATION = Object.freeze({
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
} satisfies Readonly<Record<Element, Element>>);

const EXPECTED_CONTROL = Object.freeze({
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
} satisfies Readonly<Record<Element, Element>>);

const EXPECTED_DIRECTION_LABELS = Object.freeze({
  HOST_GENERATES_GUEST: '主生客，相得',
  GUEST_GENERATES_HOST: '客生主',
  HOST_CONTROLS_GUEST: '主克客',
  GUEST_CONTROLS_HOST: '客克主',
} satisfies Readonly<
  Record<Exclude<HostGuestDirection, 'NONE'>, string>
>);

const ALL_QI_PAIRS: [Qi, Qi][] = EXPECTED_QI_VALUES.flatMap((host) =>
  EXPECTED_QI_VALUES.map((guest): [Qi, Qi] => [host, guest]),
);

function owns(step: SixQiStep, instant: YunQiInstant): boolean {
  return (
    step.start.epochMilliseconds <= instant.epochMilliseconds &&
    instant.epochMilliseconds < step.end.epochMilliseconds
  );
}

function directionalRelation(
  direction: Exclude<HostGuestDirection, 'NONE'>,
): HostGuestRelationResult {
  return {
    qiRelation: 'DIFFERENT_QI',
    elementRelation: 'DIFFERENT_ELEMENT',
    direction,
    traditionalLabel: EXPECTED_DIRECTION_LABELS[direction],
  };
}

function expectedRelation(host: Qi, guest: Qi): HostGuestRelationResult {
  const hostElement = EXPECTED_QI_ELEMENTS[host];
  const guestElement = EXPECTED_QI_ELEMENTS[guest];

  if (host === guest) {
    return {
      qiRelation: 'SAME_QI',
      elementRelation: 'SAME_ELEMENT',
      direction: 'NONE',
      traditionalLabel: '同气',
    };
  }

  if (hostElement === guestElement) {
    return {
      qiRelation: 'DIFFERENT_QI',
      elementRelation: 'SAME_ELEMENT',
      direction: 'NONE',
      traditionalLabel: `同属${hostElement}，六气不同`,
    };
  }

  if (EXPECTED_GENERATION[hostElement] === guestElement) {
    return directionalRelation('HOST_GENERATES_GUEST');
  }

  if (EXPECTED_GENERATION[guestElement] === hostElement) {
    return directionalRelation('GUEST_GENERATES_HOST');
  }

  if (EXPECTED_CONTROL[hostElement] === guestElement) {
    return directionalRelation('HOST_CONTROLS_GUEST');
  }

  if (EXPECTED_CONTROL[guestElement] === hostElement) {
    return directionalRelation('GUEST_CONTROLS_HOST');
  }

  throw new Error('Independent five-element oracle is incomplete');
}

describe('Phase 2 admission properties', () => {
  it('preserves six-step structure, continuity, anchors, and cross-year ownership', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1901, max: 2099 }), (year) => {
        const result = calculateYearYunQi(year, tyme4tsCalendarProvider);
        const next = calculateYearYunQi(year + 1, tyme4tsCalendarProvider);

        expect(result.steps).toHaveLength(6);
        expect(result.steps[2].guestQi).toBe(result.sitian);
        expect(result.steps[5].guestQi).toBe(result.zaiquan);

        for (let index = 0; index < 5; index += 1) {
          expect(result.steps[index].end).toEqual(result.steps[index + 1].start);
        }

        expect(result.end).toEqual(next.start);
        expect(result.steps.filter((step) => owns(step, result.end))).toHaveLength(
          0,
        );
        expect(next.steps.filter((step) => owns(step, result.end))).toEqual([
          next.steps[0],
        ]);
        expect(getCurrentStep(result.end, tyme4tsCalendarProvider)).toEqual(
          next.steps[0],
        );
      }),
      { numRuns: 200 },
    );
  });

  it('gives every generated interior instant exactly one owning step', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1901, max: 2099 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 1_000 }),
        (year, stepIndex, basisPoint) => {
          const result = calculateYearYunQi(year, tyme4tsCalendarProvider);
          const expectedStep = result.steps[stepIndex];
          const start = expectedStep.start.epochMilliseconds;
          const end = expectedStep.end.epochMilliseconds;
          const epochMilliseconds =
            start + Math.floor(((end - start - 1) * basisPoint) / 1_000);
          const input = createYunQiInstant(epochMilliseconds);
          const owners = result.steps.filter((step) => owns(step, input));

          expect(owners).toEqual([expectedStep]);
          expect(getCurrentStep(input, tyme4tsCalendarProvider)).toEqual(
            expectedStep,
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it('matches the independent relation oracle for every one of the 6 x 6 qi pairs', () => {
    expect(ALL_QI_PAIRS).toHaveLength(36);

    fc.assert(
      fc.property(
        fc.constantFrom(...EXPECTED_QI_VALUES),
        fc.constantFrom(...EXPECTED_QI_VALUES),
        (host, guest) => {
          expect(calculateHostGuestRelation(host, guest)).toEqual(
            expectedRelation(host, guest),
          );
        },
      ),
      { examples: ALL_QI_PAIRS, numRuns: 200 },
    );
  });
});
