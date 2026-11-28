import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelView } from '../../../../components/layout/PanelView';
import { PanelSummary } from '../../../../components/layout/PanelSummary';
import { mapPanelSummary } from '../../presentation/panel-summary';
import { useCalculateYunQiMutation } from '../../hooks/useCalculateYunQiMutation';
import { mapTimeAnalysisYunQi } from '../../presentation/map-time-analysis-yunqi';
import {
  draftDate, draftClock, normalizeBeijingDateTimeInput, splitTimeInput, type TimeDraft,
} from '../time-input';
import { TimeAnalysisPage } from './TimeAnalysisPage';
import { useTimeAnchorSnapshot } from '../useTimeAnchorSnapshot';
import type { TimeAnchor } from './TimeAnalysisForm';

export function TimeAnalysisView() {
  const mutation = useCalculateYunQiMutation();
  const navigate = useNavigate();
  const snapshot = useTimeAnchorSnapshot();
  const [draft, setDraft] = useState(() => splitTimeInput(snapshot.cached?.now));
  const inputValue = draftDate(draft) + 'T' + draftClock(draft);
  const [inputError, setInputError] = useState<string | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [viewModel, setViewModel] = useState<
    ReturnType<typeof mapTimeAnalysisYunQi> | null
  >(null);

  function handleInputChange(value: TimeDraft) {
    snapshot.refresh.reset();
    setDraft(value);
    setInputError(null);
    if (!mutation.isPending) {
      mutation.reset();
    }
    if (viewModel !== null) {
      setIsDirty(true);
    }
  }

  function fillAnchor(anchor: TimeAnchor) {
    if (anchor === 'midnight' && draftDate(draft)) {
      handleInputChange({ ...draft, hour: '00', minute: '00', second: '00' });
      return;
    }
    if (anchor === 'boundary' && snapshot.cached) {
      handleInputChange(splitTimeInput(snapshot.cached.boundary));
      return;
    }
    snapshot.refresh.mutate(undefined, { onSuccess: fresh => {
      const value = anchor === 'boundary' ? fresh.boundary
        : anchor === 'midnight' ? fresh.now.slice(0, 10) + 'T00:00:00' : fresh.now;
      handleInputChange(splitTimeInput(value));
    } });
  }

  function submitNormalizedDateTime(apiDateTime: string) {
    snapshot.refresh.reset();
    setInputError(null);
    setIsDirty(false);
    setViewModel(null);
    mutation.mutate(
      { dateTime: apiDateTime },
      {
        onSuccess: (data) => {
          setViewModel(mapTimeAnalysisYunQi(data));
        },
      },
    );
  }

  function showInvalidInput() {
    snapshot.refresh.reset();
    mutation.reset();
    setIsDirty(false);
    setViewModel(null);
    setInputError('请输入有效的日期和时刻');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) {
      return;
    }
    const normalized = normalizeBeijingDateTimeInput(inputValue);

    if (!normalized.ok) {
      showInvalidInput();
      return;
    }

    submitNormalizedDateTime(normalized.apiDateTime);
  }

  function handleRetry() {
    const normalized = normalizeBeijingDateTimeInput(inputValue);

    if (!normalized.ok) {
      setInputError('请输入有效的日期和时刻');
      return;
    }

    submitNormalizedDateTime(normalized.apiDateTime);
  }

  return (
    <>
    <PanelView drilldown={{ title: '指定时点', onBack: () => navigate('/yunqi/current'),
      toolbarActions: <button className="specified-time-now" type="button" onClick={() => fillAnchor('now')}
        disabled={mutation.isPending || snapshot.refresh.isPending}>填入此刻</button> }} />
    {viewModel && !isDirty && !mutation.isPending && !mutation.isError && <PanelSummary viewModel={mapPanelSummary(viewModel.summary)} />}
    <TimeAnalysisPage
      inputError={inputError}
      draft={draft}
      anchorYear={snapshot.cached?.year}
      anchorError={snapshot.refresh.isError}
      anchorLoading={snapshot.refresh.isPending}
      onAnchor={fillAnchor}
      isDirty={isDirty}
      isError={mutation.isError}
      isPending={mutation.isPending}
      onInputChange={handleInputChange}
      onInvalid={showInvalidInput}
      onRetry={handleRetry}
      onSubmit={handleSubmit}
      viewModel={viewModel}
    />
    </>
  );
}
