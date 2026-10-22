import { Link } from 'react-router-dom';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { CurrentYunQiViewModel } from '../presentation/view-model';
import { CurrentStepCard } from './CurrentStepCard';
import { RuleExplanationPanel } from './RuleExplanationPanel';
import { SixQiTimeline } from './SixQiTimeline';
import { TraceabilityPanel } from './TraceabilityPanel';
import { YunQiYearSummaryPanel } from './YunQiYearSummaryPanel';

export interface CurrentYunQiPageProps {
  readonly viewModel: CurrentYunQiViewModel;
}

export function CurrentYunQiPage({
  viewModel,
}: CurrentYunQiPageProps) {
  return (
    <div className="current-yunqi-page">
      <header className="current-yunqi-hero">
        <div>
          <h2>当前五运六气</h2>
          <p className="current-yunqi-hero__summary">
            查看当前时气，再对照全年六步的主气、客气与交接时间。
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

      <CurrentStepCard step={viewModel.currentStep} />
      <YunQiYearSummaryPanel summary={viewModel.summary} />
      <SixQiTimeline
        steps={viewModel.timeline}
        currentStepIndex={viewModel.currentStep.index}
      />
      <RuleExplanationPanel
        explanations={viewModel.explanations}
      />
      <TraceabilityPanel
        dataSource="YunQi 当前查询 API"
        ruleVersion={viewModel.ruleVersion}
      />
    </div>
  );
}
