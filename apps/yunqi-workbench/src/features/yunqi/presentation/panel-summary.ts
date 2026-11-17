import type { LearningRelationViewModel } from './map-learning';
import type { SixQiStageViewModel, YunQiYearSummaryViewModel } from './view-model';

export interface PanelSummaryViewModel {
  readonly ganzhi: string;
  readonly annual: string;
  readonly stage?: string;
  readonly relation?: {
    readonly label: string;
    readonly explanation: string;
    readonly tone: 'favorable' | 'adverse' | 'neutral';
  };
}

export function mapPanelSummary(
  summary: YunQiYearSummaryViewModel,
  current?: { readonly step: SixQiStageViewModel; readonly relation: LearningRelationViewModel },
): PanelSummaryViewModel {
  return {
    ganzhi: summary.stemBranch.ganzhi,
    annual: `${summary.suiYun.element}运${summary.suiYun.state} · ${summary.sitian}司天 · ${summary.zaiquan}在泉`,
    stage: current ? `${current.step.name} · 客气${current.step.guestQi}` : undefined,
    relation: current ? {
      label: current.relation.label,
      explanation: current.relation.explanation,
      tone: current.relation.tone,
    } : undefined,
  };
}
