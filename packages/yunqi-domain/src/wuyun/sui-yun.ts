import { STEM_RULES } from '../rules/phase1-rules.js';
import type { HeavenlyStem, SuiYun } from '../types.js';

export function calculateSuiYun(stem: HeavenlyStem): SuiYun {
  return { ...STEM_RULES[stem] };
}
