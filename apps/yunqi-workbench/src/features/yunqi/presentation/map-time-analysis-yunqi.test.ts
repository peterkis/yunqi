import { describe, expect, expectTypeOf, it } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { mapTimeAnalysisYunQi } from './map-time-analysis-yunqi';
import type { TimeAnalysisYunQiViewModel } from './view-model';

describe('mapTimeAnalysisYunQi', () => {
  it('maps the selected-time DTO to a neutral exact six-stage model', () => {
    const dto = createYunQiCalculationDto();
    const result = mapTimeAnalysisYunQi(dto);

    expectTypeOf(result).toMatchTypeOf<TimeAnalysisYunQiViewModel>();
    expect(result.analysisTime).toEqual({
      localTime: '2026-06-19T12:00:00+08:00',
      standard: {
        code: 'BeijingStandardTime+08:00',
        label: '北京时间 UTC+08',
      },
    });
    expect(result.summary.year).toBe(dto.year);
    expect(result.stages).toHaveLength(6);
    expect(result.stages.map((stage) => stage.index)).toEqual(
      dto.sixQi.steps.map((stage) => stage.index),
    );
    expect(result.selectedStage).toBe(result.stages[2]);
    expect(result.selectedStage.index).toBe(dto.currentStep.index);
    expect(result.explanations).toEqual(dto.explanations);
    expect(result.ruleVersion).toBe(dto.ruleVersion);
    expect(result).not.toHaveProperty('currentStep');
    expect(result.stages[0]).not.toHaveProperty('status');
    expect(result.analysisTime).not.toHaveProperty(
      'epochMilliseconds',
    );
  });

  it('requires an exact selected API index in the returned tuple', () => {
    const dto = createYunQiCalculationDto();
    const invalid = {
      ...dto,
      currentStep: {
        ...dto.currentStep,
        index: 9,
      },
    };

    expect(() => mapTimeAnalysisYunQi(invalid)).toThrow(
      'Selected YunQi stage is missing from sixQi.steps',
    );
  });
});
