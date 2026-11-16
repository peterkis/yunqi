import { AsyncState } from '../../../components/feedback/AsyncState';
import { useConstitutionQuestionnaire } from '../hooks/useConstitution';
import { mapQuestionnaire } from '../presentation/map-constitution';
import { ConstitutionForm } from './ConstitutionForm';

/** Mounting owns one local answer session; removing the panel discards it. */
export function ConstitutionAssessmentPanel() {
  const questionnaire = useConstitutionQuestionnaire();
  return (
    <AsyncState
      data={questionnaire.data}
      error={questionnaire.error}
      isPending={questionnaire.isPending}
      loadingMessage="正在加载体质量表"
      errorMessage="体质量表加载失败"
      onRetry={() => { void questionnaire.refetch(); }}
      renderData={(data) => <ConstitutionForm questionnaire={mapQuestionnaire(data)} />}
    />
  );
}
