import { useId } from 'react';
import { DataLabel } from '../../../../components/ui/DataLabel';
import { GuestHostRelationDetail } from '../../components/GuestHostRelationDetail';
import { YunQiTimeRange } from '../../components/YunQiTimeRange';
import type { SixQiStageViewModel } from '../../presentation/view-model';

export interface TimeAnalysisStageDetailPanelProps {
  readonly stage: SixQiStageViewModel;
}

export function TimeAnalysisStageDetailPanel({
  stage,
}: TimeAnalysisStageDetailPanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="time-analysis-stage-detail"
      role="region"
    >
      <header className="time-analysis-stage-detail__header">
        <p className="time-analysis-stage-detail__eyebrow">
          Selected Stage
        </p>
        <h2 id={titleId}>所选时点所在阶段：{stage.name}</h2>
        <p>以下内容来自指定时点计算 API，前端仅展示所选阶段事实。</p>
      </header>
      <div className="time-analysis-stage-detail__facts">
        <DataLabel label="API 阶段序号" value={stage.index} />
        <DataLabel
          label="阶段区间"
          value={
            <span className="time-analysis-stage-detail__time">
              <YunQiTimeRange start={stage.start} end={stage.end} />
              <span>北京时间 UTC+08</span>
            </span>
          }
        />
        <DataLabel label="主气" value={stage.hostQi} />
        <DataLabel label="客气" value={stage.guestQi} />
      </div>
      <GuestHostRelationDetail relation={stage.relation} />
    </section>
  );
}
