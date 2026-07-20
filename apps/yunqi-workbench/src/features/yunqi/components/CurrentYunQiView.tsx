import { AsyncState } from '../../../components/feedback/AsyncState';
import { useCurrentYunQiQuery } from '../hooks/useCurrentYunQiQuery';
import { mapCurrentYunQi } from '../presentation/map-current-yunqi';
import { CurrentYunQiPage } from './CurrentYunQiPage';

export function CurrentYunQiView() {
  const query = useCurrentYunQiQuery();

  return (
    <AsyncState
      data={query.data}
      error={query.error}
      isPending={query.isPending}
      onRetry={() => {
        void query.refetch();
      }}
      renderData={(data) => (
        <CurrentYunQiPage viewModel={mapCurrentYunQi(data)} />
      )}
    />
  );
}
