import { useState } from 'react';
import { DrilldownResultNotes } from './DrilldownResultNotes';
import { DrilldownYearSummaryCard } from './DrilldownYearSummaryCard';
import type { AnnualYunQiViewModel } from '../../presentation/view-model';
import { mapCalculationTimes } from '../../presentation/map-drilldown';
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
    <div className="drilldown-page">
      <DrilldownYearSummaryCard summary={viewModel.summary} />
      <div className="drilldown-page">
        <AnnualSixQiSelector
          onSelect={setSelectedStepIndex}
          selectedStepIndex={selectedStepIndex}
          stages={viewModel.stages}
        />
        <AnnualSixQiDetailPanel stage={selected} />
      </div>
      <DrilldownResultNotes
        explanations={viewModel.explanations}
        dataSource="YunQi 年度查询 API"
        ruleVersion={viewModel.ruleVersion}
        times={mapCalculationTimes(viewModel)}
      />
    </div>
  );
}
