import { Link, Outlet, useParams } from 'react-router-dom';
import { InfoCard } from '../../../../components/design/InfoCard';
import { parseYearParam } from '../../../../lib/year-validator';
import { YearSelector } from './YearSelector';

export function YearAnalysisLayout() {
  const { year: yearParam } = useParams<'year'>();
  const yearResult = parseYearParam(yearParam);

  return (
    <div className="drilldown-page">
      <InfoCard label="年度查询">
        <h2 className="drilldown-title">选择运气年</h2>
        <p className="drilldown-copy">查看该年的岁运、司天、在泉与六气阶段。</p>
        <YearSelector
          selectedYear={yearResult.ok ? yearResult.year : undefined}
        />
        <nav className="drilldown-more" aria-label="更多">
          <Link to="/yunqi/calculate">指定时点 ›</Link>
          <Link to="/yunqi/inquiry">问诊规划 ›</Link>
        </nav>
      </InfoCard>
      <Outlet />
    </div>
  );
}
