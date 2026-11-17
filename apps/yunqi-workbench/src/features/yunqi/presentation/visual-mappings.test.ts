import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { createYunQiYearDto } from '../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from './map-annual-yunqi';
import { mapDrilldownStage, mapDrilldownSummary } from './map-drilldown';
import { mapLearning } from './map-learning';
import { mapMovementElement, mapQiElement, mapRelationDirection, mapRelationTone } from './visual-mappings';

describe('API visual classifications', () => {
  it.each([
    ['顺', 'favorable'], ['从', 'favorable'], ['相得', 'favorable'], ['顺化', 'favorable'], ['相生', 'favorable'],
    ['顺 · 君位臣', 'favorable'], ['顺 · 客胜主', 'favorable'], ['从 · 顺', 'favorable'], ['相生 · 相得', 'favorable'],
    ['出生生当前', 'favorable'], ['当前生出生', 'favorable'],
    ['逆', 'adverse'], ['不和', 'adverse'], ['天刑', 'adverse'], ['小逆', 'adverse'], ['相克', 'adverse'],
    ['逆 · 臣位君', 'adverse'], ['逆 · 主胜客', 'adverse'], ['出生克当前', 'adverse'], ['当前克出生', 'adverse'],
    ['同五行', 'neutral'], ['天符', 'neutral'], ['同属', 'neutral'], ['同气', 'neutral'], ['同一六气', 'neutral'], ['不同六气，同五行', 'neutral'],
    ['未知关系', 'neutral'], ['顺 · 未知', 'neutral'], ['不和（自由说明）', 'neutral'], ['', 'neutral'], ['constructor', 'neutral'], ['__proto__', 'neutral'],
  ])('maps the exact API label %s to %s', (label, expected) => {
    const dto = createLearningDto();
    const mapped = mapLearning({ ...dto, currentQi: { ...dto.currentQi, label, explanation: '此说明包含顺、逆、相生，不用于分类。' } });
    expect(mapped.currentQi.tone).toBe(expected);
    expect(mapped.currentQi.label).toBe(label);
    expect(mapRelationTone(label)).toBe(expected);
  });

  it.each([
    ['厥阴风木', 'wood'], ['少阴君火', 'fire'], ['少阳相火', 'fire'],
    ['太阴湿土', 'earth'], ['阳明燥金', 'metal'], ['太阳寒水', 'water'],
    ['未知火气', undefined], ['constructor', undefined],
    ['__proto__', undefined], ['', undefined],
  ])('shares six-qi classification for %s across current and drilldown views', (qi, expected) => {
    expect(mapQiElement(qi)).toBe(expected);
    const dto = createLearningDto();
    const sixQi = { ...dto.facts.sixQi };
    Reflect.set(sixQi, 'sitian', qi);
    Reflect.set(sixQi, 'zaiquan', qi);
    const current = mapLearning({ ...dto, facts: { ...dto.facts, sixQi } }).facts;
    expect(current.annualElements.sitian).toBe(expected);
    expect(current.annualElements.zaiquan).toBe(expected);
    const stage = { ...current.currentStep };
    Reflect.set(stage, 'hostQi', qi);
    Reflect.set(stage, 'guestQi', qi);
    const drilldown = mapDrilldownStage(stage);
    expect(drilldown.hostElement).toBe(expected);
    expect(drilldown.guestElement).toBe(expected);
    const summary = mapDrilldownSummary(current.summary);
    expect(summary.sitianElement).toBe(expected);
    expect(summary.zaiquanElement).toBe(expected);
  });

  it.each([['木', 'wood'], ['火', 'fire'], ['土', 'earth'], ['金', 'metal'], ['水', 'water'], ['水运太过', undefined], ['__proto__', undefined], ['constructor', undefined], ['', undefined]])(
    'shares movement classification for %s across current and drilldown views', (element, expected) => {
      expect(mapMovementElement(element)).toBe(expected);
      const dto = createLearningDto();
      const suiYun = { ...dto.facts.suiYun };
      Reflect.set(suiYun, 'element', element);
      const current = mapLearning({ ...dto, facts: { ...dto.facts, suiYun } }).facts;
      expect(current.annualElements.suiYun).toBe(expected);
      expect(mapDrilldownSummary(current.summary).movementElement).toBe(expected);
    },
  );

  it.each([
    ['NONE', 'neutral', null],
    ['HOST_GENERATES_GUEST', 'favorable', '主气生客气'],
    ['GUEST_GENERATES_HOST', 'favorable', '客气生主气'],
    ['HOST_CONTROLS_GUEST', 'adverse', '主气克客气'],
    ['GUEST_CONTROLS_HOST', 'adverse', '客气克主气'],
    ['FUTURE_DIRECTION', 'neutral', null], ['constructor', 'neutral', null], ['__proto__', 'neutral', null], ['', 'neutral', null],
  ])('classifies the contract direction %s independently of descriptive text', (code, tone, verb) => {
    expect(mapRelationDirection(code)).toEqual({ tone, verb });
    const stage = mapAnnualYunQi(createYunQiYearDto()).stages[0];
    Reflect.set(stage.relation.direction, 'code', code);
    Reflect.set(stage.relation.direction, 'label', '自由文字，不用于语气分类');
    const display = mapDrilldownStage(stage);
    expect(display.relationTone).toBe(tone);
    expect(display.relationExplanation).toBe(verb
      ? `${verb}；主气为${stage.hostQi}，客气为${stage.guestQi}。`
      : `主气为${stage.hostQi}，客气为${stage.guestQi}；同五行。`);
  });
});
