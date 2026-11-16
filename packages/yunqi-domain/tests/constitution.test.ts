import { describe, expect, it } from 'vitest';
import {
  CONSTITUTION_QUESTIONNAIRE_ID,
  evaluateConstitution,
  getConstitutionQuestionnaire,
  type ConstitutionAssessmentInput,
  type ConstitutionSex,
} from '../src/constitution/index.js';

function answersFor(sex: ConstitutionSex = 'female'): Record<string, number> {
  const answers = Object.fromEntries(getConstitutionQuestionnaire().questions
    .filter((question) => question.sex === 'all' || question.sex === sex)
    .map((question) => [question.id, 1]));
  answers.energy = 5;
  return answers;
}

function assess(answers: Record<string, number>, sex: ConstitutionSex = 'female') {
  return evaluateConstitution({ questionnaireId: CONSTITUTION_QUESTIONNAIRE_ID, sex, answers });
}

describe('GB/T 46939-2025 questionnaire and scoring', () => {
  it('identifies the final standard and the applicable 26 questions without a default answer', () => {
    const questionnaire = getConstitutionQuestionnaire();
    expect(questionnaire.standard).toBe('GB/T 46939-2025');
    expect(questionnaire.questions).toHaveLength(27);
    expect(new Set(questionnaire.questions.map((question) => question.id)).size).toBe(27);
    expect(Object.keys(answersFor('female'))).toHaveLength(26);
    expect(Object.keys(answersFor('male'))).toHaveLength(26);
    expect(questionnaire.scales.map((scale) => scale.name)).toEqual([
      '平和质', '气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质',
    ]);
    expect(questionnaire.questions.find((question) => question.id === 'yellow_discharge')?.sex).toBe('female');
    expect(questionnaire.questions.find((question) => question.id === 'damp_scrotum')?.sex).toBe('male');
  });

  it('keeps only the three final-standard reverse items in the balanced scale', () => {
    const questionnaire = getConstitutionQuestionnaire();
    expect(questionnaire.scales.flatMap((scale) => scale.items.filter((item) => item.reverse)
      .map((item) => [scale.id, item.questionId]))).toEqual([
      ['balanced', 'fatigue'], ['balanced', 'low_mood'], ['balanced', 'cold_intolerance'],
    ]);
  });

  it('scores the independently hand-calculated all-negative profile as balanced', () => {
    const result = assess(answersFor());
    expect(result.results[0]).toMatchObject({ id: 'balanced', itemCount: 4, rawScore: 20, score: 100, status: 'yes' });
    expect(result.results.slice(1).map((item) => [item.rawScore, item.itemCount, item.score, item.status]))
      .toEqual([[3, 3, 0, 'no'], [3, 3, 0, 'no'], [3, 3, 0, 'no'], [3, 3, 0, 'no'],
        [3, 3, 0, 'no'], [3, 3, 0, 'no'], [3, 3, 0, 'no'], [4, 4, 0, 'no']]);
    expect(result.matchedTypes).toEqual(['balanced']);
    expect(result.tendencyTypes).toEqual([]);
    expect(result.summary).toBe('量表判定：平和质。');
  });

  it.each([
    ['fatigue', 'qi_deficiency'],
    ['low_mood', 'qi_stagnation'],
    ['cold_intolerance', 'yang_deficiency'],
  ])('uses shared %s in opposite directions without changing its answer', (questionId, scaleId) => {
    const answers = answersFor();
    answers[questionId] = 5;
    const result = assess(answers);
    expect(result.results[0]).toMatchObject({ rawScore: 16, score: 75, status: 'basically' });
    expect(result.results.find((item) => item.id === scaleId)).toMatchObject({ rawScore: 7, score: 100 / 3, status: 'tendency' });
    expect(answers[questionId]).toBe(5);
    expect(result.tendencyTypes).toEqual([scaleId]);
    expect(result.summary).toContain('基本是平和质');
  });

  it('does not declare balanced when any biased scale exceeds the 40 threshold', () => {
    const answers = { ...answersFor(), fatigue: 5, short_breath: 2 };
    const result = assess(answers);
    expect(result.results[0]).toMatchObject({ score: 75, status: 'no' });
    expect(result.results[1]).toMatchObject({ rawScore: 8, score: 125 / 3, status: 'yes' });
    expect(result.matchedTypes).toEqual(['qi_deficiency']);
    expect(result.summary).toBe('量表判定：气虚质。');
  });

  it('retains compatible types and ties instead of selecting only the highest score', () => {
    const answers = { ...answersFor(), body_heat: 3, dry_skin_lips: 3, flushed_cheeks: 3,
      body_heaviness: 3, soft_abdomen: 3, sticky_mouth: 3 };
    const result = assess(answers);
    expect(result.matchedTypes).toEqual(['yin_deficiency', 'phlegm_dampness']);
    expect(result.results.filter((item) => item.status === 'yes').map((item) => item.score)).toEqual([50, 50]);
    expect(result.summary).toBe('量表判定：阴虚质、痰湿质（兼夹）。');
  });

  it('returns no definite type when balanced is below 60 even if other scores are low', () => {
    const result = assess({ ...answersFor(), energy: 1, fatigue: 2, low_mood: 2, cold_intolerance: 2 });
    expect(result.results[0]).toMatchObject({ rawScore: 13, score: 56.25, status: 'no' });
    expect(result.matchedTypes).toEqual([]);
    expect(result.tendencyTypes).toEqual([]);
    expect(result.summary).toBe('本次量表未达到明确类型判定条件。');
  });

  it('preserves a tendency when no definite type is reached', () => {
    const result = assess({ ...answersFor(), energy: 1, fatigue: 5 });
    expect(result.results[0]).toMatchObject({ rawScore: 12, score: 50, status: 'no' });
    expect(result.matchedTypes).toEqual([]);
    expect(result.tendencyTypes).toEqual(['qi_deficiency']);
    expect(result.summary).toContain('存在气虚质倾向');
  });

  it.each([
    [4, 1, 1, 1, 18.75, 'no'],
    [5, 1, 1, 1, 25, 'no'],
    [5, 2, 1, 1, 31.25, 'tendency'],
    [5, 3, 1, 1, 37.5, 'tendency'],
    [5, 4, 1, 1, 43.75, 'yes'],
  ])('uses unrounded converted scores around 30 and 40 (%s/%s/%s/%s)',
    (sneezing, allergy, urticaria, scratch_marks, score, status) => {
      const result = assess({ ...answersFor(), sneezing, allergy, urticaria, scratch_marks });
      expect(result.results[8]).toMatchObject({ score, status });
    });

  it.each([
    [1, 1, 1, 75, 'yes'],
    [2, 2, 1, 62.5, 'yes'],
    [2, 2, 2, 56.25, 'no'],
  ])('keeps the 60 boundary distinct from rounded display values', (fatigue, low_mood, cold_intolerance, score, status) => {
    const result = assess({ ...answersFor(), energy: 1, fatigue, low_mood, cold_intolerance });
    expect(result.results[0]).toMatchObject({ score, status });
  });

  it.each(['male', 'female'] as const)('uses the actual three-item damp-heat denominator for %s', (sex) => {
    const sexQuestionId = sex === 'male' ? 'damp_scrotum' : 'yellow_discharge';
    const result = assess({ ...answersFor(sex), oily_face: 3, dark_urine: 3, [sexQuestionId]: 3 }, sex);
    expect(result.results[5]).toMatchObject({ itemCount: 3, rawScore: 9, score: 50, status: 'yes' });
    expect(result.results[0].status).toBe('no');
  });

  it('computes the complete opposite profile without score overflow', () => {
    const answers = Object.fromEntries(Object.keys(answersFor()).map((id) => [id, 5]));
    answers.energy = 1;
    const result = assess(answers);
    expect(result.results[0]).toMatchObject({ rawScore: 4, score: 0, status: 'no' });
    expect(result.results.slice(1).every((item) => item.score === 100 && item.status === 'yes')).toBe(true);
    expect(result.matchedTypes).toHaveLength(8);
  });

  it('rejects each missing applicable answer instead of silently filling a default', () => {
    for (const id of Object.keys(answersFor())) {
      const answers = answersFor();
      delete answers[id];
      expect(() => assess(answers), id).toThrow(/完成所有适用题目/);
    }
  });

  it.each([0, 6, 2.5, NaN, Infinity, -1, '1', null, undefined])('rejects invalid answer %s', (invalid) => {
    const answers = { ...answersFor(), fatigue: invalid } as Record<string, number>;
    expect(() => assess(answers)).toThrow(/1至5/);
  });

  it('rejects obsolete versions, unknown questions, and the inapplicable sex-specific answer', () => {
    expect(() => evaluateConstitution({ questionnaireId: 'ZYYXH/T157-2009', sex: 'female', answers: answersFor() })).toThrow(/版本不匹配/);
    expect(() => assess({ ...answersFor(), invented_question: 1 })).toThrow(/未知题目/);
    expect(() => assess({ ...answersFor(), damp_scrotum: 1 })).toThrow(/不适用/);
    expect(() => assess(answersFor('male'), 'female')).toThrow(/不适用/);
  });

  it.each(['unspecified', '', undefined, null])('requires an explicit sex selection (%s)', (sex) => {
    const input = { questionnaireId: CONSTITUTION_QUESTIONNAIRE_ID, sex, answers: answersFor() } as ConstitutionAssessmentInput;
    expect(() => evaluateConstitution(input)).toThrow(/请选择/);
  });

  it.each([null, undefined, [], 1, 'answers'])('rejects non-object submissions', (input) => {
    expect(() => evaluateConstitution(input as unknown as ConstitutionAssessmentInput)).toThrow(RangeError);
  });

  it.each([null, undefined, [], 1, 'answers'])('rejects non-object answer collections', (answers) => {
    const input = { questionnaireId: CONSTITUTION_QUESTIONNAIRE_ID, sex: 'female', answers } as unknown as ConstitutionAssessmentInput;
    expect(() => evaluateConstitution(input)).toThrow(/答案格式/);
  });

  it('requires own answers and never treats inherited values as completed responses', () => {
    expect(() => assess(Object.create(answersFor()))).toThrow(/完成所有适用题目/);
  });

  it('prevents callers from changing the shared questionnaire or previously returned results', () => {
    const questionnaire = getConstitutionQuestionnaire();
    expect(Object.isFrozen(questionnaire)).toBe(true);
    expect(questionnaire.questions.every(Object.isFrozen)).toBe(true);
    expect(questionnaire.options.every(Object.isFrozen)).toBe(true);
    expect(questionnaire.scales.every((scale) => Object.isFrozen(scale) && scale.items.every(Object.isFrozen))).toBe(true);
    expect(() => Reflect.set(questionnaire.questions[0], 'text', 'changed')).not.toThrow();
    expect(questionnaire.questions[0].text).toBe('您精力充沛吗？');
    const result = assess(answersFor());
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.results.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(result.matchedTypes)).toBe(true);
  });
});
