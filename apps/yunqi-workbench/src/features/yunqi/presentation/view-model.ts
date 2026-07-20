import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiCalculationDto,
} from '@yunqi/contracts';

export interface LabeledCodeViewModel<
  Code extends string = string,
> {
  readonly code: Code;
  readonly label: string;
}

export interface YunQiTimeViewModel {
  readonly localTime: string;
  readonly standard: LabeledCodeViewModel<
    'BeijingStandardTime+08:00'
  >;
}

export interface GuestHostRelationViewModel {
  readonly qi: LabeledCodeViewModel<
    HostGuestRelationDto['qiRelation']
  >;
  readonly element: LabeledCodeViewModel<
    HostGuestRelationDto['elementRelation']
  >;
  readonly direction: LabeledCodeViewModel<
    HostGuestRelationDto['direction']
  >;
  readonly traditionalLabel: string;
}

export interface SixQiTimelineItemViewModel {
  readonly index: SixQiStepDto['index'];
  readonly name: SixQiStepDto['name'];
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly hostQi: SixQiStepDto['hostQi'];
  readonly guestQi: SixQiStepDto['guestQi'];
  readonly relation: GuestHostRelationViewModel;
  readonly isCurrent: boolean;
}

export type SixQiTimelineViewModel = readonly [
  SixQiTimelineItemViewModel,
  SixQiTimelineItemViewModel,
  SixQiTimelineItemViewModel,
  SixQiTimelineItemViewModel,
  SixQiTimelineItemViewModel,
  SixQiTimelineItemViewModel,
];

export interface YunQiSummaryViewModel {
  readonly year: YunQiCalculationDto['year'];
  readonly stemBranch: {
    readonly ganzhi: YunQiCalculationDto['stemBranch']['ganzhi'];
    readonly stem: YunQiCalculationDto['stemBranch']['stem'];
    readonly branch: YunQiCalculationDto['stemBranch']['branch'];
  };
  readonly interval: {
    readonly start: YunQiTimeViewModel;
    readonly end: YunQiTimeViewModel;
  };
  readonly suiYun: {
    readonly element: YunQiCalculationDto['suiYun']['element'];
    readonly state: YunQiCalculationDto['suiYun']['state'];
    readonly tone: YunQiCalculationDto['suiYun']['tone'];
  };
  readonly sitian: YunQiCalculationDto['sixQi']['sitian'];
  readonly zaiquan: YunQiCalculationDto['sixQi']['zaiquan'];
}

export interface CurrentYunQiViewModel {
  readonly inputTime: YunQiTimeViewModel;
  readonly summary: YunQiSummaryViewModel;
  readonly currentStep: SixQiTimelineItemViewModel;
  readonly timeline: SixQiTimelineViewModel;
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}

