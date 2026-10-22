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
        <h2 id={titleId} aria-live="polite" aria-atomic="true">已选择：{stage.name}</h2>
        <p>核对本阶段的主气、客气和客主关系。</p>
      </header>
      <div className="annual-six-qi-detail__facts">
        <DataLabel label="阶段序号" value={stage.index} />
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
