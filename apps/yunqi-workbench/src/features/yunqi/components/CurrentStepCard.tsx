import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { DataLabel } from '../../../components/ui/DataLabel';
import { Panel } from '../../../components/ui/Panel';
import type { SixQiTimelineItemViewModel } from '../presentation/view-model';
import { YunQiTimeRange } from './YunQiTimeRange';

export interface CurrentStepCardProps {
  readonly step: SixQiTimelineItemViewModel;
}

export function CurrentStepCard({ step }: CurrentStepCardProps) {
  return (
    <Panel
      eyebrow="Current Position"
      title="当前所在六步"
      description="当前位置由 API 返回的 currentStep 标识，前端不重新判断边界。"
    >
      <Card title={step.name}>
        <div className="current-step__badge">
          <Badge tone="current">当前</Badge>
        </div>
        <div className="current-step__grid">
          <DataLabel
            label="交接区间"
            value={<YunQiTimeRange start={step.start} end={step.end} />}
          />
          <DataLabel label="主气" value={step.hostQi} />
          <DataLabel label="客气" value={step.guestQi} />
          <DataLabel
            label="客主关系"
            value={step.relation.traditionalLabel}
          />
        </div>
      </Card>
    </Panel>
  );
}

