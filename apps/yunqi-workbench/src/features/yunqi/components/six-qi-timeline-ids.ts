import type { SixQiTimelineItemViewModel } from '../presentation/view-model';

export function getSixQiTimelineIds(
  timelineId: string,
  index: SixQiTimelineItemViewModel['index'],
) {
  const rootId = `${timelineId}-step-${index}`;

  return {
    controlId: `${rootId}-control`,
    detailsId: `${rootId}-details`,
    detailsLabelId: `${rootId}-details-label`,
    rootId,
  } as const;
}
