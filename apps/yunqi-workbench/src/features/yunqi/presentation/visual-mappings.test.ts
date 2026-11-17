import { describe, expect, it } from 'vitest';
import { createLearningDto } from '../../../test/learning-fixtures';
import { mapLearning } from './map-learning';
import { mapMovementElement, mapQiElement, mapRelationTone } from './visual-mappings';

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
  ])('maps six-qi value %s without inspecting text fragments', (qi, expected) => expect(mapQiElement(qi)).toBe(expected));

  it.each([['木', 'wood'], ['火', 'fire'], ['土', 'earth'], ['金', 'metal'], ['水', 'water'], ['水运太过', undefined], ['__proto__', undefined]])(
    'maps movement element %s', (element, expected) => expect(mapMovementElement(element)).toBe(expected),
  );
});
