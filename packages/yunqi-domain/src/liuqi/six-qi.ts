import { validateBeijingDateTime } from '../calendar/beijing-time.js';
import type { CalendarProvider } from '../calendar/calendar-provider.js';
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
    ...STEP_BOUNDARY_TERMS.map((term) => provider.getSolarTermTime(year, term)),
    provider.getSolarTermTime(year + 1, STEP_BOUNDARY_TERMS[0]),
  ];

  boundaries.forEach((boundary) => validateBeijingDateTime(boundary));

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
      start: boundaries[offset].iso,
      end: boundaries[offset + 1].iso,
      hostQi,
      guestQi: currentGuestQi,
      relation: calculateHostGuestRelation(hostQi, currentGuestQi),
    });
  });

  return Object.freeze(steps);
}
