import { describe, expect, it } from 'vitest';
import {
  BRANCH_QI_RULES,
  ELEMENT_CONTROL_MAP,
  ELEMENT_GENERATION_MAP,
  GUEST_QI_SEQUENCE,
  HOST_GUEST_RELATION_LABELS,
  HOST_GUEST_RELATION_PRIORITY,
  HOST_QI_SEQUENCE,
  QI_ELEMENT_MAP,
  RULE_VERSION,
  SIXTY_CYCLE,
  SIXTY_CYCLE_ANCHOR,
  STEM_RULES,
  STEP_BOUNDARY_TERMS,
  STEP_NAMES,
} from '../src/rules/phase1-rules.js';

describe('Phase 1 rule tables', () => {
  it('exposes the exact versioned sixty-cycle sequence and anchor', () => {
    expect(RULE_VERSION).toBe('V1.0-2026.7.7-implementation.1');
    expect(SIXTY_CYCLE_ANCHOR).toEqual({ year: 1984, ganzhi: '甲子', index: 0 });
    expect(SIXTY_CYCLE).toEqual([
      '甲子', '乙丑', '丙寅', '丁卯', '戊辰', '己巳', '庚午', '辛未', '壬申', '癸酉',
      '甲戌', '乙亥', '丙子', '丁丑', '戊寅', '己卯', '庚辰', '辛巳', '壬午', '癸未',
      '甲申', '乙酉', '丙戌', '丁亥', '戊子', '己丑', '庚寅', '辛卯', '壬辰', '癸巳',
      '甲午', '乙未', '丙申', '丁酉', '戊戌', '己亥', '庚子', '辛丑', '壬寅', '癸卯',
      '甲辰', '乙巳', '丙午', '丁未', '戊申', '己酉', '庚戌', '辛亥', '壬子', '癸丑',
      '甲寅', '乙卯', '丙辰', '丁巳', '戊午', '己未', '庚申', '辛酉', '壬戌', '癸亥',
    ]);
    expect(new Set(SIXTY_CYCLE).size).toBe(60);
  });

  it('exposes the exact stem and branch mappings', () => {
    expect(STEM_RULES).toEqual({
      甲: { element: '土', state: '太过', tone: '太宫' },
      乙: { element: '金', state: '不及', tone: '少商' },
      丙: { element: '水', state: '太过', tone: '太羽' },
      丁: { element: '木', state: '不及', tone: '少角' },
      戊: { element: '火', state: '太过', tone: '太徵' },
      己: { element: '土', state: '不及', tone: '少宫' },
      庚: { element: '金', state: '太过', tone: '太商' },
      辛: { element: '水', state: '不及', tone: '少羽' },
      壬: { element: '木', state: '太过', tone: '太角' },
      癸: { element: '火', state: '不及', tone: '少徵' },
    });
    expect(BRANCH_QI_RULES).toEqual({
      子: { sitian: '少阴君火', zaiquan: '阳明燥金' },
      丑: { sitian: '太阴湿土', zaiquan: '太阳寒水' },
      寅: { sitian: '少阳相火', zaiquan: '厥阴风木' },
      卯: { sitian: '阳明燥金', zaiquan: '少阴君火' },
      辰: { sitian: '太阳寒水', zaiquan: '太阴湿土' },
      巳: { sitian: '厥阴风木', zaiquan: '少阳相火' },
      午: { sitian: '少阴君火', zaiquan: '阳明燥金' },
      未: { sitian: '太阴湿土', zaiquan: '太阳寒水' },
      申: { sitian: '少阳相火', zaiquan: '厥阴风木' },
      酉: { sitian: '阳明燥金', zaiquan: '少阴君火' },
      戌: { sitian: '太阳寒水', zaiquan: '太阴湿土' },
      亥: { sitian: '厥阴风木', zaiquan: '少阳相火' },
    });
  });

  it('keeps the exact qi sequences and six-step boundaries', () => {
    expect(HOST_QI_SEQUENCE).toEqual([
      '厥阴风木', '少阴君火', '少阳相火',
      '太阴湿土', '阳明燥金', '太阳寒水',
    ]);
    expect(GUEST_QI_SEQUENCE).toEqual([
      '厥阴风木', '少阴君火', '太阴湿土',
      '少阳相火', '阳明燥金', '太阳寒水',
    ]);
    expect(STEP_NAMES).toEqual([
      '初之气', '二之气', '三之气', '四之气', '五之气', '终之气',
    ]);
    expect(STEP_BOUNDARY_TERMS).toEqual(['大寒', '春分', '小满', '大暑', '秋分', '小雪']);
  });

  it('exposes the exact element and ordered relation mappings', () => {
    expect(QI_ELEMENT_MAP).toEqual({
      厥阴风木: '木',
      少阴君火: '火',
      太阴湿土: '土',
      少阳相火: '火',
      阳明燥金: '金',
      太阳寒水: '水',
    });
    expect(ELEMENT_GENERATION_MAP).toEqual({
      木: '火',
      火: '土',
      土: '金',
      金: '水',
      水: '木',
    });
    expect(ELEMENT_CONTROL_MAP).toEqual({
      木: '土',
      土: '水',
      水: '火',
      火: '金',
      金: '木',
    });
    expect(HOST_GUEST_RELATION_PRIORITY).toEqual([
      'SAME_QI',
      'SAME_ELEMENT_DIFFERENT_QI',
      'HOST_GENERATES_GUEST',
      'GUEST_GENERATES_HOST',
      'HOST_CONTROLS_GUEST',
      'GUEST_CONTROLS_HOST',
    ]);
    expect(HOST_GUEST_RELATION_LABELS).toEqual({
      SAME_QI: '同气',
      SAME_ELEMENT_DIFFERENT_QI: '同属{element}，六气不同',
      HOST_GENERATES_GUEST: '主生客，相得',
      GUEST_GENERATES_HOST: '客生主',
      HOST_CONTROLS_GUEST: '主克客',
      GUEST_CONTROLS_HOST: '客克主',
    });
  });

  it('freezes every exported rule table at runtime', () => {
    const ruleTables = [
      SIXTY_CYCLE_ANCHOR,
      SIXTY_CYCLE,
      STEM_RULES,
      BRANCH_QI_RULES,
      HOST_QI_SEQUENCE,
      GUEST_QI_SEQUENCE,
      STEP_NAMES,
      STEP_BOUNDARY_TERMS,
      QI_ELEMENT_MAP,
      ELEMENT_GENERATION_MAP,
      ELEMENT_CONTROL_MAP,
      HOST_GUEST_RELATION_PRIORITY,
      HOST_GUEST_RELATION_LABELS,
    ];

    expect(ruleTables.every(Object.isFrozen)).toBe(true);
    expect(Object.values(STEM_RULES).every(Object.isFrozen)).toBe(true);
    expect(Object.values(BRANCH_QI_RULES).every(Object.isFrozen)).toBe(true);
  });
});
