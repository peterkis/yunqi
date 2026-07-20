import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiCalculationDto,
  YunQiTimeDto,
} from '@yunqi/contracts';

function time(
  localTime: string,
  epochMilliseconds: number,
): YunQiTimeDto {
  return {
    localTime,
    epochMilliseconds,
    offset: '+08:00',
    calendarTimeStandard: 'BeijingStandardTime+08:00',
  };
}

const relations = [
  {
    qiRelation: 'SAME_QI',
    elementRelation: 'SAME_ELEMENT',
    direction: 'NONE',
    traditionalLabel: '同一六气',
  },
  {
    qiRelation: 'DIFFERENT_QI',
    elementRelation: 'DIFFERENT_ELEMENT',
    direction: 'HOST_GENERATES_GUEST',
    traditionalLabel: '主生客',
  },
  {
    qiRelation: 'DIFFERENT_QI',
    elementRelation: 'DIFFERENT_ELEMENT',
    direction: 'GUEST_GENERATES_HOST',
    traditionalLabel: '客生主',
  },
  {
    qiRelation: 'DIFFERENT_QI',
    elementRelation: 'DIFFERENT_ELEMENT',
    direction: 'HOST_CONTROLS_GUEST',
    traditionalLabel: '主胜客',
  },
  {
    qiRelation: 'DIFFERENT_QI',
    elementRelation: 'DIFFERENT_ELEMENT',
    direction: 'GUEST_CONTROLS_HOST',
    traditionalLabel: '客胜主',
  },
  {
    qiRelation: 'DIFFERENT_QI',
    elementRelation: 'SAME_ELEMENT',
    direction: 'NONE',
    traditionalLabel: '不同六气，同五行',
  },
] as const satisfies readonly HostGuestRelationDto[];

const stepNames = [
  '初之气',
  '二之气',
  '三之气',
  '四之气',
  '五之气',
  '终之气',
] as const;

const hostQi = [
  '厥阴风木',
  '少阴君火',
  '少阳相火',
  '太阴湿土',
  '阳明燥金',
  '太阳寒水',
] as const;

const guestQi = [
  '少阴君火',
  '太阴湿土',
  '少阳相火',
  '阳明燥金',
  '太阳寒水',
  '厥阴风木',
] as const;

const localBoundaries = [
  '2026-01-20T09:00:00+08:00',
  '2026-03-21T10:00:00+08:00',
  '2026-05-21T11:00:00+08:00',
  '2026-07-23T12:00:00+08:00',
  '2026-09-23T13:00:00+08:00',
  '2026-11-22T14:00:00+08:00',
  '2027-01-20T15:00:00+08:00',
] as const;

const steps = stepNames.map((name, position) => ({
  index: position + 1,
  name,
  start: time(
    localBoundaries[position],
    1_768_880_000_000 + position * 5_200_000_000,
  ),
  end: time(
    localBoundaries[position + 1],
    1_768_880_000_000 + (position + 1) * 5_200_000_000,
  ),
  hostQi: hostQi[position],
  guestQi: guestQi[position],
  relation: relations[position],
})) as unknown as YunQiCalculationDto['sixQi']['steps'];

export function createYunQiCalculationDto(): YunQiCalculationDto {
  return {
    input: time(
      '2026-06-19T12:00:00+08:00',
      1_781_841_600_000,
    ),
    ruleVersion: 'YQ-MVP-RULES-1.0.0',
    year: 2026,
    stemBranch: {
      ganzhi: '丙午',
      stem: '丙',
      branch: '午',
    },
    interval: {
      start: time(
        '2026-01-20T09:00:00+08:00',
        1_768_880_000_000,
      ),
      end: time(
        '2027-01-20T15:00:00+08:00',
        1_800_432_000_000,
      ),
    },
    suiYun: {
      element: '水',
      state: '太过',
      tone: '太羽',
    },
    sixQi: {
      sitian: '少阳相火',
      zaiquan: '厥阴风木',
      steps,
    },
    currentStep: steps[2] as SixQiStepDto,
    explanations: [
      '本结果依据冻结规则计算。',
      '传统理论说明仅供医生学习与复盘。',
    ],
  };
}
