import { mapLearning } from '../../yunqi/presentation/map-learning';
import { AsyncState } from '../../../components/feedback/AsyncState';
import { useLearningCurrentQuery } from '../../yunqi/hooks/useLearningQueries';
import { ConstitutionAssessmentPanel } from '../components/ConstitutionAssessmentPanel';
import { mapConstitutionContext } from '../presentation/map-constitution';
import { PanelSummary } from '../../../components/layout/PanelSummary';
import { mapPanelSummary } from '../../yunqi/presentation/panel-summary';

export function ConstitutionPage() {
  const current = useLearningCurrentQuery();
  const learning = current.data ? mapLearning(current.data) : undefined;
  return (
    <div className="constitution-page">
      <h2 className="visually-hidden">中医体质测评</h2>
      {learning ? <PanelSummary viewModel={mapPanelSummary(learning.facts.summary, { step: learning.facts.currentStep, relation: learning.currentQi })} /> : null}
      {!learning ? <AsyncState data={current.data} error={current.error} isPending={current.isPending} loadingMessage="正在加载当前运气" errorMessage="当前运气暂不可用，不影响量表作答" onRetry={() => { void current.refetch(); }} renderData={() => null} /> : null}
      <ConstitutionAssessmentPanel context={learning ? mapConstitutionContext(learning) : undefined} />
    </div>
  );
}
