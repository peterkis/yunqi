import { useLearningCurrentQuery } from '../../hooks/useLearningQueries';
import { mapLearning } from '../../presentation/map-learning';

/** Wait for the current API response; do not default from a stale failed cache. */
export function useYearEntryDefault() {
  const query = useLearningCurrentQuery();
  return query.isSuccess && !query.isFetching
    ? mapLearning(query.data).facts.summary.year
    : undefined;
}
