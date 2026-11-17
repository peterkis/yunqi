import { mapMovementElement, mapQiElement, mapRelationDirection } from './visual-mappings';
import type { SixQiStageViewModel, YunQiYearSummaryViewModel } from './view-model';

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
