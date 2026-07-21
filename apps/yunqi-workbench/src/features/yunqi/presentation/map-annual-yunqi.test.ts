import { expect, expectTypeOf, it } from 'vitest';
import { createYunQiYearDto } from '../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from './map-annual-yunqi';
import type {
  AnnualYunQiViewModel,
  SixQiStageTuple,
} from './view-model';

it('maps a neutral exact six-stage annual model', () => {
  const dto = createYunQiYearDto();
  const result = mapAnnualYunQi(dto);

  expectTypeOf(result.stages).toMatchTypeOf<SixQiStageTuple>();
  expectTypeOf(result).toMatchTypeOf<AnnualYunQiViewModel>();
  expect(result.stages).toHaveLength(6);
  expect(result.stages.map((step) => step.index)).toEqual(
    dto.sixQi.steps.map((step) => step.index),
  );
  expect(result.stages[0]).not.toHaveProperty('status');
  expect(result).not.toHaveProperty('currentStep');
  expect(result).not.toHaveProperty('inputTime');
  expect(result.stages[0].start).not.toHaveProperty(
    'epochMilliseconds',
  );
});
