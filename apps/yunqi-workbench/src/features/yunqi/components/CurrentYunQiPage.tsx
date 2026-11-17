import { Link } from 'react-router-dom';
import { InfoCard } from '../../../components/design/InfoCard';
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

export interface CurrentYunQiPageProps {
  readonly viewModel: CurrentYunQiViewModel;
  readonly learning: LearningViewModel;
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
        <div className="current-year-heading">
          <h3>{summary.stemBranch.ganzhi}</h3>
          <p>{summary.suiYun.element}运{summary.suiYun.state}之年</p>
        </div>
        <dl className="current-annual-grid">
          <div><dt>岁运</dt><dd><CurrentElementValue element={annualElements.suiYun} label={`${summary.suiYun.element}运${summary.suiYun.state}`} /></dd><dd className="current-meta">{summary.suiYun.tone}</dd></div>
          <div><dt>司天</dt><dd><CurrentElementValue element={annualElements.sitian} label={summary.sitian} /></dd><dd className="current-meta">主上半年</dd></div>
          <div><dt>在泉</dt><dd><CurrentElementValue element={annualElements.zaiquan} label={summary.zaiquan} /></dd><dd className="current-meta">主下半年</dd></div>
        </dl>
      </InfoCard>
    </div>

    <div className="current-overview__now">
      <InfoCard label={`此刻 · ${viewModel.inputDate}`} meta="北京时间 UTC+08">
        <div className="current-sixqi-progress" role="img" aria-label={viewModel.progressLabel}>
          {viewModel.timeline.map((step) => <span className={`current-sixqi-progress__step is-${step.status.code}`} key={step.index} aria-hidden="true">
            <span className="current-sixqi-progress__bar" />
            <span>{step.tickLabel}</span>
          </span>)}
        </div>
        <section className="current-period" aria-label="当步气">
          <h3>{currentStep.name}</h3>
          <CurrentTimeRange start={currentStep.start} end={currentStep.end} />
          <dl className="current-pair">
            <div><dt>主气</dt><dd><CurrentElementValue element={currentStep.hostElement} label={currentStep.hostQi} /></dd></div>
            <div><dt>客气</dt><dd><CurrentElementValue element={currentStep.guestElement} label={currentStep.guestQi} /></dd></div>
          </dl>
          <CurrentRelation relation={learning.currentQi} />
        </section>
        <section className="current-period" aria-label="当步运">
          <h3>{movement.name}</h3>
          <CurrentTimeRange start={movement.start} end={movement.end} />
          <dl className="current-pair">
            <div><dt>主运</dt><dd><CurrentElementValue element={movement.hostElement} label={movement.hostLabel} /></dd></div>
            <div><dt>客运</dt><dd><CurrentElementValue element={movement.guestElement} label={movement.guestLabel} /></dd></div>
          </dl>
          {movement.relation && <RelationChip tone={movement.relation.tone} label={movement.relation.label} explanation={movement.relation.explanation} />}
        </section>
        <details className="current-disclosure current-relations">
          <summary>这些关系怎么读？</summary>
          <CurrentRelationReading relation={learning.annualRelation} />
          <CurrentRelationReading relation={learning.currentQi} />
          <p>{movement.explanation}</p>
          <p className="current-meta">交运口径：{movement.boundaryMethod} · 教学口径，待专家确认</p>
        </details>
      </InfoCard>
    </div>

    <div className="current-overview__quote">
      <InfoCard compact label={`原文 · ${currentStep.name}`} to="/yunqi/current/classics" hint="文献线索，非个体发病预测">
        {passage ? <QuoteBlock compact quote={passage.previewQuote} source={passage.source} /> : <p className="current-copy">此范围暂未收录已核对原文。</p>}
      </InfoCard>
    </div>

    <nav className="current-context-links" aria-label="更多运气分析">
      <Link to={`/yunqi/year/${summary.year}`}>年度详情<span aria-hidden="true"> ›</span></Link>
      <Link to="/yunqi/calculate">指定时点<span aria-hidden="true"> ›</span></Link>
    </nav>

    <details className="current-disclosure current-all-stages">
      <summary>其余阶段 · 六步气与五步运</summary>
      <SixQiTimeline steps={viewModel.timeline} currentStepIndex={currentStep.index} />
      <InfoCard label="五步运全表" meta="北京时间 UTC+08">
        {learning.movements.map((step) => <section className="current-period" key={step.index} aria-label={step.name}>
          <h3>{step.name}{step.index === movement.index ? <span className="current-meta"> · 正在此段</span> : null}</h3>
          <CurrentTimeRange start={step.start} end={step.end} />
          <dl className="current-pair"><div><dt>主运</dt><dd><CurrentElementValue element={step.hostElement} label={step.hostLabel} /></dd></div><div><dt>客运</dt><dd><CurrentElementValue element={step.guestElement} label={step.guestLabel} /></dd></div></dl>
          <p className="current-copy">{step.explanation}</p>
          <p className="current-meta">{step.boundaryMethod}</p>
        </section>)}
      </InfoCard>
    </details>

    <details className="current-disclosure current-technical">
      <summary>计算说明与版本</summary>
      <YunQiTimeDetails entries={mapCalculationTimes({ summary, stages: viewModel.timeline, inputTime: viewModel.inputTime, movements: learning.movements })} />
      <InfoCard label="规则结果说明">
        <p className="current-copy">按本次计算结果逐条说明，供规则学习与核对。</p>
        <ul>{viewModel.explanations.map((explanation) => <li key={explanation}>{explanation}</li>)}</ul>
        <p className="current-copy">教学扩展版本：<code>{learning.ruleVersion}</code></p>
        {learning.notes.map((note, index) => <p className="current-copy" key={index}>{note}</p>)}
      </InfoCard>
      <InfoCard label="追溯信息">
        <p className="current-copy">YunQi 当前查询 API · {viewModel.contractId}</p>
        <p className="current-copy">{viewModel.ruleVersion} · 北京时间 UTC+08</p>
        <p className="current-meta">规则实现基线，待正式专家冻结与验证。</p>
      </InfoCard>
    </details>
  </div>;
}
