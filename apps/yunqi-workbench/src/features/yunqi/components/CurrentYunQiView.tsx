import { useEffect } from 'react';
import { AsyncState } from '../../../components/feedback/AsyncState';
import { useLearningCurrentQuery } from '../hooks/useLearningQueries';
import { mapLearning } from '../presentation/map-learning';
import { CurrentYunQiPage } from './CurrentYunQiPage';
import { CurrentLoadingState } from './CurrentLoadingState';

export function CurrentYunQiView() {
  const query = useLearningCurrentQuery();
  useEffect(() => {
    // The loading wheel contains no text. Start its local title font with the
    // request so the first Ganzhi and stage labels use their final metrics.
    void document.fonts?.load('600 1em "Noto Serif SC"', '甲').catch(() => {});
  }, []);

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
