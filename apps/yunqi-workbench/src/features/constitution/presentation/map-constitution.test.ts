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
    const results = dto.results.map((result, index) => ({ ...result, score: index === 0 ? 1 : 99, status: index < 2 ? 'yes' as const : index === 2 ? 'tendency' as const : 'no' as const }));
    const view = mapAssessment({ ...dto, results });
    expect(view.decision).toBe('平和质、气虚质');
    expect(view.companions).toBe('兼夹：平和质、气虚质；倾向：阳虚质');
    expect(view.results).toHaveLength(9);
    expect(view.results.map((result) => result.score)).toEqual(results.map((result) => result.score));
    expect(view.results.map((result) => result.tone)).toEqual(['primary', 'primary', 'secondary', ...Array(6).fill('neutral')]);
    expect(view.results[0].fillWidth).toBe('1%');
    expect(view.results[0].chartLabel).toBe('平和质，转化分 1.0 分（满分100），判定是；参考刻度30与40；原始分3，3个条目。');
    expect(view.boundaryNote).not.toMatch(/风险|预测|高危|易患/);
  });

  it('keeps basically balanced with tendencies and never invents balanced when no type matches', () => {
    const dto = createAssessmentDto();
    const results = dto.results.map((result, index) => ({ ...result, status: index === 0 ? 'basically' as const : index === 1 ? 'tendency' as const : 'no' as const }));
    expect(mapAssessment({ ...dto, results })).toMatchObject({ decision: '基本是平和质', companions: '倾向：气虚质' });
    const empty = mapAssessment({ ...dto, results: dto.results.map((result) => ({ ...result, status: 'no' })) });
    expect(empty.decision).toBe('未达明确类型');
    expect(empty.companions).toBe('');
  });

  it('uses only the existing current snapshot and retains each birth candidate with canonical local time', () => {
    const current = mapLearning(createLearningDto());
    expect(mapConstitutionContext(current)).toEqual({ current: {
      summary: `${current.facts.summary.stemBranch.ganzhi} · ${current.facts.currentStep.name} · 客气${current.facts.currentStep.guestQi}`,
      detail: `${current.facts.summary.suiYun.element}运${current.facts.summary.suiYun.state} · 司天${current.facts.summary.sitian} · 在泉${current.facts.summary.zaiquan}`,
      qiDetail: `${current.facts.currentStep.name} · 主气${current.facts.currentStep.hostQi} · 客气${current.facts.currentStep.guestQi}`,
      movementDetail: `${current.currentMovement.name} · 主运${current.currentMovement.hostLabel} · 客运${current.currentMovement.guestLabel}`,
      time: current.facts.inputTime,
    } });
    const comparison = mapBirthComparison(createBirthComparisonDto());
    const context = mapConstitutionContext(comparison.current, { ...comparison, ambiguous: true, candidates: [...comparison.candidates, { ...comparison.candidates[0], label: '候选二' }] });
    expect(context.birth?.candidates).toHaveLength(2);
    expect(context.birth?.candidates[1]).toMatchObject({ label: '候选二', from: comparison.candidates[0].from, until: comparison.candidates[0].until });
    expect(context.current.time.localTime).toBe(comparison.current.facts.inputTime.localTime);
  });
});
