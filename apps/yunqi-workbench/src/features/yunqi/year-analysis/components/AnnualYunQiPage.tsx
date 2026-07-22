import { useState } from 'react';
import { RuleExplanationPanel } from '../../components/RuleExplanationPanel';
import { TraceabilityPanel } from '../../components/TraceabilityPanel';
import { YunQiYearSummaryPanel } from '../../components/YunQiYearSummaryPanel';
import type { AnnualYunQiViewModel } from '../../presentation/view-model';
import { AnnualSixQiDetailPanel } from './AnnualSixQiDetailPanel';
import { AnnualSixQiSelector } from './AnnualSixQiSelector';

export interface AnnualYunQiPageProps {
  readonly viewModel: AnnualYunQiViewModel;
}

export function AnnualYunQiPage({ viewModel }: AnnualYunQiPageProps) {
  return (
    <AnnualYunQiContent
      key={viewModel.summary.year}
      viewModel={viewModel}
    />
  );
}

function AnnualYunQiContent({ viewModel }: AnnualYunQiPageProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(
    viewModel.stages[0].index,
  );
  const selected = viewModel.stages.find(
    (stage) => stage.index === selectedStepIndex,
  );

  if (!selected) {
    throw new Error('Selected annual Six-Qi stage is missing');
  }

  return (
    <div className="annual-yunqi-page">
      <YunQiYearSummaryPanel summary={viewModel.summary} />
      <AnnualSixQiSelector
        onSelect={setSelectedStepIndex}
        selectedStepIndex={selectedStepIndex}
        stages={viewModel.stages}
      />
      <AnnualSixQiDetailPanel stage={selected} />
      <RuleExplanationPanel explanations={viewModel.explanations} />
      <TraceabilityPanel
        dataSource="YunQi 年度查询 API"
        ruleVersion={viewModel.ruleVersion}
      />
    </div>
  );
}
