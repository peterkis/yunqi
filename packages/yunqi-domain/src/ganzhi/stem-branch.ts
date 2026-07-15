import { SIXTY_CYCLE, SIXTY_CYCLE_ANCHOR } from '../rules/phase1-rules.js';
import type { EarthlyBranch, HeavenlyStem, StemBranch } from '../types.js';

export function calculateStemBranch(year: number): StemBranch {
  if (!Number.isFinite(year) || !Number.isInteger(year)) {
    throw new RangeError('年份必须是有限整数');
  }

  const cycleLength = SIXTY_CYCLE.length;
  const index =
    ((year - SIXTY_CYCLE_ANCHOR.year) % cycleLength + cycleLength) % cycleLength;
  const ganzhi = SIXTY_CYCLE[index];

  return {
    year,
    ganzhi,
    stem: ganzhi[0] as HeavenlyStem,
    branch: ganzhi[1] as EarthlyBranch,
  };
}
