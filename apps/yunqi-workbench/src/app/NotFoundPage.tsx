import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="feedback-state feedback-state--empty">
      <div>
        <p className="section-label">404</p>
        <h2>页面未找到</h2>
        <p>该地址不属于当前工作台已批准的功能范围。</p>
        <Link to="/yunqi/current">返回当前五运六气</Link>
      </div>
    </section>
  );
}
