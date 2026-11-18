import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useSessionVisible } from '../../../components/layout/SessionVisibility';
import { RelationChip } from '../../../components/design/RelationChip';
import { InlineText } from '../../../components/design/InlineText';
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
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { if (visible) headingRef.current?.focus(); }, []);
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
        <p className="constitution-eyebrow">判定</p>
        <div className="constitution-decision-title">
          <h4 ref={headingRef} tabIndex={-1}>{assessment.decision}</h4>
          {assessment.tendencyTypes.length ? <div className="constitution-tendency-types" role="group" aria-label="倾向体质">
            {assessment.tendencyTypes.map((type) => <RelationChip key={type.id} label={`${type.shortName} 倾向`} tone="favorable" />)}
          </div> : null}
        </div>
        {assessment.matchedTypes.length >= 2 ? <dl className="constitution-type-groups">
          <div className="constitution-matched-types">
            <dt>兼夹</dt><dd>{assessment.matchedTypes.map((type) => <RelationChip key={type.id} label={type.name} tone="neutral" />)}</dd>
          </div>
        </dl> : null}
        <p className="constitution-meta num">偏颇质转化分 ≥40 为“是”、30–39 为“倾向是”；平和质本类需 ≥60，且其余均 &lt;30 为“是”、均 &lt;40 且未达前项为“基本是”。</p>
      </section>
      <section className="constitution-card constitution-score-card" aria-label="九种体质转化分">
        <header className="constitution-chart-header"><h4 className="constitution-eyebrow">九质转化分</h4><span className="num"><InlineText>刻度 30 · 40</InlineText></span></header>
        <ul className="constitution-bars" aria-label="九种体质转化分">
          {assessment.results.map((result, index) => <li key={result.id} className="constitution-bar" data-tone={result.tone} style={{ '--constitution-bar-index': index } as CSSProperties}>
            <span className="constitution-bar-label">{result.shortName}</span>
            <div className="constitution-bar-track" role="img" aria-label={result.chartLabel}>
              <span className="constitution-bar-fill" style={{ '--constitution-fill': result.fillWidth } as CSSProperties} />
              <span className="constitution-bar-tick constitution-bar-tick--30" /><span className="constitution-bar-tick constitution-bar-tick--40" />
            </div>
            <span className="constitution-bar-score num">{result.displayScore}</span>
          </li>)}
        </ul>
      </section>
      <section className="constitution-card constitution-reference-card" aria-label="与运气互参">
        <h4 className="constitution-eyebrow">与运气互参</h4>
        <dl className="constitution-reference-rows">
          <div><dt>体质</dt><dd className="constitution-reference-summary" aria-label={assessment.referenceLabel}><InlineText>{assessment.referenceSummary}</InlineText></dd></div>
          <div><dt>先天</dt><dd>{birth?.candidates.length ? birth.candidates.map((candidate, index) => <span className="constitution-context-candidate" key={index}>{birth.ambiguous ? `${candidate.label}：` : ''}{candidate.yearElement ? <ElementDot element={candidate.yearElement} label={candidate.yearSummary} /> : <SegmentedText>{candidate.yearSummary}</SegmentedText>}</span>) : '未填写'}</dd></div>
          <div><dt>当下</dt><dd>{context ? context.current.element ? <ElementDot element={context.current.element} label={context.current.guestQiSummary} /> : <SegmentedText>{context.current.guestQiSummary}</SegmentedText> : '当前运气暂不可用'}</dd></div>
        </dl>
        <p className="constitution-meta">体质、先天、当下三者并列供医师综合判断，系统不自动辨证、不给方药。</p>
      </section>
      <div className="constitution-notes">
        <details className="constitution-disclosure"><summary>判定说明与边界</summary><p>{assessment.summary}</p><p>{assessment.boundaryNote}</p><p>九项分别判定，可同时符合多质或倾向；分数显示一位小数，判定采用未取整分数。</p></details>
        {children}
      </div>
    </section>
  );
}
