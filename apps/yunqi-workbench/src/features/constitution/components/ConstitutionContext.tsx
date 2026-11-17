import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { YunQiTimeDetails } from '../../../components/time/YunQiTimeDetails';
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
      {context ? <p className="constitution-context-time"><YunQiTimeDisplay value={context.current.time} variant="compact" /></p> : null}
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
          <p>{birth.precision === 'date' ? '可能区间（起点含、终点不含）：' : '出生时刻：'}<YunQiTimeDisplay value={candidate.from} variant="compact" showStandard={false} />
            {birth.precision === 'date' ? <> → <YunQiTimeDisplay value={candidate.until} variant="compact" showStandard={false} /></> : null}</p>
        </section>)}
      </details> : null}
      {context ? <details className="constitution-time-details">
        <summary>计算说明与版本</summary>
        <YunQiTimeDetails entries={[
          { label: '当下快照', start: context.current.time },
          ...(birth ? birth.candidates.map((candidate) => ({ label: candidate.label, start: candidate.from, ...(birth.precision === 'date' ? { end: candidate.until } : {}) })) : []),
        ]} />
        <p>{context.current.contractId} · {context.current.ruleVersion} · {context.current.learningRuleVersion}</p>
      </details> : null}
    </aside>
  );
}
