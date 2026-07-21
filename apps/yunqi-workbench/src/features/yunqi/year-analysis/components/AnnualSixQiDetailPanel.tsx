import { useId } from 'react';
import { DataLabel } from '../../../../components/ui/DataLabel';
import { GuestHostRelationDetail } from '../../components/GuestHostRelationDetail';
import { YunQiTimeRange } from '../../components/YunQiTimeRange';
import type { SixQiStageViewModel } from '../../presentation/view-model';

export interface AnnualSixQiDetailPanelProps {
  readonly stage: SixQiStageViewModel;
}

export function AnnualSixQiDetailPanel({
  stage,
}: AnnualSixQiDetailPanelProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="annual-six-qi-detail"
      role="region"
    >
      <header className="annual-six-qi-detail__header">
        <p className="annual-six-qi-detail__eyebrow">Stage Detail</p>
        <h2 id={titleId}>已选择：{stage.name}</h2>
        <p>以下内容来自年度查询 API，前端仅按所选阶段展示。</p>
      </header>
      <div className="annual-six-qi-detail__facts">
        <DataLabel label="API 阶段序号" value={stage.index} />
        <DataLabel
          label="阶段区间"
          value={
            <span className="annual-six-qi-detail__time">
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
