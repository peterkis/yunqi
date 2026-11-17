import { describe, expect, it } from 'vitest';
import { createAssessmentDto, createBirthComparisonDto, createLearningDto, createQuestionnaireDto } from '../../../test/learning-fixtures';
import { mapBirthComparison, mapLearning } from '../../yunqi/presentation/map-learning';
import { mapAssessment, mapConstitutionContext, mapQuestionnaire } from './map-constitution';

// Synthetic API responses test projection only; they are not scoring examples.
describe('constitution presentation', () => {
  it('projects five named options and hints without changing question text or applicability', () => {
    const dto = createQuestionnaireDto();
    const view = mapQuestionnaire({ ...dto, options: dto.options.map((option) => ({ ...option, label: `${option.label}（说明）` })) });
    expect(view.questions).toEqual(dto.questions);
    expect(view.options.map((option) => option.label)).toEqual(['没有', '很少', '有时', '经常', '总是']);
    expect(view.options.map((option) => option.description)).toEqual(['根本不', '有一点', '有些', '相当', '非常']);
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
    expect(view.results).toHaveLength(9);
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
    expect(view.matchedTypes).toEqual(matches.map(({ id, name }) => ({ id, name })));
  });

  it('keeps basically balanced with tendencies and never invents balanced when no type matches', () => {
    const dto = createAssessmentDto();
    const results = dto.results.map((result, index) => ({ ...result, status: index === 0 ? 'basically' as const : index === 1 ? 'tendency' as const : 'no' as const }));
    expect(mapAssessment(dto).decision).toBe('平和质');
    expect(mapAssessment({ ...dto, results, matchedTypes: [], tendencyTypes: ['qi_deficiency'] })).toMatchObject({ decision: '基本是平和质', matchedTypes: [], tendencyTypes: [{ id: 'qi_deficiency', name: '气虚质' }] });
    const empty = mapAssessment({ ...dto, matchedTypes: [], results: dto.results.map((result) => ({ ...result, status: 'no' })) });
    expect(empty.decision).toBe('未达明确类型');
    expect(empty.matchedTypes).toEqual([]);
    expect(empty.tendencyTypes).toEqual([]);
  });

  it('uses only the existing current snapshot and retains each birth candidate with canonical local time', () => {
    const current = mapLearning(createLearningDto());
    expect(mapConstitutionContext(current)).toEqual({ current: {
      summary: `${current.facts.summary.stemBranch.ganzhi} · ${current.facts.currentStep.name} · 客气${current.facts.currentStep.guestQi}`,
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
