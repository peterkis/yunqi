import { useState } from 'react';
import { useBirthComparisonMutation } from '../../hooks/useLearningQueries';
import { useBirthYearComparison } from './useBirthEntry';
import { mapBirthView, mapBirthYearView, type BirthPageViewModel } from '../presentation/map-birth-view';
import type { BirthSubmission } from '../presentation/birth-entry';

/** Only successful submissions replace the last comparison behind the editor. */
export function useBirthComparison() {
  const exact = useBirthComparisonMutation();
  const annual = useBirthYearComparison();
  const [result, setResult] = useState<BirthPageViewModel>();
  function resetStatus() { exact.reset(); annual.reset(); }
  function submit(request: BirthSubmission, callbacks?: { onSuccess(): void; onSettled(): void }) {
    const accept = (next: BirthPageViewModel) => { setResult(next); callbacks?.onSuccess(); };
    resetStatus();
    if ('year' in request) {
      annual.mutate(request, { onSuccess: data => accept(mapBirthYearView(data)), onSettled: callbacks?.onSettled });
    } else {
      exact.mutate(request, { onSuccess: data => accept(mapBirthView(data)), onSettled: callbacks?.onSettled });
    }
  }
  return { result, submit, resetStatus, isPending: exact.isPending || annual.isPending,
    isError: exact.isError || annual.isError,
    reset() { resetStatus(); setResult(undefined); } };
}
