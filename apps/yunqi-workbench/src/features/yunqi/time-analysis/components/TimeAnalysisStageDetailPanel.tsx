import type { SixQiStageViewModel } from '../../presentation/view-model';
import { DrilldownStageCard } from '../../year-analysis/components/DrilldownStageCard';

export interface TimeAnalysisStageDetailPanelProps {
  readonly stage: SixQiStageViewModel;
}

export function TimeAnalysisStageDetailPanel({
  stage,
}: TimeAnalysisStageDetailPanelProps) {
  return <DrilldownStageCard stage={stage} context="所选时点所在阶段" />;
}
