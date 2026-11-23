import type { FormEvent } from 'react';
import { InfoCard } from '../../../../components/design/InfoCard';
import { EmptyState, ErrorState, LoadingState } from '../../../../components/feedback/FeedbackStates';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { DrilldownResultNotes } from '../../year-analysis/components/DrilldownResultNotes';
import { DrilldownYearSummaryCard } from '../../year-analysis/components/DrilldownYearSummaryCard';
import type { TimeAnalysisYunQiViewModel } from '../../presentation/view-model';
import { mapCalculationTimes } from '../../presentation/map-drilldown';
import { TimeAnalysisForm } from './TimeAnalysisForm';
import { TimeAnalysisSixQiRail } from './TimeAnalysisSixQiRail';
import { TimeAnalysisStageDetailPanel } from './TimeAnalysisStageDetailPanel';

export interface TimeAnalysisPageProps {
  readonly inputError: string | null;
  readonly inputValue: string;
  readonly isDirty: boolean;
  readonly isError: boolean;
  readonly isPending: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onInvalid: () => void;
  readonly onRetry: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly viewModel: TimeAnalysisYunQiViewModel | null;
}

export function TimeAnalysisPage({
  inputError,
  inputValue,
  isDirty,
  isError,
  isPending,
  onInputChange,
  onInvalid,
  onRetry,
  onSubmit,
  viewModel,
}: TimeAnalysisPageProps) {
  return (
    <div className="drilldown-page">
      <InfoCard label="提交后分析">
        <h2 className="drilldown-title">指定时点分析</h2>
        <p className="drilldown-copy">填写日期和时刻，核对该时点的五运六气与所处阶段。</p>
        <TimeAnalysisForm
          inputError={inputError}
          inputValue={inputValue}
          isPending={isPending}
          onInputChange={onInputChange}
          onInvalid={onInvalid}
          onSubmit={onSubmit}
        />
      </InfoCard>

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
          <DrilldownResultNotes
            explanations={viewModel.explanations}
            dataSource="YunQi 指定时点计算 API"
            ruleVersion={viewModel.ruleVersion}
            times={mapCalculationTimes({ ...viewModel, inputTime: viewModel.analysisTime })}
          />
        </section>
      ) : null}
    </div>
  );
}
