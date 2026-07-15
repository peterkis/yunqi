import type { CalendarProvider } from '../calendar/provider.js';
import { assertYunQiInstant } from '../calendar/time.js';
import { calculateHostGuestRelation } from '../relation/host-guest-relation.js';
import { STEP_BOUNDARY_TERMS, STEP_NAMES } from '../rules/phase1-rules.js';
import type { Qi, SixQiStep } from '../types.js';
import { calculateGuestQi, getHostQi } from './host-guest.js';

export function buildSixQiSteps(
  year: number,
  sitian: Qi,
  provider: CalendarProvider,
): readonly SixQiStep[] {
  if (!Number.isFinite(year) || !Number.isInteger(year)) {
    throw new RangeError('年份必须是有限整数');
  }

  const boundaries = [
    ...STEP_BOUNDARY_TERMS.map((term) => provider.getSolarTermInstant(year, term)),
    provider.getSolarTermInstant(year + 1, STEP_BOUNDARY_TERMS[0]),
  ];

  boundaries.forEach((boundary, index) =>
    assertYunQiInstant(boundary, `六步边界 ${index + 1}`),
  );

  for (let index = 1; index < boundaries.length; index += 1) {
    const current = boundaries[index].epochMilliseconds;
    const previous = boundaries[index - 1].epochMilliseconds;

    if (current <= previous) {
      throw new RangeError('六步边界必须按时间严格递增');
    }
  }

  const guestQi = calculateGuestQi(sitian);
  const steps = STEP_NAMES.map((name, offset) => {
    const index = (offset + 1) as SixQiStep['index'];
    const hostQi = getHostQi(index);
    const currentGuestQi = guestQi[offset];

    return Object.freeze({
      index,
      name,
      start: boundaries[offset],
      end: boundaries[offset + 1],
      hostQi,
      guestQi: currentGuestQi,
      relation: calculateHostGuestRelation(hostQi, currentGuestQi),
    });
  });

  return Object.freeze(steps);
}
