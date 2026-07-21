import type { SixQiTimelineItemViewModel } from '../presentation/view-model';

export function getSixQiTimelineIds(
  index: SixQiTimelineItemViewModel['index'],
) {
  const rootId = `sixqi-step-${index}`;

  return {
    controlId: `${rootId}-control`,
    detailsId: `${rootId}-details`,
    detailsLabelId: `${rootId}-details-label`,
    rootId,
  } as const;
}
