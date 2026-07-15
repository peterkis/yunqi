import { formatBeijingDateTime } from '../calendar/beijing-time.js';
import type { CalendarProvider } from '../calendar/calendar-provider.js';
import { calculateHostGuestRelation } from '../relation/host-guest-relation.js';
import { STEP_BOUNDARY_TERMS, STEP_NAMES } from '../rules/phase1-rules.js';
import type { BeijingDateTime, Qi, SixQiStep } from '../types.js';
import { calculateGuestQi, getHostQi } from './host-guest.js';

function validateBoundary(boundary: BeijingDateTime): void {
  if (!Number.isFinite(boundary.epochMilliseconds)) {
    throw new RangeError('节气边界的纪元毫秒值必须是有限数值');
  }

  const parsedEpochMilliseconds = Date.parse(boundary.iso);

  if (!Number.isFinite(parsedEpochMilliseconds)) {
    throw new RangeError('节气边界的 ISO 时间无效');
  }

  if (parsedEpochMilliseconds !== boundary.epochMilliseconds) {
    throw new RangeError('节气边界的 ISO 时间与纪元毫秒值不一致');
  }

  if (boundary.iso !== formatBeijingDateTime(boundary.epochMilliseconds)) {
    throw new RangeError('节气边界必须使用规范的北京时间秒格式');
  }
}

export function buildSixQiSteps(
  year: number,
  sitian: Qi,
  provider: CalendarProvider,
): readonly SixQiStep[] {
  const boundaries = [
    ...STEP_BOUNDARY_TERMS.map((term) => provider.getSolarTermTime(year, term)),
    provider.getSolarTermTime(year + 1, STEP_BOUNDARY_TERMS[0]),
  ];

  boundaries.forEach(validateBoundary);

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
