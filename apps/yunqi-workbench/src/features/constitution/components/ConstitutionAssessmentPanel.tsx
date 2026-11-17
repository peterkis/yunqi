import { AsyncState } from '../../../components/feedback/AsyncState';
import { useConstitutionQuestionnaire } from '../hooks/useConstitution';
import { mapQuestionnaire, type ConstitutionContextViewModel } from '../presentation/map-constitution';
import { ConstitutionForm } from './ConstitutionForm';
import { ConstitutionContext } from './ConstitutionContext';

/** Mounting owns one local answer session; removing the panel discards it. */
export function ConstitutionAssessmentPanel({ context, onEnd, actionsEnabled = true }: { readonly context?: ConstitutionContextViewModel; readonly onEnd?: () => void; readonly actionsEnabled?: boolean }) {
  const questionnaire = useConstitutionQuestionnaire();
  return (
    <div className="constitution-workspace">
      <ConstitutionContext context={context} />
      <AsyncState
        data={questionnaire.data}
        error={questionnaire.error}
        isPending={questionnaire.isPending}
        loadingMessage="正在加载体质量表"
        errorMessage="体质量表加载失败"
        onRetry={() => { void questionnaire.refetch(); }}
        renderData={(data) => <ConstitutionForm questionnaire={mapQuestionnaire(data)} context={context} onEnd={onEnd} actionsEnabled={actionsEnabled} />}
      />
      {(!questionnaire.data || questionnaire.isError) && onEnd ?
        <footer className="constitution-session-footer">答卷仅存本次会话，不入库 · 结束即销毁</footer>
      : null}
    </div>
  );
}
