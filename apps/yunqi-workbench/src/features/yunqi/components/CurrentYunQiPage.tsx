import { Link } from 'react-router-dom';
import type { LearningViewModel } from '../presentation/map-learning';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { CurrentYunQiViewModel } from '../presentation/view-model';
import { CurrentStepCard } from './CurrentStepCard';
import { RuleExplanationPanel } from './RuleExplanationPanel';
import { SixQiTimeline } from './SixQiTimeline';
import { TraceabilityPanel } from './TraceabilityPanel';
import { YunQiYearSummaryPanel } from './YunQiYearSummaryPanel';
import { ClassicalPassages, MovementCard, RelationHint } from './LearningPanels';

export interface CurrentYunQiPageProps {
  readonly viewModel: CurrentYunQiViewModel;
  readonly learning: LearningViewModel;
}

export function CurrentYunQiPage({
  viewModel,
  learning,
}: CurrentYunQiPageProps) {
  return (
    <div className="current-yunqi-page">
      <header className="current-yunqi-hero">
        <div>
          <h2>当前五运六气</h2>
          <p className="current-yunqi-hero__summary">
            先看全年运气与当下时气，按需展开其他阶段和经典依据。
          </p>
          <Link className="context-link" to={`/yunqi/year/${viewModel.summary.year}`}>
            查看 {viewModel.summary.year} 年六气
          </Link>
        </div>
        <div className="current-yunqi-hero__time">
          <span>本次查询时间</span>
          <YunQiTimeDisplay value={viewModel.inputTime} />
        </div>
      </header>

      <YunQiYearSummaryPanel summary={viewModel.summary} />
      <div className="current-stage-pair">
        <MovementCard movement={learning.currentMovement} />
        <CurrentStepCard step={viewModel.currentStep} />
      </div>
      <section className="learning-relations" aria-label="运气关系简明提示">
        <RelationHint relation={learning.annualRelation} />
        <RelationHint relation={learning.currentQi} />
      </section>
      <p className="learning-boundary">以上术语解释传统理论关系，不能据此判断病情轻重或个人疾病风险。</p>
      <div className="classical-pair">
        <ClassicalPassages title="这一年 · 经典原文" passages={learning.annualPassages} />
        <ClassicalPassages title="这一阶段 · 经典原文" passages={learning.currentPassages} />
      </div>
      <details className="workbench-disclosure annual-disclosure">
        <summary>
          <span>展开全年六气</span>
          <span className="workbench-disclosure__hint">查看其他阶段与交接时间</span>
        </summary>
        <SixQiTimeline
          steps={viewModel.timeline}
          currentStepIndex={viewModel.currentStep.index}
        />
      </details>
      <details className="workbench-disclosure">
        <summary>
          <span>计算说明与版本</span>
          <span className="workbench-disclosure__hint">核对规则依据及时间标准</span>
        </summary>
        <RuleExplanationPanel explanations={viewModel.explanations} />
        <div className="learning-notes">
          <p>教学扩展版本：<code>{learning.ruleVersion}</code></p>
          {learning.notes.map((note, index) => <p key={index}>{note}</p>)}
        </div>
        <TraceabilityPanel
          dataSource="YunQi 当前查询 API"
          ruleVersion={viewModel.ruleVersion}
        />
      </details>
    </div>
  );
}
