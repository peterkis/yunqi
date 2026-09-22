import { useState, type FormEvent } from 'react';
import { useCalculateYunQiMutation } from '../../hooks/useCalculateYunQiMutation';
import { mapTimeAnalysisYunQi } from '../../presentation/map-time-analysis-yunqi';
import {
  normalizeBeijingDateTimeInput,
} from '../time-input';
import { TimeAnalysisPage } from './TimeAnalysisPage';

export function TimeAnalysisView() {
  const mutation = useCalculateYunQiMutation();
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(
    null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [viewModel, setViewModel] = useState<
    ReturnType<typeof mapTimeAnalysisYunQi> | null
  >(null);

  function handleInputChange(value: string) {
    setInputValue(value);
    setInputError(null);
    if (!mutation.isPending) {
      mutation.reset();
    }
    if (viewModel !== null) {
      setIsDirty(true);
    }
  }

  function submitNormalizedDateTime(apiDateTime: string) {
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
    mutation.reset();
    setIsDirty(false);
    setViewModel(null);
    setInputError('请输入合法的北京时间');
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
      setInputError('请输入合法的北京时间');
      return;
    }

    submitNormalizedDateTime(normalized.apiDateTime);
  }

  return (
    <TimeAnalysisPage
      inputError={inputError}
      inputValue={inputValue}
      isDirty={isDirty}
      isError={mutation.isError}
      isPending={mutation.isPending}
      onInputChange={handleInputChange}
      onInvalid={showInvalidInput}
      onRetry={handleRetry}
      onSubmit={handleSubmit}
      viewModel={viewModel}
    />
  );
}
