import { describe, expect, it } from 'vitest';
import { createBirthComparisonDto, createLearningDto } from '../../../test/learning-fixtures';
import { mapBirthComparison, mapLearning } from './map-learning';

describe('learning reading context', () => {
  it('does not synthesize a movement relation or its placeholder from host and guest values', () => {
    const result = mapLearning(createLearningDto());
    for (const movement of [result.currentMovement, ...result.movements]) {
      expect(movement).not.toHaveProperty('relationStatus');
      expect(movement).not.toHaveProperty('relation');
    }
  });

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

it('prepares unquoted excerpts and full reading without altering raw source text or explanations', () => {
  const dto = createLearningDto();
  const longText = '原典中的连续文字与病候语境。'.repeat(10);
  const annualPassage = { ...dto.annualPassages[0], quote: `“${longText}”` };
  const mapped = mapLearning({ ...dto, annualPassages: [annualPassage], currentPassages: [{ ...dto.currentPassages[0], scope: 'unrecognized' }] });
  const passage = mapped.annualPassages[0];
  expect(passage.quote).toBe(annualPassage.quote);
  expect(passage.displayQuote).toBe(longText);
  expect(passage.fullQuote).toBe(longText);
  expect(passage.previewQuote.endsWith('……')).toBe(true);
  expect(longText.startsWith(passage.previewQuote.slice(0, -2))).toBe(true);
  expect(passage.explanation).toBe(annualPassage.explanation);
  expect(passage.source).toContain('《素问·六元正纪大论》');
  expect(mapped.currentPassages[0].scopeLabel).toBe('经典学习');
  expect(mapped.currentPassages[0].fullQuote).toBeUndefined();
  expect(mapped.currentMovement.hostElement).toBe('fire');
  expect(mapped.currentMovement.guestElement).toBe('wood');
});
