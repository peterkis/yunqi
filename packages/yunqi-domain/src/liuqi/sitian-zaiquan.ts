import { BRANCH_QI_RULES } from '../rules/phase1-rules.js';
import type { EarthlyBranch, SitianZaiquan } from '../types.js';

export function getSitianZaiquan(branch: EarthlyBranch): SitianZaiquan {
  return { ...BRANCH_QI_RULES[branch] };
}
