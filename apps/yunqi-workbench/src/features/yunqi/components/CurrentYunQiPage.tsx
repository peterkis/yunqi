import { Link } from 'react-router-dom';
import { InfoCard } from '../../../components/design/InfoCard';
import { InlineText } from '../../../components/design/InlineText';
import { QuoteBlock } from '../../../components/design/QuoteBlock';
import { RelationChip } from '../../../components/design/RelationChip';
import { PanelSummary } from '../../../components/layout/PanelSummary';
import { YunQiTimeDetails } from '../../../components/time/YunQiTimeDetails';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { mapCalculationTimes } from '../presentation/map-drilldown';
import { mapPanelSummary } from '../presentation/panel-summary';
import type { LearningViewModel } from '../presentation/map-learning';
import type { CurrentYunQiViewModel } from '../presentation/view-model';
import { CurrentElementValue, CurrentRelation, CurrentRelationReading, CurrentTimeRange } from './CurrentYunQiParts';
import { SixQiTimeline } from './SixQiTimeline';
import { CurrentPeriodGrid } from './CurrentPeriodGrid';
import { YunQiWheel } from './YunQiWheel';

export interface CurrentYunQiPageProps {
  readonly viewModel: CurrentYunQiViewModel;
  readonly learning: LearningViewModel;
}

function MoreChevron() {
  return <svg className="current-more__chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m6 4 4 4-4 4" /></svg>;
}

export function CurrentYunQiPage({ viewModel, learning }: CurrentYunQiPageProps) {
  const { summary, currentStep, annualElements } = viewModel;
  const movement = learning.currentMovement;
  const passage = learning.currentPassages[0];

  return <div className="current-yunqi-page current-overview">
    <PanelSummary viewModel={mapPanelSummary(summary, { step: currentStep, relation: learning.currentQi })} />
    <h2 className="visually-hidden">当前五运六气</h2>
    <div className="current-overview__annual">
      <InfoCard label={`全年 · ${summary.year}`} meta={<>交运 <YunQiTimeDisplay value={summary.interval.start} variant="compact" showStandard={false} /></>} hint={<>
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
        <details className="current-disclosure current-relations">
          <summary>这些关系怎么读？</summary>
          <CurrentRelationReading relation={learning.annualRelation} />
          <CurrentRelationReading relation={learning.currentQi} />
          <p>{movement.explanation}</p>
        </details>
      </section>
    </div>

    <div className="current-overview__quote">
      <InfoCard compact label={`原文 · ${currentStep.name}`} to="/yunqi/current/classics" hint="文献线索，非个体发病预测">
        {passage ? <QuoteBlock compact quote={passage.previewQuote} source={passage.source} /> : <p className="current-copy">此范围暂未收录已核对原文。</p>}
      </InfoCard>
    </div>

    <nav className="current-more" aria-label="更多运气分析">
      <ul className="current-more__list">
        <li><details className="current-disclosure current-all-stages">
          <summary className="current-more__row">其余阶段<MoreChevron /></summary>
          <SixQiTimeline steps={viewModel.timeline} currentStepIndex={currentStep.index} />
          <InfoCard label="五步运全表" meta="北京时间 UTC+08">
            {learning.movements.map((step) => <section className="current-period" key={step.index} aria-label={step.name}>
              <h3>{step.name}{step.index === movement.index ? <span className="current-meta"><InlineText> · 正在此段</InlineText></span> : null}</h3>
              <CurrentTimeRange start={step.start} end={step.end} />
              <dl className="current-pair"><div><dt>主运</dt><dd><CurrentElementValue element={step.hostElement} label={step.hostLabel} /></dd></div><div><dt>客运</dt><dd><CurrentElementValue element={step.guestElement} label={step.guestLabel} /></dd></div></dl>
              <RelationChip tone={step.relation.tone} label={step.relation.label} explanation={step.relation.explanation} />
              <p className="current-copy">{step.explanation}</p>
              <p className="current-meta">{step.boundaryMethod}</p>
            </section>)}
          </InfoCard>
        </details></li>

        <li><Link className="current-more__row" to={`/yunqi/year/${summary.year}`}>年度详情<MoreChevron /></Link></li>
        <li><Link className="current-more__row" to="/yunqi/calculate">指定时点<MoreChevron /></Link></li>

        <li><details className="current-disclosure current-technical">
          <summary className="current-more__row">计算说明与版本<MoreChevron /></summary>
          <YunQiTimeDetails entries={mapCalculationTimes({ summary, stages: viewModel.timeline, inputTime: viewModel.inputTime, movements: learning.movements })} />
          <InfoCard label="规则结果说明">
            <p className="current-copy">按本次计算结果逐条说明，供规则学习与核对。</p>
            <ul>{viewModel.explanations.map((explanation) => <li key={explanation}>{explanation}</li>)}</ul>
            <p className="current-copy">教学扩展版本：<code>{learning.ruleVersion}</code></p>
            {learning.notes.map((note, index) => <p className="current-copy" key={index}>{note}</p>)}
          </InfoCard>
          <InfoCard label="追溯信息">
            <p className="current-copy num"><InlineText>{`YunQi 当前查询 API · ${viewModel.contractId}`}</InlineText></p>
            <p className="current-copy num"><InlineText>{`${viewModel.ruleVersion} · 北京时间 UTC+08`}</InlineText></p>
            <p className="current-meta">规则实现基线，待正式专家冻结与验证。</p>
          </InfoCard>
        </details></li>
      </ul>
    </nav>
  </div>;
}
