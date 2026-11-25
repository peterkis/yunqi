import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';
import { RelationChip } from '../../../components/design/RelationChip';
import { InlineText } from '../../../components/design/InlineText';
import { MoreRowSummary } from '../../../components/design/MoreRow';
import { ElementDot } from '../../../components/design/ElementDot';
import { SegmentedText } from '../../../components/design/SegmentedText';
import type { ConstitutionAssessmentViewModel, ConstitutionContextViewModel } from '../presentation/map-constitution';

export function ConstitutionResults({ assessment, context, children, reveal = false }: {
  readonly assessment: ConstitutionAssessmentViewModel;
  readonly context?: ConstitutionContextViewModel;
  readonly children?: ReactNode;
  readonly reveal?: boolean;
}) {
  const visible = useSessionVisible();
  const [revealing, setRevealing] = useState(reveal && visible);
  const birth = context?.birth;
  const [standardsOpen, setStandardsOpen] = useState(false);
  const standardsId = useId();
  const mixed = assessment.matchedTypes.length >= 2;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const heading = headingRef.current;
    const active = document.activeElement;
    if (visible && !heading?.closest('[inert]') && (active === document.body || heading?.closest('form')?.contains(active))) {
      heading?.focus();
    }
  }, []);
  useEffect(() => {
    if (!visible) { setRevealing(false); return; }
    if (!revealing) return;
    // The marker is consumed by state, never by an animation event. Returning
    // to a retained result must not replay the submit-only reveal.
    const timer = setTimeout(() => setRevealing(false), 400);
    return () => clearTimeout(timer);
  }, [visible, revealing]);
  return (
    <section className="constitution-result-view" aria-label="体质测评结果" data-reveal={revealing}>
      <section className="constitution-card constitution-decision" aria-label="量表判定">
        <header className="constitution-decision-header">
          <p className="constitution-eyebrow">判定</p>
          <div className="constitution-decision-title">
            <h4 className="constitution-result-title" ref={headingRef} tabIndex={-1}>{assessment.decision}</h4>
            {mixed && <span className="constitution-match-count num">{assessment.matchedTypes.length} 项达标</span>}
            {assessment.tendencyTypes.length > 0 && <div className="constitution-tendency-types" role="group" aria-label="倾向体质">
              {assessment.tendencyTypes.map(type => <RelationChip key={type.id} label={`${type.shortName} 倾向`} tone="favorable" />)}
            </div>}
          </div>
          <button type="button" aria-expanded={standardsOpen} aria-controls={standardsId}
            onClick={() => setStandardsOpen(open => !open)}>判定标准 <Info aria-hidden="true" /></button>
        </header>
        {mixed ? <div className="constitution-matched-types" role="group" aria-label="符合判定的体质">
          {[true, false].map(leading => {
            const tier = assessment.matchedTypes.filter(type => (type.score === assessment.matchedTypes[0].score) === leading);
            return tier.length > 0 && <div className="constitution-match-tier" key={String(leading)} data-leading={leading}
              role="group" aria-label={leading ? '最高转化分' : '其余达标项'}>
              {tier.map(type => <span className="constitution-match-chip" key={type.id}>
                {type.name} <b className="num">{Math.round(type.score)}</b>
              </span>)}
            </div>;
          })}
        </div> : null}
        <div className="constitution-standards constitution-meta num" id={standardsId} hidden={!standardsOpen}>
          <p>转化分 = 100 ×（原始分 − 条目数）÷（4 × 条目数）</p>
          <p>偏颇质：转化分 ≥40 为“是”，≥30 且 &lt;40 为“倾向是”。</p>
          <p>平和质本类须 ≥60。在此前提下，其余均 &lt;30 为“是”；其余均 &lt;40 且未达前项为“基本是”。</p>
        </div>
      </section>
      <section className="constitution-card constitution-score-card" aria-label="九种体质转化分">
        <header className="constitution-chart-header"><h4 className="constitution-eyebrow">九质转化分</h4><span className="num"><InlineText>刻度 30 · 40</InlineText></span></header>
        <div className="constitution-chart-plot">
          <ul className="constitution-bars" aria-label="九种体质转化分">
            {assessment.results.map((result, index) => <li key={result.id} className="constitution-bar" data-tone={result.tone}
              data-balanced={result.id === 'balanced' || undefined} style={{ '--constitution-bar-index': index } as CSSProperties}>
              <span className="constitution-bar-label">{result.shortName}</span>
              <div className="constitution-bar-track" role="img" aria-label={result.chartLabel}>
                <span className="constitution-bar-fill" style={{ '--constitution-fill': result.fillWidth } as CSSProperties} />
              </div>
              <span className="constitution-bar-score num">{result.displayScore}</span>
            </li>)}
          </ul>
          <div className="constitution-chart-guides" aria-hidden="true">
            <span className="constitution-chart-guide constitution-chart-guide--30" />
            <span className="constitution-chart-guide constitution-chart-guide--40" />
          </div>
        </div>
      </section>
      <section className="constitution-card constitution-reference-card" aria-label="与运气互参">
        <h4 className="constitution-eyebrow">与运气互参</h4>
        <dl className="constitution-reference-rows">
          <div><dt>体质</dt><dd className="constitution-reference-summary" aria-label={assessment.referenceLabel}>
            <strong><InlineText>{assessment.referenceSummary}</InlineText></strong>
            {assessment.referenceLeaders.length > 0 && <span className="constitution-reference-leaders">
              {assessment.referenceLeaders.map((name, index, names) => <span key={name}>{index === 0 ? '（主：' : ''}{name}{index === names.length - 1 ? '）' : '、'}</span>)}
            </span>}
            {assessment.referenceTendency && <>{'\n'}<span className="constitution-reference-tendency"><InlineText>{assessment.referenceTendency}</InlineText></span></>}
          </dd></div>
          <div><dt className="constitution-reference-birth-label">先天{birth?.dahanSplit && <span className="constitution-dahan-badge">大寒交界</span>}</dt>
            <dd>{birth?.candidates.length ? birth.candidates.map((candidate, index) => <span className="constitution-context-candidate" key={index}>
              {birth.ambiguous && <span className="constitution-candidate-prefix">{birth.dahanSplit ? (index === 0 ? '交节前' : '交节起') : candidate.label}</span>}
              {candidate.yearElement ? <ElementDot element={candidate.yearElement} label={candidate.yearSummary} /> : <SegmentedText>{candidate.yearSummary}</SegmentedText>}
            </span>) : '未填写'}</dd>
          </div>
          <div><dt>当下</dt><dd>{context ? <span className="constitution-current-reference">
            {context.current.stages[0] && <><SegmentedText>{context.current.stages[0].name}</SegmentedText>{' · '}</>}
            {context.current.element ? <ElementDot element={context.current.element} label={context.current.elementLabel} /> : <SegmentedText>{context.current.elementLabel}</SegmentedText>}
          </span> : '当前运气暂不可用'}</dd></div>
        </dl>
        <p className="constitution-meta">体质、先天、当下三者并列供医师综合判断，系统不自动辨证、不给方药。</p>
      </section>
      <div className="constitution-notes">
        <details className="constitution-disclosure"><MoreRowSummary>判定说明与边界</MoreRowSummary><p>{assessment.summary}</p><p>{assessment.boundaryNote}</p><p>九项分别判定，可同时符合多质或倾向。兼夹标签分值取整，分数条保留一位小数，判定采用未取整分数。</p></details>
        {children}
      </div>
    </section>
  );
}
