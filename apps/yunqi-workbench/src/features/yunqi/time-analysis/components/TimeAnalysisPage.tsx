import type { FormEvent } from 'react';
import { YunQiTimeDisplay } from '../../../../components/time/YunQiTimeDisplay';
import { RuleExplanationPanel } from '../../components/RuleExplanationPanel';
import { TraceabilityPanel } from '../../components/TraceabilityPanel';
import { YunQiYearSummaryPanel } from '../../components/YunQiYearSummaryPanel';
import type { TimeAnalysisYunQiViewModel } from '../../presentation/view-model';
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
  onRetry,
  onSubmit,
  viewModel,
}: TimeAnalysisPageProps) {
  return (
    <div className="time-analysis-page">
      <header className="time-analysis-hero">
        <div>
          <p className="section-label">Workbench / Specified Time</p>
          <h2>指定时点分析</h2>
          <p className="time-analysis-hero__summary">
            输入一个北京标准时间，查看该时点对应的五运六气规则结构。
          </p>
        </div>
      </header>

      <section
        aria-labelledby="time-analysis-form-title"
        className="time-analysis-form-panel"
      >
        <header>
          <p className="section-label">Analysis Input</p>
          <h3 id="time-analysis-form-title">选择分析时间</h3>
          <p>本页面只用于规则结果核对与阶段验证。</p>
        </header>
        <TimeAnalysisForm
          inputError={inputError}
          inputValue={inputValue}
          isPending={isPending}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
        />
      </section>

      {isPending ? (
        <p className="time-analysis-feedback" role="status">
          正在分析指定时点
        </p>
      ) : null}
      {isDirty ? (
        <p className="time-analysis-feedback" role="status">
          输入已修改，请重新分析
        </p>
      ) : null}
      {isError ? (
        <div className="time-analysis-feedback" role="alert">
          <p>指定时点分析失败，请重试</p>
          <button type="button" onClick={onRetry}>
            重试
          </button>
        </div>
      ) : null}
      {!isPending && !isDirty && !isError && viewModel ? (
        <section
          aria-label="指定时点分析结果"
          className="time-analysis-result"
        >
          <header className="time-analysis-result__time">
            <div>
              <p className="section-label">Canonical Analysis Time</p>
              <h3>规范分析时间</h3>
            </div>
            <YunQiTimeDisplay value={viewModel.analysisTime} />
          </header>
          <YunQiYearSummaryPanel summary={viewModel.summary} />
          <TimeAnalysisSixQiRail
            selectedStageIndex={viewModel.selectedStage.index}
            stages={viewModel.stages}
          />
          <TimeAnalysisStageDetailPanel
            stage={viewModel.selectedStage}
          />
          <RuleExplanationPanel
            explanations={viewModel.explanations}
          />
          <TraceabilityPanel
            dataSource="YunQi 指定时点计算 API"
            ruleVersion={viewModel.ruleVersion}
          />
        </section>
      ) : null}
    </div>
  );
}
