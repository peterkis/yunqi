import type { CalendarProvider } from '../calendar/calendar-provider.js';
import { calculateHostGuestRelation } from '../relation/host-guest-relation.js';
import { STEP_BOUNDARY_TERMS } from '../rules/phase1-rules.js';
import type { Qi, SixQiStep, StepName } from '../types.js';
import { calculateGuestQi, getHostQi } from './host-guest.js';

const STEP_NAMES = Object.freeze([
  '初之气',
  '二之气',
  '三之气',
  '四之气',
  '五之气',
  '终之气',
] as const satisfies readonly StepName[]);

export function buildSixQiSteps(
  year: number,
  sitian: Qi,
  provider: CalendarProvider,
): readonly SixQiStep[] {
  const boundaries = [
    ...STEP_BOUNDARY_TERMS.map((term) => provider.getSolarTermTime(year, term)),
    provider.getSolarTermTime(year + 1, STEP_BOUNDARY_TERMS[0]),
  ];

  for (let index = 0; index < boundaries.length; index += 1) {
    const current = boundaries[index].epochMilliseconds;
    const previous = boundaries[index - 1]?.epochMilliseconds;

    if (!Number.isFinite(current) || (previous !== undefined && current <= previous)) {
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
