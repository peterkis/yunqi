import type { LearningViewModel } from './map-learning';

export function currentRuleNotes({ facts, notes, ruleVersion }: LearningViewModel) {
  const { year, interval, stemBranch, suiYun, sitian, zaiquan } = facts.summary;
  // Only omit service sentences whose exact facts are already on the card.
  // Additional qualifications or unfamiliar wording stay available verbatim.
  const displayed = new Set([
    `${year} 运气年以${year} 年大寒实际交节时刻为起点。`,
    `该运气年的实际区间为 ${interval.start.localTime} 至 ${interval.end.localTime}（左闭右开）。`,
    `年干${stemBranch.stem}按规则表对应${suiYun.element}运${suiYun.state}（${suiYun.tone}）。`,
    `年支${stemBranch.branch}按规则表对应司天${sitian}、在泉${zaiquan}。`,
    `三之气客气与司天同为${sitian}。`,
    `终之气客气与在泉同为${zaiquan}。`,
  ]);
  const extra = facts.explanations.filter(text => !displayed.has(text));
  const versions = [{ name: '规则引擎', id: ruleVersion, label: ruleVersion.replace(/^YQ-LEARNING-RULES-(?=\d)/, 'v') }];
  let movementNote = '';
  let readingNote = '';
  let scopeNote = '';
  for (const note of notes) {
    const reading = /^经典摘录数据版本：(YQ-CLASSICAL-READING-(\d+\.\d+\.\d+))。(.*)$/u.exec(note);
    if (reading) {
      versions.push({ name: '典籍数据', id: reading[1], label: `v${reading[2]}` });
      readingNote = reading[3];
    } else if (note.startsWith('五步运采用')) {
      movementNote = note.slice('五步运'.length);
    } else if (note.startsWith('传统理论学习提示，')) {
      scopeNote = note;
    } else {
      extra.push(note);
    }
  }
  return { versions, movementNote, readingNote, scopeNote, extra };
}
