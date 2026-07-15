import { GUEST_QI_SEQUENCE, HOST_QI_SEQUENCE } from '../rules/phase1-rules.js';
import type { Qi, SixQiStep } from '../types.js';

export function getHostQi(index: SixQiStep['index']): Qi {
  const hostQi = HOST_QI_SEQUENCE[index - 1];

  if (hostQi === undefined) {
    throw new Error('Frozen host-qi rule table is internally inconsistent');
  }

  return hostQi;
}

export function calculateGuestQi(sitian: Qi): readonly Qi[] {
  const sitianIndex = GUEST_QI_SEQUENCE.indexOf(sitian);

  if (sitianIndex < 0) {
    throw new Error('Frozen guest-qi rule table is internally inconsistent');
  }

  const sequenceLength = GUEST_QI_SEQUENCE.length;
  const stepOneIndex = sitianIndex - 2;
  const guestQi = GUEST_QI_SEQUENCE.map((_, offset) => {
    const index = ((stepOneIndex + offset) % sequenceLength + sequenceLength) % sequenceLength;
    return GUEST_QI_SEQUENCE[index];
  });

  return Object.freeze(guestQi);
}
