import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { CurrentYunQiViewModel } from '../presentation/view-model';
import { CurrentStepCard } from './CurrentStepCard';
import { CurrentSummary } from './CurrentSummary';
import { SixQiTimeline } from './SixQiTimeline';
import { TheoryAndTraceabilityPanel } from './TheoryAndTraceabilityPanel';

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
          <p className="section-label">Workbench / Current</p>
          <h2>当前五运六气</h2>
          <p className="current-yunqi-hero__summary">
            基于固定北京时间 UTC+08 的规范输入，呈现当前运气年与六步位置。
          </p>
        </div>
        <div className="current-yunqi-hero__time">
          <span>规范输入时间</span>
          <YunQiTimeDisplay value={viewModel.inputTime} />
        </div>
      </header>

      <CurrentSummary summary={viewModel.summary} />
      <CurrentStepCard step={viewModel.currentStep} />
      <SixQiTimeline
        steps={viewModel.timeline}
        currentStepIndex={viewModel.currentStep.index}
      />
      <TheoryAndTraceabilityPanel
        explanations={viewModel.explanations}
        ruleVersion={viewModel.ruleVersion}
      />
    </div>
  );
}
