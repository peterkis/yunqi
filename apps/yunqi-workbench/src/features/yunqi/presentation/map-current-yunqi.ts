import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiCalculationDto,
  YunQiTimeDto,
} from '@yunqi/contracts';
import type {
  CurrentYunQiViewModel,
  GuestHostRelationViewModel,
  LabeledCodeViewModel,
  SixQiTimelineItemViewModel,
  SixQiTimelineViewModel,
  YunQiStageStatusCode,
  YunQiTimeViewModel,
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

const STAGE_STATUS_LABELS = {
  completed: '已结束',
  current: '当前',
  upcoming: '未开始',
} as const satisfies Record<YunQiStageStatusCode, string>;

function labeledCode<Code extends string>(
  code: Code,
  labels: Record<Code, string>,
): LabeledCodeViewModel<Code> {
  return {
    code,
    label: labels[code],
  };
}

function mapTime(value: YunQiTimeDto): YunQiTimeViewModel {
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

function mapStep(
  step: SixQiStepDto,
  currentStepIndex: number,
): SixQiTimelineItemViewModel {
  const status: YunQiStageStatusCode =
    step.index < currentStepIndex
      ? 'completed'
      : step.index === currentStepIndex
        ? 'current'
        : 'upcoming';

  return {
    index: step.index,
    name: step.name,
    start: mapTime(step.start),
    end: mapTime(step.end),
    hostQi: step.hostQi,
    guestQi: step.guestQi,
    relation: mapRelation(step.relation),
    status: labeledCode(status, STAGE_STATUS_LABELS),
  };
}

function mapTimeline(
  dto: YunQiCalculationDto,
): SixQiTimelineViewModel {
  const [first, second, third, fourth, fifth, sixth] =
    dto.sixQi.steps;
  const currentStepIndex = dto.currentStep.index;

  return [
    mapStep(first, currentStepIndex),
    mapStep(second, currentStepIndex),
    mapStep(third, currentStepIndex),
    mapStep(fourth, currentStepIndex),
    mapStep(fifth, currentStepIndex),
    mapStep(sixth, currentStepIndex),
  ];
}

export function mapCurrentYunQi(
  dto: YunQiCalculationDto,
): CurrentYunQiViewModel {
  const timeline = mapTimeline(dto);
  const currentStep = timeline.find(
    (step) => step.status.code === 'current',
  );

  if (!currentStep) {
    throw new Error(
      'Current YunQi step is missing from sixQi.steps',
    );
  }

  return {
    inputTime: mapTime(dto.input),
    summary: {
      year: dto.year,
      stemBranch: {
        ganzhi: dto.stemBranch.ganzhi,
        stem: dto.stemBranch.stem,
        branch: dto.stemBranch.branch,
      },
      interval: {
        start: mapTime(dto.interval.start),
        end: mapTime(dto.interval.end),
      },
      suiYun: {
        element: dto.suiYun.element,
        state: dto.suiYun.state,
        tone: dto.suiYun.tone,
      },
      sitian: dto.sixQi.sitian,
      zaiquan: dto.sixQi.zaiquan,
    },
    currentStep,
    timeline,
    explanations: dto.explanations,
    ruleVersion: dto.ruleVersion,
  };
}
