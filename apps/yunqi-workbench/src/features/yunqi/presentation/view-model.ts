import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiYearDto,
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

export type YunQiStageStatusCode =
  | 'completed'
  | 'current'
  | 'upcoming';

export interface SixQiStageViewModel {
  readonly index: SixQiStepDto['index'];
  readonly name: SixQiStepDto['name'];
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly hostQi: SixQiStepDto['hostQi'];
  readonly guestQi: SixQiStepDto['guestQi'];
  readonly relation: GuestHostRelationViewModel;
}

export type SixQiStageTuple<
  Stage extends SixQiStageViewModel = SixQiStageViewModel,
> = readonly [Stage, Stage, Stage, Stage, Stage, Stage];

export interface CurrentSixQiStageViewModel
  extends SixQiStageViewModel {
  readonly status: LabeledCodeViewModel<YunQiStageStatusCode>;
}

export type CurrentSixQiStageTuple =
  SixQiStageTuple<CurrentSixQiStageViewModel>;

export interface YunQiYearSummaryViewModel {
  readonly year: YunQiYearDto['year'];
  readonly stemBranch: {
    readonly ganzhi: YunQiYearDto['stemBranch']['ganzhi'];
    readonly stem: YunQiYearDto['stemBranch']['stem'];
    readonly branch: YunQiYearDto['stemBranch']['branch'];
  };
  readonly interval: {
    readonly start: YunQiTimeViewModel;
    readonly end: YunQiTimeViewModel;
  };
  readonly suiYun: {
    readonly element: YunQiYearDto['suiYun']['element'];
    readonly state: YunQiYearDto['suiYun']['state'];
    readonly tone: YunQiYearDto['suiYun']['tone'];
  };
  readonly sitian: YunQiYearDto['sixQi']['sitian'];
  readonly zaiquan: YunQiYearDto['sixQi']['zaiquan'];
}

export interface AnnualYunQiViewModel {
  readonly summary: YunQiYearSummaryViewModel;
  readonly stages: SixQiStageTuple;
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}

export interface CurrentYunQiViewModel {
  readonly inputTime: YunQiTimeViewModel;
  readonly summary: YunQiYearSummaryViewModel;
  readonly currentStep: CurrentSixQiStageViewModel;
  readonly timeline: CurrentSixQiStageTuple;
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}

export type SixQiTimelineItemViewModel =
  CurrentSixQiStageViewModel;
export type SixQiTimelineViewModel = CurrentSixQiStageTuple;
export type YunQiSummaryViewModel = YunQiYearSummaryViewModel;
