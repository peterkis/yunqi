import { Link } from 'react-router-dom';
import { InfoCard } from '../../../components/design/InfoCard';
import { InlineText } from '../../../components/design/InlineText';
import { MoreRowChevron, MoreRowSummary } from '../../../components/design/MoreRow';
import { QuoteBlock } from '../../../components/design/QuoteBlock';
import { PanelSummary } from '../../../components/layout/PanelSummary';
import { MotionSettings } from '../../../components/layout/MotionSettings';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { formatMotionDiagnostics } from '../../../lib/motion-diagnostics';
import { useMotion } from '../../../providers/MotionProvider';
import { mapPanelSummary } from '../presentation/panel-summary';
import type { LearningViewModel } from '../presentation/map-learning';
import type { CurrentYunQiViewModel } from '../presentation/view-model';
import { CurrentElementValue, CurrentRelation, CurrentRelationReading } from './CurrentYunQiParts';
import { StageTimeline } from './StageTimeline';
import { CurrentPeriodGrid } from './CurrentPeriodGrid';
import { CurrentCalculationTimeline } from './CurrentCalculationTimeline';
import { CurrentRuleExplanation } from './CurrentRuleExplanation';
import { RelationReadingSummary } from './RelationReadingSummary';
import { YunQiWheel } from './YunQiWheel';

export interface CurrentYunQiPageProps {
  readonly viewModel: CurrentYunQiViewModel;
  readonly learning: LearningViewModel;
}

export function CurrentYunQiPage({ viewModel, learning }: CurrentYunQiPageProps) {
  const { summary, currentStep, annualElements } = viewModel;
  const { level, reason, engine } = useMotion();
  const movement = learning.currentMovement;
  const passage = learning.currentPassages[0];

  return <div className="current-yunqi-page current-overview">
    <PanelSummary viewModel={mapPanelSummary(summary, { step: currentStep, relation: learning.currentQi })} />
    <h2 className="visually-hidden">当前五运六气</h2>
    <div className="current-overview__annual">
      <InfoCard label={`全年 · ${summary.year}`} meta={<>交运 <YunQiTimeDisplay value={summary.interval.start} variant="compact" /></>} hint={<>
        <CurrentRelation relation={learning.annualRelation} />
      </>}>
        <YunQiWheel viewModel={learning.annualWheel} />
        <dl className="current-annual-grid">
          <div><dt>岁运</dt><dd><CurrentElementValue element={annualElements.suiYun} label={`${summary.suiYun.element}运${summary.suiYun.state}`} /></dd></div>
          <div><dt>司天</dt><dd><CurrentElementValue element={annualElements.sitian} label={summary.sitian} /></dd></div>
          <div><dt>在泉</dt><dd><CurrentElementValue element={annualElements.zaiquan} label={summary.zaiquan} /></dd></div>
        </dl>
      </InfoCard>
    </div>

    <div className="current-overview__now">
      <section className="ds-info-card ds-info-card--compact current-period-card" aria-label="当下所处的气与运">
        <CurrentPeriodGrid learning={learning} />
        <details className="current-relations">
          <RelationReadingSummary />
          <div className="current-relations__body">
            <CurrentRelationReading relation={learning.annualRelation} />
            <CurrentRelationReading relation={learning.currentQi} />
          </div>
        </details>
      </section>
    </div>

    <div className="current-overview__quote">
      <InfoCard className="reading-excerpt" compact label={`原文 · ${currentStep.name}`} to="/yunqi/current/classics">
        {passage ? <QuoteBlock compact quote={passage.previewQuote} source={passage.source} /> : <p className="current-copy">此范围暂未收录已核对原文。</p>}
      </InfoCard>
    </div>

    <nav className="current-more" aria-label="更多运气分析">
      <ul className="current-more__list">
        <li><details className="current-disclosure current-all-stages">
          <MoreRowSummary>其余阶段</MoreRowSummary>
          <StageTimeline kind="qi" steps={viewModel.timeline} currentStepIndex={currentStep.index} />
          <StageTimeline kind="movement" steps={learning.movements} currentStepIndex={movement.index} />
        </details></li>

        <li><Link className="current-more__row" to={`/yunqi/year/${summary.year}`}>年度详情<MoreRowChevron /></Link></li>
        <li><Link className="current-more__row" to="/yunqi/calculate">指定时点<MoreRowChevron /></Link></li>

        <li><details className="current-disclosure current-technical">
          <MoreRowSummary>计算说明与版本</MoreRowSummary>
          <CurrentCalculationTimeline learning={learning} />
          <CurrentRuleExplanation learning={learning} />
          <InfoCard label="追溯信息">
            <p className="current-copy num"><InlineText>{`YunQi 当前查询 API · ${viewModel.contractId}`}</InlineText></p>
            <p className="current-copy num"><InlineText>{viewModel.ruleVersion}</InlineText></p>
            <p className="current-copy num"><InlineText>{formatMotionDiagnostics(level, reason, engine)}</InlineText></p>
            <p className="current-meta">规则实现基线，待正式专家冻结与验证。</p>
          </InfoCard>
        </details></li>
        <li><MotionSettings /></li>
      </ul>
    </nav>
  </div>;
}
