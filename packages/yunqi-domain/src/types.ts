import type { YunQiInstant } from './calendar/time.js';

export type Element = '木' | '火' | '土' | '金' | '水';
export type YunState = '太过' | '不及';
export type HeavenlyStem =
  | '甲'
  | '乙'
  | '丙'
  | '丁'
  | '戊'
  | '己'
  | '庚'
  | '辛'
  | '壬'
  | '癸';
export type EarthlyBranch =
  | '子'
  | '丑'
  | '寅'
  | '卯'
  | '辰'
  | '巳'
  | '午'
  | '未'
  | '申'
  | '酉'
  | '戌'
  | '亥';
export type Qi =
  | '厥阴风木'
  | '少阴君火'
  | '太阴湿土'
  | '少阳相火'
  | '阳明燥金'
  | '太阳寒水';
export type HostGuestRelation =
  | 'SAME_QI'
  | 'SAME_ELEMENT_DIFFERENT_QI'
  | 'HOST_GENERATES_GUEST'
  | 'GUEST_GENERATES_HOST'
  | 'HOST_CONTROLS_GUEST'
  | 'GUEST_CONTROLS_HOST';
export type Tone =
  | '太角'
  | '少角'
  | '太徵'
  | '少徵'
  | '太宫'
  | '少宫'
  | '太商'
  | '少商'
  | '太羽'
  | '少羽';
export type StepName = '初之气' | '二之气' | '三之气' | '四之气' | '五之气' | '终之气';

export interface StemBranch {
  year: number;
  ganzhi: string;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}

export interface SuiYun {
  element: Element;
  state: YunState;
  tone: Tone;
}

export interface SitianZaiquan {
  sitian: Qi;
  zaiquan: Qi;
}

export interface SixQiStep {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  name: StepName;
  start: YunQiInstant;
  end: YunQiInstant;
  hostQi: Qi;
  guestQi: Qi;
  relation: HostGuestRelation;
}

export interface YunQiYearResult extends StemBranch {
  start: YunQiInstant;
  end: YunQiInstant;
  suiYun: SuiYun;
  sitian: Qi;
  zaiquan: Qi;
  steps: readonly SixQiStep[];
  ruleVersion: string;
  explanations: readonly string[];
}

export interface YunQiResult extends YunQiYearResult {
  input: YunQiInstant;
  currentStep: SixQiStep;
}
