import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiTimeDto,
  YunQiYearDto,
} from '@yunqi/contracts';
import type {
  GuestHostRelationViewModel,
  LabeledCodeViewModel,
  SixQiStageTuple,
  SixQiStageViewModel,
  YunQiTimeViewModel,
  YunQiYearSummaryViewModel,
} from './view-model';

const QI_RELATION_LABELS = {
  SAME_QI: '同一六气',
  DIFFERENT_QI: '不同六气',
} as const satisfies Record<
  HostGuestRelationDto['qiRelation'],
  string
>;

const ELEMENT_RELATION_LABELS = {
  SAME_ELEMENT: '同五行',
  DIFFERENT_ELEMENT: '不同五行',
} as const satisfies Record<
  HostGuestRelationDto['elementRelation'],
  string
>;

const DIRECTION_LABELS = {
  NONE: '无方向关系',
  HOST_GENERATES_GUEST: '主生客',
  GUEST_GENERATES_HOST: '客生主',
  HOST_CONTROLS_GUEST: '主胜客',
  GUEST_CONTROLS_HOST: '客胜主',
} as const satisfies Record<
  HostGuestRelationDto['direction'],
  string
>;

export function labeledCode<Code extends string>(
  code: Code,
  labels: Record<Code, string>,
): LabeledCodeViewModel<Code> {
  return {
    code,
    label: labels[code],
  };
}

export function mapYunQiTime(
  value: YunQiTimeDto,
): YunQiTimeViewModel {
  return {
    localTime: value.localTime,
    standard: {
      code: value.calendarTimeStandard,
      label: '北京时间 UTC+08',
    },
  };
}

function mapRelation(
  relation: HostGuestRelationDto,
): GuestHostRelationViewModel {
  return {
    qi: labeledCode(relation.qiRelation, QI_RELATION_LABELS),
    element: labeledCode(
      relation.elementRelation,
      ELEMENT_RELATION_LABELS,
    ),
    direction: labeledCode(
      relation.direction,
      DIRECTION_LABELS,
    ),
    traditionalLabel: relation.traditionalLabel,
  };
}

function mapSixQiStage(
  step: SixQiStepDto,
): SixQiStageViewModel {
  return {
    index: step.index,
    name: step.name,
    start: mapYunQiTime(step.start),
    end: mapYunQiTime(step.end),
    hostQi: step.hostQi,
    guestQi: step.guestQi,
    relation: mapRelation(step.relation),
  };
}

export function mapSixQiStageTuple(
  steps: YunQiYearDto['sixQi']['steps'],
): SixQiStageTuple {
  const [first, second, third, fourth, fifth, sixth] = steps;

  return [
    mapSixQiStage(first),
    mapSixQiStage(second),
    mapSixQiStage(third),
    mapSixQiStage(fourth),
    mapSixQiStage(fifth),
    mapSixQiStage(sixth),
  ];
}

export function mapYunQiYearSummary(
  dto: YunQiYearDto,
): YunQiYearSummaryViewModel {
  return {
    year: dto.year,
    stemBranch: {
      ganzhi: dto.stemBranch.ganzhi,
      stem: dto.stemBranch.stem,
      branch: dto.stemBranch.branch,
    },
    interval: {
      start: mapYunQiTime(dto.interval.start),
      end: mapYunQiTime(dto.interval.end),
    },
    suiYun: {
      element: dto.suiYun.element,
      state: dto.suiYun.state,
      tone: dto.suiYun.tone,
    },
    sitian: dto.sixQi.sitian,
    zaiquan: dto.sixQi.zaiquan,
  };
}
