import { formatYunQiInstant } from '../calendar/time.js';
import type { YunQiYearResult } from '../types.js';

type YearExplanationFacts = Pick<
  YunQiYearResult,
  'year' | 'start' | 'end' | 'stem' | 'branch' | 'suiYun' | 'sitian' | 'zaiquan' | 'steps'
>;

export function createYearExplanations({
  year,
  start,
  end,
  stem,
  branch,
  suiYun,
  sitian,
  zaiquan,
  steps,
}: YearExplanationFacts): readonly string[] {
  const formattedStart = formatYunQiInstant(start);
  const formattedEnd = formatYunQiInstant(end);

  return Object.freeze([
    `${year} 运气年以北京时间 ${year} 年大寒实际交节时刻为起点。`,
    `该运气年的实际区间为 ${formattedStart} 至 ${formattedEnd}（左闭右开）。`,
    `年干${stem}按规则表对应${suiYun.element}运${suiYun.state}（${suiYun.tone}）。`,
    `年支${branch}按规则表对应司天${sitian}、在泉${zaiquan}。`,
    `三之气客气与司天同为${steps[2].guestQi}。`,
    `终之气客气与在泉同为${steps[5].guestQi}。`,
  ]);
}
