import { describe, expect, it } from 'vitest';
import { createYunQiCalculationDto } from '../../../test/yunqi-fixtures';
import { mapCurrentYunQi } from './map-current-yunqi';

describe('mapCurrentYunQi', () => {
  it('maps the frozen DTO into a summary-first presentation model', () => {
    const result = mapCurrentYunQi(createYunQiCalculationDto());

    expect(result).toMatchObject({
      inputTime: {
        localTime: '2026-06-19T12:00:00+08:00',
        standard: {
          code: 'BeijingStandardTime+08:00',
          label: '北京时间 UTC+08',
        },
      },
      summary: {
        year: 2026,
        stemBranch: {
          ganzhi: '丙午',
          stem: '丙',
          branch: '午',
        },
        suiYun: {
          element: '水',
          state: '太过',
          tone: '太羽',
        },
        sitian: '少阳相火',
        zaiquan: '厥阴风木',
      },
      ruleVersion: 'YQ-MVP-RULES-1.0.0',
    });
    expect(result.summary.interval.start.localTime).toBe(
      '2026-01-20T09:00:00+08:00',
    );
    expect(result.summary.interval.end.localTime).toBe(
      '2027-01-20T15:00:00+08:00',
    );
    expect(result.explanations).toEqual([
      '本结果依据冻结规则计算。',
      '传统理论说明仅供医生学习与复盘。',
    ]);
  });

  it('preserves the six-step tuple and identifies the current step by API index', () => {
    const result = mapCurrentYunQi(createYunQiCalculationDto());

    expect(result.timeline).toHaveLength(6);
    expect(result.timeline.map((step) => step.name)).toEqual([
      '初之气',
      '二之气',
      '三之气',
      '四之气',
      '五之气',
      '终之气',
    ]);
    expect(result.timeline.map((step) => step.isCurrent)).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
    ]);
    expect(result.currentStep).toBe(result.timeline[2]);
  });

  it('maps every frozen relation code to a neutral label', () => {
    const result = mapCurrentYunQi(createYunQiCalculationDto());

    expect(result.timeline.map((step) => step.relation)).toEqual([
      {
        qi: { code: 'SAME_QI', label: '同一六气' },
        element: { code: 'SAME_ELEMENT', label: '同五行' },
        direction: { code: 'NONE', label: '无方向关系' },
        traditionalLabel: '同一六气',
      },
      {
        qi: { code: 'DIFFERENT_QI', label: '不同六气' },
        element: {
          code: 'DIFFERENT_ELEMENT',
          label: '不同五行',
        },
        direction: {
          code: 'HOST_GENERATES_GUEST',
          label: '主生客',
        },
        traditionalLabel: '主生客',
      },
      {
        qi: { code: 'DIFFERENT_QI', label: '不同六气' },
        element: {
          code: 'DIFFERENT_ELEMENT',
          label: '不同五行',
        },
        direction: {
          code: 'GUEST_GENERATES_HOST',
          label: '客生主',
        },
        traditionalLabel: '客生主',
      },
      {
        qi: { code: 'DIFFERENT_QI', label: '不同六气' },
        element: {
          code: 'DIFFERENT_ELEMENT',
          label: '不同五行',
        },
        direction: {
          code: 'HOST_CONTROLS_GUEST',
          label: '主胜客',
        },
        traditionalLabel: '主胜客',
      },
      {
        qi: { code: 'DIFFERENT_QI', label: '不同六气' },
        element: {
          code: 'DIFFERENT_ELEMENT',
          label: '不同五行',
        },
        direction: {
          code: 'GUEST_CONTROLS_HOST',
          label: '客胜主',
        },
        traditionalLabel: '客胜主',
      },
      {
        qi: { code: 'DIFFERENT_QI', label: '不同六气' },
        element: { code: 'SAME_ELEMENT', label: '同五行' },
        direction: { code: 'NONE', label: '无方向关系' },
        traditionalLabel: '不同六气，同五行',
      },
    ]);
  });

  it('does not expose epoch milliseconds in any presentation time', () => {
    const result = mapCurrentYunQi(createYunQiCalculationDto());

    expect(result.inputTime).not.toHaveProperty('epochMilliseconds');
    expect(result.summary.interval.start).not.toHaveProperty(
      'epochMilliseconds',
    );
    expect(result.timeline[0].start).not.toHaveProperty(
      'epochMilliseconds',
    );
  });

  it('rejects a current step absent from the six-step tuple', () => {
    const dto = createYunQiCalculationDto();
    const invalid = {
      ...dto,
      currentStep: {
        ...dto.currentStep,
        index: 9,
      },
    };

    expect(() => mapCurrentYunQi(invalid)).toThrow(
      'Current YunQi step is missing from sixQi.steps',
    );
  });
});

