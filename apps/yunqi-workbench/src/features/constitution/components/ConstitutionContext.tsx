import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ElementDot } from '../../../components/design/ElementDot';
import { InlineText } from '../../../components/design/InlineText';
import { SegmentedText } from '../../../components/design/SegmentedText';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { YunQiTimeDetails } from '../../../components/time/YunQiTimeDetails';
import type { ConstitutionContextViewModel } from '../presentation/map-constitution';

export function ConstitutionContext({ context, children }: { readonly context?: ConstitutionContextViewModel; readonly children?: ReactNode }) {
  const birth = context?.birth;
  return (
    <aside className="constitution-context" aria-label="本次测评对照背景">
      <dl className="constitution-context-rows">
        <div><dt>当下</dt><dd>{context?.current.element ? <ElementDot compact element={context.current.element} label={context.current.summary} /> : <SegmentedText>{context?.current.summary ?? '当前快照尚未载入'}</SegmentedText>}</dd></div>
        <div><dt>先天</dt><dd>{birth?.candidates.length ? birth.candidates.length > 1 ?
          <span className="num" role="group" aria-label={birth.candidates.map((candidate) => `${candidate.label}：${candidate.summary}`).join('；')}>{birth.candidates.length} 个候选</span>
          : <SegmentedText>{birth.candidates[0].summary}</SegmentedText>
          : <Link to="/yunqi/birth">未填写 · 去对照 ›</Link>}</dd></div>
      </dl>
      {children}
    </aside>
  );
}

export function ConstitutionContextDetails({ context }: { readonly context?: ConstitutionContextViewModel }) {
  const birth = context?.birth;
  return <>
      {context ? <details className="constitution-disclosure constitution-time-details">
        <summary>计算说明与版本</summary>
        <p className="constitution-context-time"><YunQiTimeDisplay value={context.current.time} variant="compact" /></p>
        <YunQiTimeDetails entries={[
          { label: '当下快照', start: context.current.time },
          ...(birth ? birth.candidates.map((candidate) => ({ label: candidate.label, start: candidate.from, ...(birth.precision === 'date' ? { end: candidate.until } : {}) })) : []),
        ]} />
        <p className="num"><InlineText>{`${context.current.contractId} · ${context.current.ruleVersion} · ${context.current.learningRuleVersion}`}</InlineText></p>
      </details> : null}
      {birth ? <details className="constitution-disclosure constitution-context-details">
        <summary>本次对照快照与候选区间</summary>
        <p><InlineText>{context.current.detail}</InlineText></p>
        <p><InlineText>{context.current.qiDetail}</InlineText></p>
        <p><InlineText>{context.current.movementDetail}</InlineText></p>
        {birth.ambiguous ? <p>出生时刻不详，所有候选共用一份答卷，分别保留供医师参照。</p> : null}
        {birth.candidates.map((candidate, index) => <section className="constitution-birth-candidate" key={index} aria-label={candidate.label}>
          <h4>{candidate.label}</h4>
          <p><InlineText>{candidate.detail}</InlineText></p>
          <p><InlineText>{candidate.qiDetail}</InlineText></p>
          <p><InlineText>{candidate.movementDetail}</InlineText></p>
          <p>{birth.precision === 'date' ? '可能区间（起点含、终点不含）：' : '出生时刻：'}<YunQiTimeDisplay value={candidate.from} variant="compact" />
            {birth.precision === 'date' ? <> → <YunQiTimeDisplay value={candidate.until} variant="compact" /></> : null}</p>
        </section>)}
      </details> : null}
    </>;
}
