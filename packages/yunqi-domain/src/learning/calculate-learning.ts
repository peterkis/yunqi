import type { CalendarProvider } from '../calendar/provider.js';
import { calculateStageProgress } from '../calendar/stage-progress.js';
import { createYunQiCalendarTime, type YunQiCalendarTime } from '../calendar/time.js';
import { calculateYunQiByCalendarTime } from '../services/calculate-yunqi.js';
import type { StageProgress, YunQiCalendarResult } from '../types.js';
import { CLASSICAL_PASSAGES, type ClassicalPassage } from './passages.js';
import { buildMovementSteps, movementContains, type MovementStep } from './movements.js';
import { annualRelation, currentQiRelation, type LearningRelation } from './relations.js';
import { LEARNING_RULE_VERSION } from './rules.js';
import { CLASSICAL_READING_VERSION } from './sources.js';

export interface YunQiLearning {
  readonly ruleVersion: string;
  readonly facts: YunQiCalendarResult;
  readonly annualRelation: LearningRelation;
  readonly currentQi: LearningRelation;
  readonly currentMovement: MovementStep;
  readonly currentMovementProgress: StageProgress;
  readonly movements: readonly MovementStep[];
  readonly annualPassages: readonly ClassicalPassage[];
  readonly currentPassages: readonly ClassicalPassage[];
  readonly notes: readonly string[];
}

export function calculateLearning(input: YunQiCalendarTime, provider: CalendarProvider): YunQiLearning {
  const facts = calculateYunQiByCalendarTime(input, provider);
  const movements = buildMovementSteps(facts, provider);
  const currentMovement = movements.find((step) => movementContains(step, input));
  if (!currentMovement) throw new RangeError('输入时点没有对应的五步运');
  const annualPassages = CLASSICAL_PASSAGES.filter(({ match }) =>
    (match.scope === 'annual-movement' && match.element === facts.suiYun.element && match.state === facts.suiYun.state)
    || (match.scope === 'annual-qi' && match.sitian === facts.sitian));
  const currentPassages = CLASSICAL_PASSAGES.filter(({ match }) =>
    match.scope === 'qi-period' && match.sitian === facts.sitian && match.qiPeriod === facts.currentStep.index);
  return {
    ruleVersion: LEARNING_RULE_VERSION, facts, annualRelation: annualRelation(facts.suiYun, facts.sitian),
    currentQi: currentQiRelation(facts.currentStep), currentMovement, movements, annualPassages, currentPassages,
    currentMovementProgress: calculateStageProgress(
      currentMovement.start, currentMovement.end, createYunQiCalendarTime(input.localDateTime).instant,
    ),
    notes: [
      '传统理论学习提示，须结合实际气候、症状及医师辨识；不作个人疾病预测。',
      '五步运采用节气交节后整日偏移的教学口径：春分后13日、芒种后10日、处暑后7日、立冬后4日。不是古代定长计刻法，交界判断待专家确认。',
      `经典摘录数据版本：${CLASSICAL_READING_VERSION}。病候是原文内容，工程释义另列；摘录已核对电子文本，疑字待校勘，尚待专家审校。`,
    ],
  };
}
