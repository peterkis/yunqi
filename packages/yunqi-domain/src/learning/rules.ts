import type { SolarTerm } from '../calendar/provider.js';
import type { Element, HeavenlyStem, SuiYun, Tone } from '../types.js';

export const LEARNING_RULE_VERSION = 'YQ-LEARNING-RULES-1.2.0';
export const MOVEMENT_BOUNDARY_METHOD = '节气交节时刻加整日（教学口径，待专家确认）';
export const MOVEMENT_BOUNDARY_OFFSETS = Object.freeze([
  Object.freeze(['春分', 13] as const),
  Object.freeze(['芒种', 10] as const),
  Object.freeze(['处暑', 7] as const),
  Object.freeze(['立冬', 4] as const),
] as const satisfies readonly (readonly [SolarTerm, number])[]);
// 专家确认（2026-11-18）：相生归“相得”并保留生化方向；相克依《至真要大论》
// “主胜逆，客胜从”分顺逆（《类经》“客主之运有逆顺”）；同五行只陈述太少异同。
export const MOVEMENT_RELATION_LABELS = Object.freeze({
  SAME_ELEMENT_SAME_STATE: '主客同运',
  SAME_ELEMENT_DIFFERENT_STATE: '同属{element}运 · 太少不同',
  HOST_GENERATES_GUEST: '相得 · 主生客',
  GUEST_GENERATES_HOST: '相得 · 客生主',
  HOST_CONTROLS_GUEST: '逆 · 主胜客',
  GUEST_CONTROLS_HOST: '顺 · 客胜主',
} as const);
export const MOVEMENT_ELEMENTS: readonly Element[] = Object.freeze(['木', '火', '土', '金', '水']);
export const MOVEMENT_NAMES = Object.freeze(['初运', '二运', '三运', '四运', '终运']);
// 《素问·六元正纪大论》明列的五音次序；水→木处不能机械翻转太少。
const FIRST_HOST_EXCESS: Readonly<Record<HeavenlyStem, boolean>> = Object.freeze({
  甲: true, 乙: true, 丙: true, 丁: false, 戊: false,
  己: false, 庚: false, 辛: false, 壬: true, 癸: true,
});
const TONES: Readonly<Record<Element, readonly [Tone, Tone]>> = Object.freeze({
  木: ['太角', '少角'], 火: ['太徵', '少徵'], 土: ['太宫', '少宫'],
  金: ['太商', '少商'], 水: ['太羽', '少羽'],
});

export function hostMovements(stem: HeavenlyStem): readonly SuiYun[] {
  return MOVEMENT_ELEMENTS.map((element, index) => {
    const excess = index % 2 === 0 ? FIRST_HOST_EXCESS[stem] : !FIRST_HOST_EXCESS[stem];
    return { element, state: excess ? '太过' : '不及', tone: TONES[element][excess ? 0 : 1] };
  });
}
