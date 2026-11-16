import { ELEMENT_CONTROL_MAP, ELEMENT_GENERATION_MAP, QI_ELEMENT_MAP } from '../rules/phase1-rules.js';
import type { Element, Qi, SixQiStep, SuiYun } from '../types.js';
import type { ClassicalSourceId } from './sources.js';

export interface LearningRelation {
  readonly title: string;
  readonly label: string;
  readonly relation: string;
  readonly explanation: string;
  readonly sourceIds: readonly ClassicalSourceId[];
}

export function annualRelation(suiYun: SuiYun, sitian: Qi): LearningRelation {
  const yun = suiYun.element;
  const qi = QI_ELEMENT_MAP[sitian];
  const base: Pick<LearningRelation, 'title' | 'sourceIds'> = {
    title: '全年 · 司天与中运', sourceIds: ['yizongjinjian-35'],
  };
  if (qi === yun) return { ...base, label: '天符', relation: `司天${qi}与中运${yun}同五行`,
    explanation: '司天与中运五行相同。此处只判断天符，不据此判断岁会、平气或疾病。' };
  if (ELEMENT_GENERATION_MAP[qi] === yun) return { ...base, label: '顺化', relation: `司天${qi}生中运${yun}`,
    explanation: '司天之气生中运，传统称顺化；这是年度运气相合的关系名称。' };
  if (ELEMENT_CONTROL_MAP[qi] === yun) return { ...base, label: '天刑', relation: `司天${qi}克中运${yun}`,
    explanation: '司天之气克中运，传统称天刑；不能把名称当作个体病情或疾病风险。' };
  if (ELEMENT_GENERATION_MAP[yun] === qi) return { ...base, label: '小逆', relation: `中运${yun}生司天${qi}`,
    explanation: '中运生司天之气，传统称小逆。这里仍是相生关系，与当步客主气顺逆的比较对象不同。' };
  return { ...base, label: '不和', relation: `中运${yun}克司天${qi}`,
    explanation: '中运克司天之气，传统称不和；用于理解年度结构，不表示个人必然患病。' };
}

export function currentQiRelation(step: SixQiStep): LearningRelation {
  const base: Pick<LearningRelation, 'title' | 'sourceIds'> = {
    title: `${step.name} · 客主加临`, sourceIds: ['suwen-zhizhen', 'suwen-liuwei'],
  };
  if (step.guestQi === '少阴君火' && step.hostQi === '少阳相火') return {
    ...base, label: '顺 · 君位臣', relation: '客少阴君火加临主少阳相火',
    explanation: '君火与相火同属火，但为不同六气；按“君位臣则顺”解释，不合并为同气。',
  };
  if (step.guestQi === '少阳相火' && step.hostQi === '少阴君火') return {
    ...base, label: '逆 · 臣位君', relation: '客少阳相火加临主少阴君火',
    explanation: '君火与相火同属火，但为不同六气；按“臣位君则逆”解释，不合并为同气。',
  };
  const host = QI_ELEMENT_MAP[step.hostQi];
  const guest = QI_ELEMENT_MAP[step.guestQi];
  switch (step.relation.direction) {
    case 'HOST_GENERATES_GUEST': return { ...base, label: '相生 · 相得', relation: `主${host}生客${guest}`,
      explanation: '主气生客气，保留方向并说明相得；不将所有相生关系强行分成顺逆。' };
    case 'GUEST_GENERATES_HOST': return { ...base, label: '相生 · 相得', relation: `客${guest}生主${host}`,
      explanation: '客气生主气，保留方向并说明相得；相得不是个体健康结论。' };
    case 'HOST_CONTROLS_GUEST': return { ...base, label: '逆 · 主胜客', relation: `主${host}克客${guest}`,
      explanation: '按“主胜逆”解释当步关系；此处的逆不等于病情严重或一定患病。' };
    case 'GUEST_CONTROLS_HOST': return { ...base, label: '顺 · 客胜主', relation: `客${guest}克主${host}`,
      explanation: '按“客胜从”解释，界面以顺（从）帮助理解；五行仍然相克，不能误读为相生。' };
    case 'NONE': return { ...base, label: '同气', relation: `主客均为${step.hostQi}`,
      explanation: '主气与客气名称相同；只说明客主气结构，不推断个人体质或疾病。' };
  }
}

export function compareElements(title: string, birth: Element, current: Element): LearningRelation {
  let label: string;
  let relation: string;
  if (birth === current) { label = '同五行'; relation = `出生${birth}与当前${current}同五行`; }
  else if (ELEMENT_GENERATION_MAP[birth] === current) { label = '出生生当前'; relation = `出生${birth}生当前${current}`; }
  else if (ELEMENT_GENERATION_MAP[current] === birth) { label = '当前生出生'; relation = `当前${current}生出生${birth}`; }
  else if (ELEMENT_CONTROL_MAP[birth] === current) { label = '出生克当前'; relation = `出生${birth}克当前${current}`; }
  else { label = '当前克出生'; relation = `当前${current}克出生${birth}`; }
  return { title, label, relation,
    explanation: '同一维度的传统五行关系，供结合实际症状和体质辨识互参；不换算九种体质或疾病概率。',
    sourceIds: ['five-elements'] };
}
