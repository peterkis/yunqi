import type { CalendarProvider } from '../calendar/calendar-provider.js';
import { defaultCalendarProvider } from '../calendar/tyme-calendar-provider.js';
import { createYearExplanations } from '../explanation/explanation-template.js';
import { calculateStemBranch } from '../ganzhi/stem-branch.js';
import { buildSixQiSteps } from '../liuqi/six-qi.js';
import { getSitianZaiquan } from '../liuqi/sitian-zaiquan.js';
import { RULE_VERSION } from '../rules/phase1-rules.js';
import type { YunQiYearResult } from '../types.js';
import { calculateSuiYun } from '../wuyun/sui-yun.js';

export function calculateYearYunQi(
  year: number,
  provider: CalendarProvider = defaultCalendarProvider,
): YunQiYearResult {
  if (!Number.isFinite(year) || !Number.isInteger(year)) {
    throw new RangeError('年份必须是有限整数');
  }

  const stemBranch = calculateStemBranch(year);
  const suiYun = calculateSuiYun(stemBranch.stem);
  const { sitian, zaiquan } = getSitianZaiquan(stemBranch.branch);
  const steps = buildSixQiSteps(year, sitian, provider);
  const start = steps[0].start;
  const end = steps[steps.length - 1].end;
  const explanations = createYearExplanations({
    ...stemBranch,
    start,
    end,
    suiYun,
    sitian,
    zaiquan,
    steps,
  });

  return {
    ...stemBranch,
    start,
    end,
    suiYun,
    sitian,
    zaiquan,
    steps,
    ruleVersion: RULE_VERSION,
    explanations,
  };
}
