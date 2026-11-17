import { useBirthComparisonMutation } from '../../hooks/useLearningQueries';
import { mapBirthView } from '../presentation/map-birth-view';

export function useBirthComparison() {
  const mutation = useBirthComparisonMutation();
  return {
    result: mutation.isSuccess && mutation.data ? mapBirthView(mutation.data) : undefined,
    isPending: mutation.isPending,
    isError: mutation.isError,
    reset: mutation.reset,
    submit: mutation.mutate,
  };
}
