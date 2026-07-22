import { Card } from '../../../components/ui/Card';
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
      eyebrow="Annual Frame"
      title="年度概览"
      description="运气年、岁运与司天在泉均来自冻结规则结果。"
    >
      <div className="summary-grid">
        <Card title="运气年">
          <DataLabel label="年份" value={summary.year} />
          <DataLabel
            label="干支"
            value={summary.stemBranch.ganzhi}
          />
          <DataLabel
            label="年界"
            value={
              <YunQiTimeRange
                start={summary.interval.start}
                end={summary.interval.end}
              />
            }
          />
        </Card>
        <Card title="岁运">
          <DataLabel
            label="岁运"
            value={`${summary.suiYun.tone} · ${summary.suiYun.element} · ${summary.suiYun.state}`}
          />
        </Card>
        <Card title="司天与在泉">
          <DataLabel label="司天" value={summary.sitian} />
          <DataLabel label="在泉" value={summary.zaiquan} />
        </Card>
      </div>
    </Panel>
  );
}
