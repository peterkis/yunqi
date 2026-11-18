import { describe, expect, it } from 'vitest';
import { createAssessmentDto, createBirthComparisonDto, createLearningDto, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { mapBirthComparison, mapLearning } from '../../yunqi/presentation/map-learning';
import { mapAssessment, mapConstitutionContext, mapQuestionnaire, mapQuestionnaireProgress } from './map-constitution';

// Synthetic API responses test projection only; they are not scoring examples.
describe('constitution presentation', () => {
  it('projects five named options and hints without changing question text or applicability', () => {
    const dto = createQuestionnaireDto();
    const view = mapQuestionnaire({ ...dto, options: dto.options.map((option) => ({ ...option, label: `${option.label}（说明）` })) });
    expect(view.questions).toEqual(dto.questions);
    expect(view.options.map((option) => option.label)).toEqual(['没有', '很少', '有时', '经常', '总是']);
    expect(view.options.map((option) => option.description)).toEqual(['根本不', '有一点', '有些', '相当', '非常']);
    expect(view.scales.map((scale) => scale.id)).toEqual(dto.scales.map((scale) => scale.id));
    expect(view.scales.map((scale) => scale.shortName)).toEqual(['平和', '气虚', '阳虚', '阴虚', '痰湿', '湿热', '血瘀', '气郁', '特禀']);
    expect(view.scales.map((scale) => scale.questionIds)).toEqual(dto.scales.map((scale) => scale.items.map((item) => item.questionId)));
  });

  it('counts shared answers in every membership and highlights every dimension of the current question', () => {
    const questionnaire = mapQuestionnaire(createQuestionnaireDto());
    const initial = mapQuestionnaireProgress(questionnaire, 'male', {}, 'q1');
    expect(initial).toMatchObject({ completed: 0, total: 8, label: '已答 0 / 8 题，当前第 1 题' });
    expect(initial.dimensions.filter((dimension) => dimension.current).map((dimension) => dimension.id)).toEqual(['balanced', 'qi_deficiency']);
    expect(initial.dimensions.every((dimension) => !dimension.answered)).toBe(true);
    const progress = mapQuestionnaireProgress(questionnaire, 'male', { q1: 1, q2: 5, q8f: 3, unrelated: 2 }, 'q2');
    expect(progress.completed).toBe(2);
    expect(progress.dimensions[0]).toMatchObject({ current: true, answered: true, count: '✓', fillWidth: '100%', label: '平和质：2/2，全部答完，当前题所属维度' });
    expect(progress.dimensions[1]).toMatchObject({ current: false, answered: true, count: '1/2', fillWidth: '50%' });
    expect(progress.dimensions[2]).toMatchObject({ current: true, answered: true, count: '1/2' });
    expect(progress.dimensions[5]).toMatchObject({ current: false, answered: false, count: '0/2', fillWidth: '0%' });
    expect(progress.dimensions[8].count).toBe('0/1');
  });

  it.each(['male', 'female'] as const)('uses only %s applicable items as denominators and marks completed dimensions', (sex) => {
    const questionnaire = mapQuestionnaire(createQuestionnaireDto());
    const answers = Object.fromEntries(questionnaire.questions.map((question) => [question.id, 3]));
    const progress = mapQuestionnaireProgress(questionnaire, sex, answers);
    expect(progress).toMatchObject({ completed: 8, total: 8, label: '已答 8 / 8 题，全部作答完成' });
    expect(progress.dimensions.every((dimension) => dimension.count === '✓' && dimension.fillWidth === '100%' && !dimension.current)).toBe(true);
    const empty = mapQuestionnaireProgress({ ...questionnaire, scales: [{ id: 'empty', name: '无适用题', shortName: '空', questionIds: ['unrelated'] }] }, sex, answers);
    expect(empty.dimensions[0]).toMatchObject({ count: '0/0', fillWidth: '0%', current: false, answered: false });
  });

  it('preserves all nine independent statuses, coexisting matches and tendencies without classifying the score', () => {
    const dto = createAssessmentDto();
    const results = dto.results.map((result, index) => ({ ...result, score: index === 1 ? 1 : 99,
      status: index === 1 || index === 4 ? 'yes' as const : index === 2 ? 'tendency' as const : 'no' as const,
      label: index === 1 || index === 4 ? '是' : index === 2 ? '倾向是' : '否' }));
    const view = mapAssessment({ ...dto, results, matchedTypes: ['qi_deficiency', 'phlegm_dampness'], tendencyTypes: ['yang_deficiency'] });
    expect(view.decision).toBe('偏颇质兼夹');
    expect(view.matchedTypes.map((type) => type.name)).toEqual(['气虚质', '痰湿质']);
    expect(view.tendencyTypes.map((type) => type.name)).toEqual(['阳虚质']);
    expect(view.referenceSummary).toBe('气虚、痰湿 · 倾向阳虚');
    expect(view.results).toHaveLength(9);
    expect(view.results.map((result) => result.id)).toEqual(dto.results.map((result) => result.id));
    expect(view.results.map((result) => result.shortName)).toEqual(['平和', '气虚', '阳虚', '阴虚', '痰湿', '湿热', '血瘀', '气郁', '特禀']);
    expect(view.results.map((result) => result.score)).toEqual(results.map((result) => result.score));
    expect(view.results.map((result) => result.tone)).toEqual(['neutral', 'primary', 'secondary', 'neutral', 'primary', ...Array(4).fill('neutral')]);
    expect(view.results[1].fillWidth).toBe('1%');
    expect(view.results[1].chartLabel).toBe('气虚质，转化分 1.0 分（满分100），判定是；参考刻度30与40；原始分3，3个条目。');
    expect(view.summary).toBe(dto.summary);
    expect(view.boundaryNote).toBe(dto.boundaryNote);
  });

  it.each([1, 2, 7])('summarizes %i biased matches without choosing a leading score or reordering the DTO lists', (count) => {
    const dto = createAssessmentDto();
    const matches = dto.results.slice(1, count + 1);
    const results = dto.results.map((result, index) => ({ ...result, score: index * 10, status: matches.some((match) => match.id === result.id) ? 'yes' as const : 'no' as const }));
    const view = mapAssessment({ ...dto, results: [...results].reverse(), matchedTypes: matches.map((result) => result.id) });
    expect(view.decision).toBe(count === 1 ? '气虚质' : '偏颇质兼夹');
    expect(view.matchedTypes).toEqual(matches.map(({ id, name }) => ({ id, name, shortName: name.replace(/质$/, '') })));
    expect(view.results.map((result) => result.id)).toEqual([...results].reverse().map((result) => result.id));
  });

  it('keeps basically balanced with tendencies and never invents balanced when no type matches', () => {
    const dto = createAssessmentDto();
    const results = dto.results.map((result, index) => ({ ...result, status: index === 0 ? 'basically' as const : index === 1 ? 'tendency' as const : 'no' as const }));
    expect(mapAssessment(dto).decision).toBe('平和质');
    const basically = mapAssessment({ ...dto, results, matchedTypes: [], tendencyTypes: ['qi_deficiency'] });
    expect(basically).toMatchObject({ decision: '基本是平和质', referenceSummary: '倾向气虚', matchedTypes: [], tendencyTypes: [{ id: 'qi_deficiency', name: '气虚质', shortName: '气虚' }] });
    expect(basically.results[0].tone).toBe('neutral');
    expect(mapAssessment({ ...dto, results: results.filter((result) => result.id !== 'balanced'), matchedTypes: [], tendencyTypes: ['qi_deficiency'] }).decision).toBe('未达明确类型');
    const empty = mapAssessment({ ...dto, matchedTypes: [], results: dto.results.map((result) => ({ ...result, status: 'no' })) });
    expect(empty.decision).toBe('未达明确类型');
    expect(empty.matchedTypes).toEqual([]);
    expect(empty.tendencyTypes).toEqual([]);
    expect(empty.referenceSummary).toBe('未达明确类型');
  });

  it('uses only the existing current snapshot and retains each birth candidate with canonical local time', () => {
    const current = mapLearning(createLearningDto());
    expect(mapConstitutionContext(current)).toEqual({ current: {
      summary: `${current.facts.summary.stemBranch.ganzhi} · ${current.facts.currentStep.name} · 客气${current.facts.currentStep.guestQi}`,
      element: current.facts.currentStep.guestElement,
      yearSummary: `${current.facts.summary.stemBranch.ganzhi} · ${current.facts.summary.suiYun.element}运${current.facts.summary.suiYun.state}`,
      yearElement: current.facts.annualElements.suiYun,
      guestQiSummary: `${current.facts.currentStep.name} · 客气${current.facts.currentStep.guestQi}`,
      detail: `${current.facts.summary.suiYun.element}运${current.facts.summary.suiYun.state} · 司天${current.facts.summary.sitian} · 在泉${current.facts.summary.zaiquan}`,
      qiDetail: `${current.facts.currentStep.name} · 主气${current.facts.currentStep.hostQi} · 客气${current.facts.currentStep.guestQi}`,
      movementDetail: `${current.currentMovement.name} · 主运${current.currentMovement.hostLabel} · 客运${current.currentMovement.guestLabel}`,
      time: current.facts.inputTime,
      ruleVersion: current.facts.ruleVersion,
      learningRuleVersion: current.ruleVersion,
      contractId: current.facts.contractId,
    } });
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const context = mapConstitutionContext(comparison.current, { ...comparison, ambiguous: true, candidates: [...comparison.candidates, { ...comparison.candidates[0], label: '候选二' }] });
    expect(context.birth?.candidates).toHaveLength(2);
    expect(context.birth?.candidates[1]).toMatchObject({ label: '候选二', from: comparison.candidates[0].from, until: comparison.candidates[0].until });
    expect(context.current.time.localTime).toBe(comparison.current.facts.inputTime.localTime);
  });
});
