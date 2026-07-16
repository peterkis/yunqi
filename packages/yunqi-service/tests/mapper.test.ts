import {
  calculateYearYunQi,
  calculateYunQi,
  createYunQiInstant,
} from '@yunqi/domain';
import { describe, expect, it } from 'vitest';
import {
  mapCalculationResult,
  mapYearResult,
} from '../src/mappers/yunqi-mapper.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('YunQi API mapper', () => {
  it('maps the annual Domain result into the stable nested DTO', () => {
    const domain = calculateYearYunQi(2024, fixedCalendarProvider);
    const dto = mapYearResult(domain);

    expect(dto.ruleVersion).toBe('V1.0-2026.7.7-implementation.1');
    expect(dto.year).toBe(2024);
    expect(dto.stemBranch).toEqual({
      ganzhi: '甲辰',
      stem: '甲',
      branch: '辰',
    });
    expect(dto.interval.start).toEqual(domain.start);
    expect(dto.sixQi.sitian).toBe('太阳寒水');
    expect(dto.sixQi.steps).toHaveLength(6);
    expect(dto.sixQi.steps).not.toBe(domain.steps);
    expect(dto.explanations).not.toBe(domain.explanations);
    expect(dto).not.toBe(domain);
  });

  it('maps dated results and copies currentStep', () => {
    const domain = calculateYunQi(
      createYunQiInstant(1_716_210_000_000),
      fixedCalendarProvider,
    );
    const dto = mapCalculationResult(domain);

    expect(dto.input).toEqual(domain.input);
    expect(dto.input).not.toBe(domain.input);
    expect(dto.currentStep).toEqual(dto.sixQi.steps[2]);
    expect(dto.currentStep).not.toBe(domain.currentStep);
  });
});
