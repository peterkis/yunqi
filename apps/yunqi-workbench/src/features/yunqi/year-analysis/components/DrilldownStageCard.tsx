import { ElementDot } from '../../../../components/design/ElementDot';
import { InfoCard } from '../../../../components/design/InfoCard';
import { RelationChip } from '../../../../components/design/RelationChip';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { mapDrilldownStage } from '../../presentation/map-drilldown';
import type { SixQiStageViewModel } from '../../presentation/view-model';

export function DrilldownStageCard({ stage, context }: {
  readonly stage: SixQiStageViewModel;
  readonly context: '已选择' | '所选时点所在阶段';
}) {
  const display = mapDrilldownStage(stage);
  const title = `${context}：${stage.name}`;
  return (
    <div className="drilldown-stage-detail" role="region" aria-label={title}>
      <InfoCard label={`阶段 · 第 ${stage.index} 步`} meta="北京时间 UTC+08"
        hint={<RelationChip label={stage.relation.direction.label} tone={display.relationTone} explanation={display.relationExplanation} />}>
        <h2 className="drilldown-title" aria-live="polite" aria-atomic="true">{title}</h2>
        <div className="drilldown-boundaries">
          <YunQiTimeDisplay value={stage.start} showStandard={false} />
          <span>→ <YunQiTimeDisplay value={stage.end} showStandard={false} /></span>
          <span>起点包含，终点不包含</span>
        </div>
        <dl className="drilldown-qi-facts ds-info-card__section">
          <div><dt>主气</dt><dd><ElementDot element={display.hostElement} label={stage.hostQi} /></dd></div>
          <div><dt>客气</dt><dd><ElementDot element={display.guestElement} label={stage.guestQi} /></dd></div>
        </dl>
        <div className="drilldown-relation-facts ds-info-card__section">
          <dl><dt>气关系</dt><dd>{stage.relation.qi.label}</dd></dl>
          <dl><dt>五行关系</dt><dd>{stage.relation.element.label}</dd></dl>
          <dl><dt>方向关系</dt><dd>{stage.relation.direction.label}</dd></dl>
          <dl><dt>传统描述</dt><dd>{stage.relation.traditionalLabel}</dd></dl>
        </div>
      </InfoCard>
    </div>
  );
}
