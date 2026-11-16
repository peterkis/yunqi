import { describe, expect, it } from 'vitest';
import { createBirthComparisonDto, createLearningDto } from '../../../test/learning-fixtures';
import { mapBirthComparison, mapLearning } from './map-learning';

describe('learning reading context', () => {
  it('labels historical birth-period excerpts separately without changing source content', () => {
    const dto = createBirthComparisonDto();
    const result = mapBirthComparison(dto);
    expect(result.candidates[0].learning.currentPassages[0].scopeLabel).toBe('出生阶段');
    expect(result.current.currentPassages[0].scopeLabel).toBe('当前阶段');
    expect(result.candidates[0].learning.currentPassages[0].quote).toBe(dto.candidates[0].learning.currentPassages[0].quote);
    expect(dto.candidates[0].learning.currentPassages[0].scope).toBe('qi-period');
  });

  it('keeps the current view and source URLs intact', () => {
    const dto = createLearningDto();
    const result = mapLearning(dto);
    expect(result.currentPassages[0].scopeLabel).toBe('当前阶段');
    expect(result.annualPassages[0].sourceUrl).toBe(dto.annualPassages[0].sourceUrl);
    expect(result.facts.inputTime.localTime).toBe(dto.facts.input.localTime);
  });
});
