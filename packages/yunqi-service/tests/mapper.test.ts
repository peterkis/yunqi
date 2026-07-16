import {
  calculateYearYunQi,
  calculateYunQiByCalendarTime,
  createYunQiCalendarTime,
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

    expect(dto.ruleVersion).toBe('YQ-MVP-RULES-1.0.0');
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
  });
});
