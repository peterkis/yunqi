import {
  CONSTITUTION_QUESTIONNAIRE_ID,
  CONSTITUTION_RULE_VERSION,
  getConstitutionQuestionnaire,
} from './questionnaire.js';
import type {
  ConstitutionAssessment,
  ConstitutionAssessmentInput,
  ConstitutionScaleResult,
  ConstitutionStatus,
} from './types.js';

const labels: Readonly<Record<ConstitutionStatus, string>> = Object.freeze({
  yes: '是',
  basically: '基本是',
  tendency: '倾向是',
  no: '否',
});

interface ScaleScore {
  readonly id: ConstitutionScaleResult['id'];
  readonly name: string;
  readonly itemCount: number;
  readonly rawScore: number;
  readonly numerator: number;
  readonly denominator: number;
}

function atLeast(score: ScaleScore, threshold: number): boolean {
  // Comparing integers avoids rounding a conversion across a classification edge.
  return score.numerator >= threshold * score.denominator;
}

function classify(score: ScaleScore, all: readonly ScaleScore[]): ConstitutionStatus {
  if (score.id !== 'balanced') {
    return atLeast(score, 40) ? 'yes' : atLeast(score, 30) ? 'tendency' : 'no';
  }
  if (!atLeast(score, 60)) return 'no';
  const biased = all.filter((item) => item.id !== 'balanced');
  if (biased.every((item) => !atLeast(item, 30))) return 'yes';
  if (biased.every((item) => !atLeast(item, 40))) return 'basically';
  return 'no';
}

export function evaluateConstitution(input: ConstitutionAssessmentInput): ConstitutionAssessment {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new RangeError('量表提交格式无效');
  }
  if (input.questionnaireId !== CONSTITUTION_QUESTIONNAIRE_ID) {
    throw new RangeError('量表版本不匹配，请重新载入量表');
  }
  if (input.sex !== 'male' && input.sex !== 'female') {
    throw new RangeError('请选择量表适用的性别条目后再提交');
  }
  const answers = input.answers;
  if (answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new RangeError('量表答案格式无效');
  }

  const questionnaire = getConstitutionQuestionnaire();
  const applicableQuestions = questionnaire.questions.filter((question) =>
    question.sex === 'all' || question.sex === input.sex,
  );
  const applicableIds = new Set(applicableQuestions.map((question) => question.id));
  if (Object.keys(answers).some((id) => !applicableIds.has(id))) {
    throw new RangeError('答案包含未知题目或不适用的性别条目');
  }
  for (const question of applicableQuestions) {
    if (!Object.hasOwn(answers, question.id)) {
      throw new RangeError('请完成所有适用题目后再计算，缺答不能按最低分处理');
    }
    const answer = answers[question.id];
    if (!Number.isInteger(answer) || answer < 1 || answer > 5) {
      throw new RangeError('每题请选择1至5的整数分值');
    }
  }

  const scores: readonly ScaleScore[] = questionnaire.scales.map((scale) => {
    const items = scale.items.filter((item) => applicableIds.has(item.questionId));
    const rawScore = items.reduce((total, item) => {
      const answer = answers[item.questionId];
      return total + (item.reverse ? 6 - answer : answer);
    }, 0);
    return {
      id: scale.id,
      name: scale.name,
      itemCount: items.length,
      rawScore,
      numerator: (rawScore - items.length) * 100,
      denominator: items.length * 4,
    };
  });
  const results = Object.freeze(scores.map((score) => {
    const status = classify(score, scores);
    return Object.freeze({
      id: score.id,
      name: score.name,
      itemCount: score.itemCount,
      rawScore: score.rawScore,
      score: score.numerator / score.denominator,
      status,
      label: labels[status],
    });
  }));
  const matched = results.filter((result) => result.status === 'yes');
  const tendencies = results.filter((result) => result.status === 'tendency');
  const balanced = results.find((result) => result.id === 'balanced')!;
  const mainSummary = balanced.status === 'basically'
    ? '量表判定：基本是平和质'
    : matched.length > 0
      ? `量表判定：${matched.map((result) => result.name).join('、')}${matched.length > 1 ? '（兼夹）' : ''}`
      : '本次量表未达到明确类型判定条件';
  const summary = tendencies.length > 0
    ? `${mainSummary}；存在${tendencies.map((result) => result.name).join('、')}倾向。`
    : `${mainSummary}。`;

  return Object.freeze({
    questionnaireId: CONSTITUTION_QUESTIONNAIRE_ID,
    version: CONSTITUTION_RULE_VERSION,
    sex: input.sex,
    results,
    matchedTypes: Object.freeze(matched.map((result) => result.id)),
    tendencyTypes: Object.freeze(tendencies.map((result) => result.id)),
    summary,
    boundaryNote: '结果基于近一年自报体验及所选量表规则，供医师复核；不等同于诊断、先天禀赋或个人疾病风险，不能替代四诊与临床评估。',
  });
}
