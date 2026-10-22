import { Outlet, useParams } from 'react-router-dom';
import { parseYearParam } from '../../../../lib/year-validator';
import { YearSelector } from './YearSelector';

export function YearAnalysisLayout() {
  const { year: yearParam } = useParams<'year'>();
  const yearResult = parseYearParam(yearParam);

  return (
    <div className="annual-yunqi-layout">
      <header>
        <h2>年度五运六气分析</h2>
        <p>选择年份，查看该运气年的五运六气与六步交接。</p>
        <YearSelector
          selectedYear={yearResult.ok ? yearResult.year : undefined}
        />
      </header>
      <Outlet />
    </div>
  );
}
