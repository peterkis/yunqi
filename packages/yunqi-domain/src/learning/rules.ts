import type { Element, HeavenlyStem, SuiYun, Tone } from '../types.js';

export const LEARNING_RULE_VERSION = 'YQ-LEARNING-RULES-1.0.0';
export const MOVEMENT_BOUNDARY_METHOD = '节气交节时刻加整日（教学口径，待专家确认）';
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
