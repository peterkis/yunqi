import { Link } from 'react-router-dom';
import { InfoCard } from '../components/design/InfoCard';

export function NotFoundPage() {
  return (
    <div className="drilldown-page">
      <InfoCard label="地址未匹配" meta="404">
        <h2 className="drilldown-title">页面未找到</h2>
        <p className="drilldown-copy">该地址不属于当前工作台已批准的功能范围。</p>
        <Link className="drilldown-link" to="/yunqi/current">返回当前五运六气</Link>
      </InfoCard>
    </div>
  );
}
