import { describe, expect, it } from 'vitest';

import { calculateYearYunQi } from '../src/index.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

// Scratch acceptance values copied from the independently verified matrix.
// They are deliberately not derived from any production rule export.
const ANNUAL_ACCEPTANCE_ROWS = [
  {
    year: 2024,
    ganzhi: '甲辰',
    suiYun: { element: '土', state: '太过', tone: '太宫' },
    sitian: '太阳寒水',
    zaiquan: '太阴湿土',
    guestQi: ['少阳相火', '阳明燥金', '太阳寒水', '厥阴风木', '少阴君火', '太阴湿土'],
    relations: [
      'HOST_GENERATES_GUEST',
      'HOST_CONTROLS_GUEST',
      'GUEST_CONTROLS_HOST',
      'GUEST_CONTROLS_HOST',
      'GUEST_CONTROLS_HOST',
      'GUEST_CONTROLS_HOST',
    ],
  },
  {
    year: 2025,
    ganzhi: '乙巳',
    suiYun: { element: '金', state: '不及', tone: '少商' },
    sitian: '厥阴风木',
    zaiquan: '少阳相火',
    guestQi: ['阳明燥金', '太阳寒水', '厥阴风木', '少阴君火', '太阴湿土', '少阳相火'],
    relations: [
      'GUEST_CONTROLS_HOST',
      'GUEST_CONTROLS_HOST',
      'GUEST_GENERATES_HOST',
      'GUEST_GENERATES_HOST',
      'GUEST_GENERATES_HOST',
      'HOST_CONTROLS_GUEST',
    ],
  },
  {
    year: 2026,
    ganzhi: '丙午',
    suiYun: { element: '水', state: '太过', tone: '太羽' },
    sitian: '少阴君火',
    zaiquan: '阳明燥金',
    guestQi: ['太阳寒水', '厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金'],
    relations: [
      'GUEST_GENERATES_HOST',
      'GUEST_GENERATES_HOST',
      'SAME_ELEMENT_DIFFERENT_QI',
      'SAME_QI',
      'GUEST_CONTROLS_HOST',
      'GUEST_GENERATES_HOST',
    ],
  },
  {
    year: 2027,
    ganzhi: '丁未',
    suiYun: { element: '木', state: '不及', tone: '少角' },
    sitian: '太阴湿土',
    zaiquan: '太阳寒水',
    guestQi: ['厥阴风木', '少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水'],
    relations: ['SAME_QI', 'SAME_QI', 'HOST_GENERATES_GUEST', 'GUEST_GENERATES_HOST', 'SAME_QI', 'SAME_QI'],
  },
  {
    year: 2028,
    ganzhi: '戊申',
    suiYun: { element: '火', state: '太过', tone: '太徵' },
    sitian: '少阳相火',
    zaiquan: '厥阴风木',
    guestQi: ['少阴君火', '太阴湿土', '少阳相火', '阳明燥金', '太阳寒水', '厥阴风木'],
    relations: [
      'HOST_GENERATES_GUEST',
      'HOST_GENERATES_GUEST',
      'SAME_QI',
      'HOST_GENERATES_GUEST',
      'HOST_GENERATES_GUEST',
      'HOST_GENERATES_GUEST',
    ],
  },
] as const;

describe('Phase 1 independent annual acceptance matrix', () => {
  it.each(ANNUAL_ACCEPTANCE_ROWS)(
    'accepts the complete $year annual row',
    ({ year, ganzhi, suiYun, sitian, zaiquan, guestQi, relations }) => {
      const result = calculateYearYunQi(year, fixedCalendarProvider);

      expect({
        year: result.year,
        ganzhi: result.ganzhi,
        suiYun: result.suiYun,
        sitian: result.sitian,
        zaiquan: result.zaiquan,
        guestQi: result.steps.map((step) => step.guestQi),
        relations: result.steps.map((step) => step.relation),
      }).toEqual({ year, ganzhi, suiYun, sitian, zaiquan, guestQi, relations });
      expect(result.steps[2].guestQi).toBe(sitian);
      expect(result.steps[5].guestQi).toBe(zaiquan);
    },
  );

  it('accepts exact factual explanations for the actual 2024 year start and mappings', () => {
    const result = calculateYearYunQi(2024, fixedCalendarProvider);

    expect(result.start.epochMilliseconds).toBe(1_705_759_642_000);
    expect(result.end.epochMilliseconds).toBe(1_737_316_808_000);
    expect(result.explanations).toEqual([
      '2024 运气年以北京时间 2024 年大寒实际交节时刻为起点。',
      '该运气年的实际区间为 2024-01-20T22:07:22+08:00 至 2025-01-20T04:00:08+08:00（左闭右开）。',
      '年干甲按规则表对应土运太过（太宫）。',
      '年支辰按规则表对应司天太阳寒水、在泉太阴湿土。',
      '三之气客气与司天同为太阳寒水。',
      '终之气客气与在泉同为太阴湿土。',
    ]);
  });
});
