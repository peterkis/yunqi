import { AsyncState } from '../../../../components/feedback/AsyncState';
import { useYunQiYearQuery } from '../../hooks/useYunQiYearQuery';
import { mapAnnualYunQi } from '../../presentation/map-annual-yunqi';
import { AnnualYunQiPage } from './AnnualYunQiPage';

export interface AnnualYunQiViewProps {
  readonly year: number;
}

export function AnnualYunQiView({ year }: AnnualYunQiViewProps) {
  const query = useYunQiYearQuery(year);

  return (
    <AsyncState
      data={query.data}
      error={query.error}
      isPending={query.isPending}
      loadingMessage="正在加载年度五运六气数据"
      errorMessage="年度数据加载失败"
      emptyMessage="所选年份暂无数据"
      onRetry={() => {
        void query.refetch();
      }}
      renderData={(data) => (
        <AnnualYunQiPage viewModel={mapAnnualYunQi(data)} />
      )}
    />
  );
}
