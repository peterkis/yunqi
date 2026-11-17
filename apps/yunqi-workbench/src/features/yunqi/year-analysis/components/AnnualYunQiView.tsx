import { AsyncState } from '../../../../components/feedback/AsyncState';
import { PanelSummary } from '../../../../components/layout/PanelSummary';
import { mapPanelSummary } from '../../presentation/panel-summary';
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
      loadingMessage={`正在加载 ${year} 年年度五运六气数据`}
      errorMessage="年度数据加载失败"
      emptyMessage="该年度暂无可展示数据"
      onRetry={() => {
        void query.refetch();
      }}
      renderData={(data) => {
        const viewModel = mapAnnualYunQi(data);
        return <>
          <PanelSummary viewModel={mapPanelSummary(viewModel.summary)} />
          <AnnualYunQiPage viewModel={viewModel} />
        </>;
      }}
    />
  );
}
