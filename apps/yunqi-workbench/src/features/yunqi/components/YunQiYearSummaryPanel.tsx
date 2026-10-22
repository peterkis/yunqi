import { DataLabel } from '../../../components/ui/DataLabel';
import { Panel } from '../../../components/ui/Panel';
import type { YunQiYearSummaryViewModel } from '../presentation/view-model';
import { YunQiTimeRange } from './YunQiTimeRange';

export interface YunQiYearSummaryPanelProps {
  readonly summary: YunQiYearSummaryViewModel;
}

export function YunQiYearSummaryPanel({
  summary,
}: YunQiYearSummaryPanelProps) {
  return (
    <Panel
      title="年度概览"
      description="规则实现基线，待正式专家冻结与验证。"
    >
      <div className="summary-grid">
          <DataLabel label="运气年" value={summary.year} />
          <DataLabel
            label="干支"
            value={summary.stemBranch.ganzhi}
          />
          <DataLabel
            label="岁运"
            value={`${summary.suiYun.element}运${summary.suiYun.state}（${summary.suiYun.tone}）`}
          />
          <DataLabel label="司天" value={summary.sitian} />
          <DataLabel label="在泉" value={summary.zaiquan} />
      </div>
      <div className="summary-year-range">
        <span>年界 · 北京时间 UTC+08</span>
        <YunQiTimeRange start={summary.interval.start} end={summary.interval.end} />
        <span>起点包含，终点不包含</span>
      </div>
    </Panel>
  );
}
