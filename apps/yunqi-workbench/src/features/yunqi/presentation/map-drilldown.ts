import { mapMovementElement, mapQiElement, mapRelationDirection } from './visual-mappings';
import type { SixQiStageViewModel, YunQiTimeViewModel, YunQiYearSummaryViewModel } from './view-model';

export interface YunQiTimeEntryViewModel {
  readonly label: string;
  readonly start: YunQiTimeViewModel;
  readonly end?: YunQiTimeViewModel;
}

/** Projects supplied API times only; it does not derive any boundaries. */
export function mapCalculationTimes({ summary, stages, inputTime, movements = [] }: {
  readonly summary: YunQiYearSummaryViewModel;
  readonly stages: readonly Pick<SixQiStageViewModel, 'name' | 'start' | 'end'>[];
  readonly inputTime?: YunQiTimeViewModel;
  readonly movements?: readonly { readonly name: string; readonly start: YunQiTimeViewModel; readonly end: YunQiTimeViewModel }[];
}): readonly YunQiTimeEntryViewModel[] {
  return [
    ...(inputTime ? [{ label: '计算时刻', start: inputTime }] : []),
    { label: '运气年', ...summary.interval },
    ...stages.map((stage) => ({ label: stage.name, start: stage.start, end: stage.end })),
    ...movements.map((movement) => ({ label: movement.name, start: movement.start, end: movement.end })),
  ];
}

export function mapDrilldownSummary(summary: YunQiYearSummaryViewModel) {
  return {
    ...summary,
    boundaryMeta: `交运 ${summary.interval.start.localTime.slice(5, 16).replace('T', ' ')}`,
    movementElement: mapMovementElement(summary.suiYun.element),
    sitianElement: mapQiElement(summary.sitian),
    zaiquanElement: mapQiElement(summary.zaiquan),
  };
}

export function mapDrilldownStage(stage: SixQiStageViewModel) {
  const direction = mapRelationDirection(stage.relation.direction.code);
  return {
    ...stage,
    hostElement: mapQiElement(stage.hostQi),
    guestElement: mapQiElement(stage.guestQi),
    relationTone: direction.tone,
    relationExplanation: direction.verb
      ? `${direction.verb}；主气为${stage.hostQi}，客气为${stage.guestQi}。`
      : `主气为${stage.hostQi}，客气为${stage.guestQi}；${stage.relation.element.label}。`,
  };
}
