import type {
  EarthlyBranch,
  Element,
  HeavenlyStem,
  HostGuestRelation,
  Qi,
  SitianZaiquan,
  SixStepBoundaryTerm,
  StepName,
  SuiYun,
} from '../types.js';

export const RULE_VERSION = 'V1.0-2026.7.7-implementation.1' as const;

export const SIXTY_CYCLE_ANCHOR = Object.freeze({
  year: 1984,
  ganzhi: '甲子',
  index: 0,
} as const);

export const SIXTY_CYCLE = Object.freeze([
  '甲子',
  '乙丑',
  '丙寅',
  '丁卯',
  '戊辰',
  '己巳',
  '庚午',
  '辛未',
  '壬申',
  '癸酉',
  '甲戌',
  '乙亥',
  '丙子',
  '丁丑',
  '戊寅',
  '己卯',
  '庚辰',
  '辛巳',
  '壬午',
  '癸未',
  '甲申',
  '乙酉',
  '丙戌',
  '丁亥',
  '戊子',
  '己丑',
  '庚寅',
  '辛卯',
  '壬辰',
  '癸巳',
  '甲午',
  '乙未',
  '丙申',
  '丁酉',
  '戊戌',
  '己亥',
  '庚子',
  '辛丑',
  '壬寅',
  '癸卯',
  '甲辰',
  '乙巳',
  '丙午',
  '丁未',
  '戊申',
  '己酉',
  '庚戌',
  '辛亥',
  '壬子',
  '癸丑',
  '甲寅',
  '乙卯',
  '丙辰',
  '丁巳',
  '戊午',
  '己未',
  '庚申',
  '辛酉',
  '壬戌',
  '癸亥',
] as const);

export const STEM_RULES = Object.freeze({
  甲: Object.freeze({ element: '土', state: '太过', tone: '太宫' } as const),
  乙: Object.freeze({ element: '金', state: '不及', tone: '少商' } as const),
  丙: Object.freeze({ element: '水', state: '太过', tone: '太羽' } as const),
  丁: Object.freeze({ element: '木', state: '不及', tone: '少角' } as const),
  戊: Object.freeze({ element: '火', state: '太过', tone: '太徵' } as const),
  己: Object.freeze({ element: '土', state: '不及', tone: '少宫' } as const),
  庚: Object.freeze({ element: '金', state: '太过', tone: '太商' } as const),
  辛: Object.freeze({ element: '水', state: '不及', tone: '少羽' } as const),
  壬: Object.freeze({ element: '木', state: '太过', tone: '太角' } as const),
  癸: Object.freeze({ element: '火', state: '不及', tone: '少徵' } as const),
} satisfies Record<HeavenlyStem, SuiYun>);

export const BRANCH_QI_RULES = Object.freeze({
  子: Object.freeze({ sitian: '少阴君火', zaiquan: '阳明燥金' } as const),
  丑: Object.freeze({ sitian: '太阴湿土', zaiquan: '太阳寒水' } as const),
  寅: Object.freeze({ sitian: '少阳相火', zaiquan: '厥阴风木' } as const),
  卯: Object.freeze({ sitian: '阳明燥金', zaiquan: '少阴君火' } as const),
  辰: Object.freeze({ sitian: '太阳寒水', zaiquan: '太阴湿土' } as const),
  巳: Object.freeze({ sitian: '厥阴风木', zaiquan: '少阳相火' } as const),
  午: Object.freeze({ sitian: '少阴君火', zaiquan: '阳明燥金' } as const),
  未: Object.freeze({ sitian: '太阴湿土', zaiquan: '太阳寒水' } as const),
  申: Object.freeze({ sitian: '少阳相火', zaiquan: '厥阴风木' } as const),
  酉: Object.freeze({ sitian: '阳明燥金', zaiquan: '少阴君火' } as const),
  戌: Object.freeze({ sitian: '太阳寒水', zaiquan: '太阴湿土' } as const),
  亥: Object.freeze({ sitian: '厥阴风木', zaiquan: '少阳相火' } as const),
} satisfies Record<EarthlyBranch, SitianZaiquan>);

export const HOST_QI_SEQUENCE = Object.freeze([
  '厥阴风木',
  '少阴君火',
  '少阳相火',
  '太阴湿土',
  '阳明燥金',
  '太阳寒水',
] as const satisfies readonly Qi[]);

export const GUEST_QI_SEQUENCE = Object.freeze([
  '厥阴风木',
  '少阴君火',
  '太阴湿土',
  '少阳相火',
  '阳明燥金',
  '太阳寒水',
] as const satisfies readonly Qi[]);

export const STEP_NAMES = Object.freeze([
  '初之气',
  '二之气',
  '三之气',
  '四之气',
  '五之气',
  '终之气',
] as const satisfies readonly StepName[]);

export const STEP_BOUNDARY_TERMS = Object.freeze([
  '大寒',
  '春分',
  '小满',
  '大暑',
  '秋分',
  '小雪',
] as const satisfies readonly SixStepBoundaryTerm[]);

export const QI_ELEMENT_MAP = Object.freeze({
  厥阴风木: '木',
  少阴君火: '火',
  太阴湿土: '土',
  少阳相火: '火',
  阳明燥金: '金',
  太阳寒水: '水',
} as const satisfies Record<Qi, Element>);

export const ELEMENT_GENERATION_MAP = Object.freeze({
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
} as const satisfies Record<Element, Element>);

export const ELEMENT_CONTROL_MAP = Object.freeze({
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
} as const satisfies Record<Element, Element>);

export const HOST_GUEST_RELATION_PRIORITY = Object.freeze([
  'SAME_QI',
  'SAME_ELEMENT_DIFFERENT_QI',
  'HOST_GENERATES_GUEST',
  'GUEST_GENERATES_HOST',
  'HOST_CONTROLS_GUEST',
  'GUEST_CONTROLS_HOST',
] as const satisfies readonly HostGuestRelation[]);
