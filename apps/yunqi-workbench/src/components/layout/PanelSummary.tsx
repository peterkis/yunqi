import { createContext, useContext, useEffect } from 'react';
import type { PanelSummaryViewModel } from '../../features/yunqi/presentation/panel-summary';

export const PanelSummaryContext = createContext<
  ((summary: PanelSummaryViewModel | undefined) => void) | undefined
>(undefined);

/** Publish only the snapshot already visible in this view. Unmounting or hiding
 * a result releases it; the shell never starts a query to populate its pill. */
export function PanelSummary({ viewModel }: { readonly viewModel: PanelSummaryViewModel }) {
  const publish = useContext(PanelSummaryContext);
  const { ganzhi, annual, stage, relation } = viewModel;
  const label = relation?.label;
  const explanation = relation?.explanation;
  const tone = relation?.tone;
  useEffect(() => {
    publish?.({
      ganzhi, annual, stage,
      relation: label && explanation && tone ? { label, explanation, tone } : undefined,
    });
    return () => publish?.(undefined);
  }, [publish, ganzhi, annual, stage, label, explanation, tone]);
  return null;
}
