import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { YunQiCalculationDto } from '@yunqi/contracts';
import { useYunQiClient } from '../../../../providers/YunQiClientProvider';
import { currentYunQiQueryOptions } from '../../api/query-options';
import { useBirthComparisonMutation } from '../../hooks/useLearningQueries';
import { useBirthYearComparison } from './useBirthEntry';
import { mapBirthView, mapBirthYearView, type BirthPageViewModel } from '../presentation/map-birth-view';
import { beijingDate, type BirthSubmission } from '../presentation/birth-entry';

interface SubmissionCallbacks {
  onSuccess(): void;
  onSettled(): void;
  ageReferenceDate?: string;
  onDateChanged?(): void;
}

/** Only successful, date-consistent submissions replace the last comparison behind the editor. */
export function useBirthComparison() {
  const exact = useBirthComparisonMutation();
  const annual = useBirthYearComparison();
  const client = useYunQiClient();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<BirthPageViewModel>();
  function resetStatus() { exact.reset(); annual.reset(); }
  function submit(request: BirthSubmission, callbacks?: SubmissionCallbacks) {
    function accept(facts: YunQiCalculationDto, project: () => BirthPageViewModel) {
      const reference = callbacks?.ageReferenceDate;
      if (reference && reference !== beijingDate(facts.input.localTime)) {
        const { queryKey } = currentYunQiQueryOptions(client);
        const observed = queryClient.getQueryData(queryKey);
        // Recompute against the date the comparison actually saw. Do not replace a
        // reference already refreshed to a different date, or let a pending old poll overwrite this one.
        if (!observed || beijingDate(observed.input.localTime) === reference) {
          void queryClient.cancelQueries({ queryKey, exact: true });
          queryClient.setQueryData(queryKey, facts);
        }
        callbacks?.onDateChanged?.();
        return;
      }
      setResult(project());
      callbacks?.onSuccess();
    }
    resetStatus();
    if ('year' in request) {
      annual.mutate(request, { onSuccess: data => accept(data.current.facts, () => mapBirthYearView(data)), onSettled: callbacks?.onSettled });
    } else {
      exact.mutate(request, { onSuccess: data => accept(data.current.facts, () => mapBirthView(data)), onSettled: callbacks?.onSettled });
    }
  }
  return { result, submit, resetStatus, isPending: exact.isPending || annual.isPending,
    isError: exact.isError || annual.isError,
    reset() { resetStatus(); setResult(undefined); } };
}
