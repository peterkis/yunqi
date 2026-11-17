import { AsyncState } from '../../../components/feedback/AsyncState';
import { useLearningCurrentQuery } from '../hooks/useLearningQueries';
import { mapLearning } from '../presentation/map-learning';
import { CurrentClassicsPage } from './CurrentClassicsPage';

export function CurrentClassicsView() {
  const query = useLearningCurrentQuery();
  return <AsyncState data={query.data} error={query.error} isPending={query.isPending}
    onRetry={() => { void query.refetch(); }}
    renderData={(data) => <CurrentClassicsPage learning={mapLearning(data)} />} />;
}
