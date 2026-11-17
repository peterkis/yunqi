import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from './map-learning';
import { mapPanelSummary } from './panel-summary';

describe('mapPanelSummary', () => {
  it('copies the visible annual summary without inventing current-stage facts', () => {
    const learning = mapLearning(createLearningDto());
    const summary = mapPanelSummary(learning.facts.summary);
    expect(summary.ganzhi).toBe(learning.facts.summary.stemBranch.ganzhi);
    expect(summary.annual).toBe(`${learning.facts.summary.suiYun.element}运${learning.facts.summary.suiYun.state} · ${learning.facts.summary.sitian}司天 · ${learning.facts.summary.zaiquan}在泉`);
    expect(summary.stage).toBeUndefined();
    expect(summary.relation).toBeUndefined();
  });

  it.each([['相得', 'favorable'], ['不和', 'adverse'], ['同五行', 'neutral'], ['顺 · 客胜主', 'favorable'], ['逆 · 臣位君', 'adverse'], ['未知', 'neutral']])('retains the API term %s and its explanation with only a visual tone', (label, tone) => {
    const dto = createLearningDto();
    const learning = mapLearning({ ...dto, currentQi: { ...dto.currentQi, label } });
    const summary = mapPanelSummary(learning.facts.summary, {
      step: learning.facts.currentStep, relation: learning.currentQi,
    });
    expect(summary.stage).toBe(`${learning.facts.currentStep.name} · 客气${learning.facts.currentStep.guestQi}`);
    expect(summary.relation).toEqual({ label, tone, explanation: learning.currentQi.explanation });
  });
});
