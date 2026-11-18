import { AsyncState } from '../../../components/feedback/AsyncState';
import { useLearningCurrentQuery } from '../hooks/useLearningQueries';
import { mapLearning } from '../presentation/map-learning';
import { CurrentYunQiPage } from './CurrentYunQiPage';
import { CurrentLoadingState } from './CurrentLoadingState';

export function CurrentYunQiView() {
  const query = useLearningCurrentQuery();

  return (
    <AsyncState
      data={query.data}
      error={query.error}
      isPending={query.isPending}
      renderLoading={(message) => <CurrentLoadingState message={message} />}
      onRetry={() => {
        void query.refetch();
      }}
      renderData={(data) => {
        const learning = mapLearning(data);
        return <CurrentYunQiPage viewModel={learning.facts} learning={learning} />;
      }}
    />
  );
}
