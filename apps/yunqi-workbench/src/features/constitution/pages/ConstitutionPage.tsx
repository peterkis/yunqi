import { mapQuestionnaire } from '../presentation/map-constitution';
import { mapLearning } from '../../yunqi/presentation/map-learning';
import { AsyncState } from '../../../components/feedback/AsyncState';
import { LearningSnapshot } from '../../yunqi/components/LearningPanels';
import { useLearningCurrentQuery } from '../../yunqi/hooks/useLearningQueries';
import { ConstitutionForm } from '../components/ConstitutionForm';
import { useConstitutionQuestionnaire } from '../hooks/useConstitution';

export function ConstitutionPage() {
  const questionnaire = useConstitutionQuestionnaire();
  const current = useLearningCurrentQuery();
  return (
    <div className="constitution-page learning-page">
      <header className="learning-page__hero">
        <p className="section-label">当下状态 · 独立测评</p>
        <h2>中医体质测评</h2>
        <p>按量表回顾自身表现，同时参考当前运气。出生运气与量表体质分别解释。</p>
      </header>
      <div className="constitution-layout">
        <AsyncState data={questionnaire.data} error={questionnaire.error} isPending={questionnaire.isPending} loadingMessage="正在加载体质量表" errorMessage="体质量表加载失败" onRetry={() => { void questionnaire.refetch(); }} renderData={(data) => <ConstitutionForm questionnaire={mapQuestionnaire(data)} />} />
        <aside className="constitution-current" aria-label="测评时的当前运气">
          <AsyncState data={current.data} error={current.error} isPending={current.isPending} loadingMessage="正在加载当前运气" errorMessage="当前运气暂不可用，不影响量表作答" onRetry={() => { void current.refetch(); }} renderData={(data) => <LearningSnapshot learning={mapLearning(data)} title="当前运气参考" />} />
          <p className="learning-boundary">量表计分独立于运气计算，不用生日或当前时气修改体质得分。</p>
        </aside>
      </div>
    </div>
  );
}
