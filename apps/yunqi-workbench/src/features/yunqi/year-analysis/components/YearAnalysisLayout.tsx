import { Outlet, useParams } from 'react-router-dom';
import { parseYearParam } from '../../../../lib/year-validator';
import { YearSelector } from './YearSelector';

export function YearAnalysisLayout() {
  const { year: yearParam } = useParams<'year'>();
  const yearResult = parseYearParam(yearParam);

  return (
    <div className="annual-yunqi-layout">
      <header>
        <p className="section-label">Workbench / Annual</p>
        <h2>年度五运六气分析</h2>
        <p>按规范 URL 年份查询冻结契约结果。</p>
        <YearSelector
          selectedYear={yearResult.ok ? yearResult.year : undefined}
        />
      </header>
      <Outlet />
    </div>
  );
}
