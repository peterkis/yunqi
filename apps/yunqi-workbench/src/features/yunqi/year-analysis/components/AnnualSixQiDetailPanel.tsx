import type { SixQiStageViewModel } from '../../presentation/view-model';
import { DrilldownStageCard } from './DrilldownStageCard';

export interface AnnualSixQiDetailPanelProps {
  readonly stage: SixQiStageViewModel;
}

export function AnnualSixQiDetailPanel({
  stage,
}: AnnualSixQiDetailPanelProps) {
  return <DrilldownStageCard stage={stage} context="已选择" />;
}
