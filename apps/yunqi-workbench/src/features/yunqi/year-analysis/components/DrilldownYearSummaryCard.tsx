import { ElementDot } from '../../../../components/design/ElementDot';
import { InfoCard } from '../../../../components/design/InfoCard';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { mapDrilldownSummary } from '../../presentation/map-drilldown';
import type { YunQiYearSummaryViewModel } from '../../presentation/view-model';

export function DrilldownYearSummaryCard({ summary, compact = false }: {
  readonly summary: YunQiYearSummaryViewModel;
  readonly compact?: boolean;
}) {
  const display = mapDrilldownSummary(summary);
  return (
    <div className={`drilldown-annual-summary${compact ? ' drilldown-annual-summary--compact' : ''}`} role="region" aria-label="年度概览">
      <InfoCard label={`全年 · ${summary.year}`} meta={<>交运 <YunQiTimeDisplay value={summary.interval.start} variant="compact" showStandard={false} /></>}>
        <h2 className="drilldown-ganzhi" aria-label="年度概览">{summary.stemBranch.ganzhi}</h2>
        <p className="drilldown-copy">{summary.suiYun.element}运{summary.suiYun.state}（{summary.suiYun.tone}）</p>
        <dl className="drilldown-annual-facts">
          <div><dt>岁运</dt><dd><ElementDot element={display.movementElement} label={`${summary.suiYun.element}运${summary.suiYun.state}`} /></dd></div>
          <div><dt>司天</dt><dd><ElementDot element={display.sitianElement} label={summary.sitian} /></dd></div>
          <div><dt>在泉</dt><dd><ElementDot element={display.zaiquanElement} label={summary.zaiquan} /></dd></div>
        </dl>
        <div className="ds-info-card__section drilldown-boundaries">
          <span>年界 · 北京时间 UTC+08</span>
          <span>交运 <YunQiTimeDisplay value={summary.interval.start} variant="compact" showStandard={false} /></span>
          <span>至 <YunQiTimeDisplay value={summary.interval.end} variant="compact" showStandard={false} /></span>
          <span>起点包含，终点不包含</span>
        </div>
        <p className="drilldown-meta">规则实现基线，待正式专家冻结与验证。</p>
      </InfoCard>
    </div>
  );
}
