import {
  calculateLearning,
  calculateYearYunQi,
  calculateYunQiByCalendarTime,
  createYunQiCalendarTime,
} from '@yunqi/domain';
import { describe, expect, it } from 'vitest';
import {
  mapCalculationResult,
  mapYearResult,
} from '../src/mappers/yunqi-mapper.js';
import { mapLearning } from '../src/services/learning-service.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('YunQi API mapper', () => {
  it('maps the annual Domain result into the stable nested DTO', () => {
    const domain = calculateYearYunQi(2024, fixedCalendarProvider);
    const dto = mapYearResult(domain);

    expect(dto.ruleVersion).toBe('YQ-MVP-RULES-1.1.0');
    expect(dto.year).toBe(2024);
    expect(dto.stemBranch).toEqual({
      ganzhi: '甲辰',
      stem: '甲',
      branch: '辰',
    });
    expect(dto.interval.start).toEqual({
      localTime: '2024-01-20T22:07:22+08:00',
      epochMilliseconds: domain.start.epochMilliseconds,
      offset: '+08:00',
      calendarTimeStandard: 'BeijingStandardTime+08:00',
    });
    expect(dto.sixQi.sitian).toBe('太阳寒水');
    expect(dto.sixQi.steps).toHaveLength(6);
    expect(dto.sixQi.steps).not.toBe(domain.steps);
    expect(dto.sixQi.steps.map((step) => [step.startTerm, step.endTerm])).toEqual([
      ['大寒', '春分'], ['春分', '小满'], ['小满', '大暑'],
      ['大暑', '秋分'], ['秋分', '小雪'], ['小雪', '大寒'],
    ]);
    expect(dto).not.toHaveProperty('currentStepProgress');
    expect(dto.explanations).not.toBe(domain.explanations);
    expect(dto).not.toBe(domain);
  });

  it('maps dated results and copies currentStep', () => {
    const domain = calculateYunQiByCalendarTime(
      createYunQiCalendarTime({
        year: 2024,
        month: 5,
        day: 20,
        hour: 21,
        minute: 0,
        second: 0,
        millisecond: 0,
      }),
      fixedCalendarProvider,
    );
    const dto = mapCalculationResult(domain);

    expect(dto.input).toEqual({
      localTime: '2024-05-20T21:00:00+08:00',
      epochMilliseconds: 1_716_210_000_000,
      offset: '+08:00',
      calendarTimeStandard: 'BeijingStandardTime+08:00',
    });
    expect(dto.input).not.toBe(domain.input);
    expect(dto.currentStep).toEqual(dto.sixQi.steps[2]);
    expect(dto.currentStep).not.toBe(domain.currentStep);
    expect(dto.currentStepProgress).toEqual(domain.currentStepProgress);
    expect(dto.currentStepProgress).not.toBe(domain.currentStepProgress);
  });

  it('copies supplied Domain progress, movement relations and labels without recomputing business facts', () => {
    const domain = calculateLearning(createYunQiCalendarTime({
      year: 2026, month: 11, day: 18, hour: 8, minute: 44, second: 0, millisecond: 0,
    }), fixedCalendarProvider);
    const supplied = {
      ...domain,
      facts: { ...domain.facts, currentStepProgress: { elapsedRatio: 0.123, remainingCalendarDays: 7, endsOnInputDate: false } },
      currentMovement: { ...domain.currentMovement, startLabel: 'Domain起点', endLabel: 'Domain终点' },
      currentMovementProgress: { elapsedRatio: 0.456, remainingCalendarDays: 8, endsOnInputDate: false },
    };
    const dto = mapLearning(supplied);
    expect(dto.facts.currentStepProgress).toEqual(supplied.facts.currentStepProgress);
    expect(dto.currentMovementProgress).toEqual(supplied.currentMovementProgress);
    expect(dto.currentMovementProgress).not.toBe(supplied.currentMovementProgress);
    expect(dto.currentMovement.startLabel).toBe('Domain起点');
    expect(dto.currentMovement.endLabel).toBe('Domain终点');
    expect(dto.currentMovement.relation).toEqual(domain.currentMovement.relation);
    expect(dto.currentMovement.relation).not.toBe(domain.currentMovement.relation);
    for (const [index, movement] of dto.movements.entries()) {
      expect(movement.relation).toEqual(domain.movements[index]?.relation);
      expect(movement.relation).not.toBe(domain.movements[index]?.relation);
    }
  });
});
