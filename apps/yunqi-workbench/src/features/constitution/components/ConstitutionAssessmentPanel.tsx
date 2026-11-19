import { useRef } from 'react';
import { AsyncState } from '../../../components/feedback/AsyncState';
import { InlineText } from '../../../components/design/InlineText';
import { useConstitutionQuestionnaire } from '../hooks/useConstitution';
import { mapQuestionnaire, type ConstitutionContextViewModel } from '../presentation/map-constitution';
import { ConstitutionForm } from './ConstitutionForm';
import { ConstitutionContext, ConstitutionContextDetails } from './ConstitutionContext';

/** Mounting owns one local answer session; removing the panel discards it. */
export function ConstitutionAssessmentPanel({ context, onEnd, actionsEnabled = true }: { readonly context?: ConstitutionContextViewModel; readonly onEnd?: () => void; readonly actionsEnabled?: boolean }) {
  const questionnaire = useConstitutionQuestionnaire();
  // Once this mount has shown a settled questionnaire, a failed background refresh keeps the
  // cached data so the answer session survives; a reopened session still surfaces the failure.
  const established = useRef(false);
  if (questionnaire.data && !questionnaire.isError && !questionnaire.isFetching) established.current = true;
  const blocking = !questionnaire.data || (questionnaire.isError && !established.current);
  return (
    <div className="constitution-workspace">
      {blocking ? <ConstitutionContext context={context} /> : null}
      <AsyncState
        data={questionnaire.data}
        error={blocking ? questionnaire.error : null}
        isPending={questionnaire.isPending}
        loadingMessage="正在加载体质量表"
        errorMessage="体质量表加载失败"
        onRetry={() => { void questionnaire.refetch(); }}
        renderData={(data) => <ConstitutionForm questionnaire={mapQuestionnaire(data)} context={context} onEnd={onEnd} actionsEnabled={actionsEnabled} />}
      />
      {blocking ? <ConstitutionContextDetails context={context} /> : null}
      {blocking && onEnd ?
        <footer className="constitution-session-footer"><InlineText>答卷仅存本次会话，不入库 · 结束即销毁</InlineText></footer>
      : null}
    </div>
  );
}
