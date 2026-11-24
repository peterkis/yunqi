import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ElementDot } from '../../../components/design/ElementDot';
import { InlineText } from '../../../components/design/InlineText';
import { MoreRowSummary } from '../../../components/design/MoreRow';
import { SegmentedText } from '../../../components/design/SegmentedText';
import { YunQiTimeDisplay } from '../../../components/time/YunQiTimeDisplay';
import { YunQiTimeDetails } from '../../../components/time/YunQiTimeDetails';
import type { ConstitutionContextViewModel } from '../presentation/map-constitution';

const annualBoundaryBadges = new Map([
  ['大寒交节前', { text: '大寒前', tone: 'before' }],
  ['大寒交节起', { text: '大寒起', tone: 'from' }],
]);

function ContextFact({ fact }: { readonly fact: Pick<ConstitutionContextViewModel['current'], 'periodLabel' | 'elementLabel' | 'element'> }) {
  return <span className="constitution-context-fact">
    <span className="constitution-context-period"><SegmentedText>{fact.periodLabel}</SegmentedText></span>
    {fact.element ? <ElementDot element={fact.element} label={fact.elementLabel} /> : <span>{fact.elementLabel}</span>}
  </span>;
}

export function ConstitutionContext({ context, children }: { readonly context?: ConstitutionContextViewModel; readonly children?: ReactNode }) {
  const candidates = context?.birth?.candidates ?? [];
  const twoAnnualCandidates = context?.birth?.precision === 'year' && candidates.length === 2;
  return (
    <aside className="constitution-context" aria-label="本次测评对照背景">
      <dl className="constitution-context-rows" data-annual-pair={twoAnnualCandidates || undefined}
        aria-label={twoAnnualCandidates ? '当下与两个先天年度候选' : undefined}>
        <div><dt>当下</dt><dd>{context ? <ContextFact fact={context.current} /> : '当前快照尚未载入'}</dd></div>
        {twoAnnualCandidates ? candidates.map(candidate => {
          const badge = annualBoundaryBadges.get(candidate.label);
          return <div key={candidate.label}>
            <dt title={`先天 · ${candidate.label}`}>先天{' '}
              <span className="constitution-boundary-badge" data-boundary={badge?.tone}>{badge?.text ?? candidate.label}</span>
            </dt>
            <dd><ContextFact fact={candidate} /></dd>
          </div>;
        }) : <div><dt>先天</dt><dd>{candidates.length > 1 ? (
          <span className="constitution-context-candidates" role="group" aria-label={candidates.map(c => `${c.label}：${c.periodLabel} · ${c.elementLabel}`).join('；')}>
            <span className="num">{candidates.length} 个候选</span>
            {candidates.map((candidate, index) => <ContextFact key={index} fact={candidate} />)}
          </span>
        ) : candidates.length === 1 ? <ContextFact fact={candidates[0]} /> : (
          <Link className="constitution-context-empty" to="/yunqi/birth" aria-label="未填写 · 去对照 ›">
            <span>未填写</span><span>去对照 ›</span>
          </Link>
        )}</dd></div>}
      </dl>
      {children}
    </aside>
  );
}

export function ConstitutionContextDetails({ context, showSnapshot = false }: { readonly context?: ConstitutionContextViewModel; readonly showSnapshot?: boolean }) {
  const birth = context?.birth;
  return <>
      {context ? <details className="constitution-disclosure constitution-time-details">
        <MoreRowSummary>计算说明与版本</MoreRowSummary>
        <p className="constitution-context-time"><YunQiTimeDisplay value={context.current.time} variant="compact" /></p>
        <YunQiTimeDetails entries={[
          { label: '当下快照', start: context.current.time },
          ...(birth ? birth.candidates.map((candidate) => ({ label: candidate.label, start: candidate.from, ...(birth.precision !== 'time' ? { end: candidate.until } : {}) })) : []),
        ]} />
        <p className="num"><InlineText>{`${context.current.contractId} · ${context.current.ruleVersion} · ${context.current.learningRuleVersion}`}</InlineText></p>
      </details> : null}
      {context && (birth || showSnapshot) ? <details className="constitution-disclosure constitution-context-details">
        <MoreRowSummary>本次对照快照与候选区间</MoreRowSummary>
        <p><InlineText>{context.current.detail}</InlineText></p>
        <p><InlineText>{context.current.qiDetail}</InlineText></p>
        <p><InlineText>{context.current.movementDetail}</InlineText></p>
        {!birth && <p>尚未填写先天对照，暂无出生候选区间。</p>}
        {birth?.ambiguous ? <p>出生归属待核对，所有候选共用一份答卷，分别保留供医师参照。</p> : null}
        {birth?.candidates.map((candidate, index) => <section className="constitution-birth-candidate" key={index} aria-label={candidate.label}>
          <h4>{candidate.label}</h4>
          <p><InlineText>{candidate.detail}</InlineText></p>
          {candidate.qiDetail && <p><InlineText>{candidate.qiDetail}</InlineText></p>}
          {candidate.movementDetail && <p><InlineText>{candidate.movementDetail}</InlineText></p>}
          <p>{birth.precision !== 'time' ? '可能区间（起点含、终点不含）：' : '出生时刻：'}<YunQiTimeDisplay value={candidate.from} variant="compact" />
            {birth.precision !== 'time' ? <> → <YunQiTimeDisplay value={candidate.until} variant="compact" /></> : null}</p>
        </section>)}
      </details> : null}
    </>;
}
