import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import type { ConstitutionContextViewModel } from '../presentation/map-constitution';

export function ConstitutionContext({ context }: { readonly context?: ConstitutionContextViewModel }) {
  const birth = context?.birth;
  return (
    <aside className="constitution-context" aria-label="本次测评对照背景">
      <dl className="constitution-context-rows">
        <div><dt>当下</dt><dd>{context?.current.summary ?? '当前快照尚未载入'}</dd></div>
        {birth ? <div><dt>先天</dt><dd>{birth.candidates.map((candidate, index) => (
          <span className="constitution-context-candidate" key={index}>{birth.ambiguous ? `${candidate.label}：` : ''}{candidate.summary}</span>
        ))}</dd></div> : null}
      </dl>
      {context ? <p className="constitution-context-time"><YunQiTimeDisplay value={context.current.time} /></p> : null}
      {birth ? <details className="constitution-context-details">
        <summary>本次对照快照与候选区间</summary>
        <p>{context.current.detail}</p>
        <p>{context.current.qiDetail}</p>
        <p>{context.current.movementDetail}</p>
        {birth.ambiguous ? <p>出生时刻不详，所有候选共用一份答卷，分别保留供医师参照。</p> : null}
        {birth.candidates.map((candidate, index) => <section className="constitution-birth-candidate" key={index} aria-label={candidate.label}>
          <h4>{candidate.label}</h4>
          <p>{candidate.detail}</p>
          <p>{candidate.qiDetail}</p>
          <p>{candidate.movementDetail}</p>
          <p>{birth.precision === 'date' ? '可能区间（起点含、终点不含）：' : '出生时刻：'}<YunQiTimeDisplay value={candidate.from} />
            {birth.precision === 'date' ? <> 至 <YunQiTimeDisplay value={candidate.until} /></> : null}</p>
        </section>)}
      </details> : null}
    </aside>
  );
}
