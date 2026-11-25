import { InfoCard } from '../../../../components/design/InfoCard';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/feedback/FeedbackStates';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { DrilldownYearSummaryCard } from '../../year-analysis/components/DrilldownYearSummaryCard';
import type { TimeAnalysisYunQiViewModel } from '../../presentation/view-model';
import { TimeAnalysisForm, type TimeAnalysisFormProps } from './TimeAnalysisForm';
import { YUNQI_YEAR_RANGE } from '../../../../lib/yunqi-year-range';
import { TimeAnalysisSixQiRail } from './TimeAnalysisSixQiRail';
import { TimeAnalysisStageDetailPanel } from './TimeAnalysisStageDetailPanel';

export interface TimeAnalysisPageProps extends TimeAnalysisFormProps {
  readonly isDirty: boolean;
  readonly isError: boolean;
  readonly onRetry: () => void;
  readonly viewModel: TimeAnalysisYunQiViewModel | null;
}

export function TimeAnalysisPage({
  isDirty,
  isError,
  isPending,
  onRetry,
  viewModel,
  ...form
}: TimeAnalysisPageProps) {
  return (
    <div className="drilldown-page specified-time-page">
      <header className="specified-time-intro">
        <h1>指定时点分析</h1>
        <p>核对任意日期与时刻的五运六气及所处阶段</p>
      </header>
      <TimeAnalysisForm {...form} isPending={isPending} />

      {isPending ? (
        <LoadingState message="正在分析指定时点" />
      ) : null}
      {isDirty ? (
        <EmptyState message="输入已修改，请重新分析" />
      ) : null}
      {isError ? (
        <ErrorState message="指定时点分析失败，请重试" onRetry={onRetry} retryLabel="重试" />
      ) : null}
      {!isPending && !isDirty && !isError && viewModel ? (
        <section
          aria-label="指定时点分析结果"
          className="drilldown-page drilldown-time-result"
        >
          <InfoCard label="规范分析时间" compact>
            <div className="drilldown-time-result__time">
              <YunQiTimeDisplay value={viewModel.analysisTime} variant="compact" />
            </div>
            <p className="drilldown-copy" role="status">分析完成，所选时点位于{viewModel.selectedStage.name}。</p>
          </InfoCard>
          <TimeAnalysisStageDetailPanel
            stage={viewModel.selectedStage}
          />
          <DrilldownYearSummaryCard summary={viewModel.summary} compact />
          <TimeAnalysisSixQiRail
            selectedStageIndex={viewModel.selectedStage.index}
            stages={viewModel.stages}
          />
        </section>
      ) : null}
      <p id="time-analysis-hint" className="specified-time-footnote">
        <span aria-hidden="true">◆</span> 支持 {YUNQI_YEAR_RANGE.min}–{YUNQI_YEAR_RANGE.max} 运气年 · 年界以大寒交节为准
      </p>
    </div>
  );
}
