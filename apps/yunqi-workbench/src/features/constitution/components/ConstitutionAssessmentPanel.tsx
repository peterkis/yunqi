import { useEffect, useRef } from 'react';
import { AsyncState } from '../../../components/feedback/AsyncState';
import { InlineText } from '../../../components/design/InlineText';
import { useConstitutionQuestionnaire } from '../hooks/useConstitution';
import { mapQuestionnaire, type ConstitutionContextViewModel } from '../presentation/map-constitution';
import { ConstitutionForm } from './ConstitutionForm';
import { ConstitutionContext, ConstitutionContextDetails } from './ConstitutionContext';

/** Mounting owns one local answer session; removing the panel discards it. */
export function ConstitutionAssessmentPanel({ context, actionsEnabled = true }: { readonly context?: ConstitutionContextViewModel; readonly actionsEnabled?: boolean }) {
  const questionnaire = useConstitutionQuestionnaire();
  // A refresh failure must preserve an active answer sheet. Finishing it lets
  // the empty entry show a later refresh failure until the next successful load.
  const established = useRef(false);
  useEffect(() => {
    if (questionnaire.data && !questionnaire.isError && !questionnaire.isFetching) established.current = true;
  }, [questionnaire.data, questionnaire.isError, questionnaire.isFetching, questionnaire.dataUpdatedAt]);
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
        renderData={(data) => <ConstitutionForm questionnaire={mapQuestionnaire(data)} context={context}
          onSessionChange={active => { established.current = active; }} actionsEnabled={actionsEnabled} />}
      />
      {blocking ? <ConstitutionContextDetails context={context} /> : null}
      {blocking && context?.birth ?
        <footer className="constitution-session-footer"><InlineText>答卷仅存本次会话，不入库 · 结束即销毁</InlineText></footer>
      : null}
    </div>
  );
}
