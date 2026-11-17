import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { RelationChip } from '../../../components/design/RelationChip';
import { InlineText } from '../../../components/design/InlineText';
import type { ConstitutionAssessmentViewModel, ConstitutionContextViewModel } from '../presentation/map-constitution';

export function ConstitutionResults({ assessment, context }: {
  readonly assessment: ConstitutionAssessmentViewModel;
  readonly context?: ConstitutionContextViewModel;
}) {
  const birth = context?.birth;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <section className="constitution-result-view" aria-label="体质测评结果">
      <section className="constitution-card constitution-decision" aria-label="量表判定">
        <p className="constitution-eyebrow">判定</p>
        <h4 ref={headingRef} tabIndex={-1}>{assessment.decision}</h4>
        <dl className="constitution-type-groups">
          {assessment.matchedTypes.length >= 2 ? <div className="constitution-matched-types">
            <dt>兼夹</dt><dd>{assessment.matchedTypes.map((type) => <RelationChip key={type.id} label={type.name} tone="neutral" />)}</dd>
          </div> : null}
          {assessment.tendencyTypes.length ? <div className="constitution-tendency-types">
            <dt>倾向</dt><dd>{assessment.tendencyTypes.map((type) => <RelationChip key={type.id} label={type.name} tone="neutral" />)}</dd>
          </div> : null}
        </dl>
        <p className="constitution-meta num">偏颇质转化分 ≥40 为“是”、30–39 为“倾向是”；平和质本类需 ≥60，且其余均 &lt;30 为“是”、均 &lt;40 且未达前项为“基本是”。</p>
      </section>
      <section className="constitution-card" aria-label="九种体质转化分">
        <header className="constitution-chart-header"><h4 className="constitution-eyebrow">九质转化分</h4><span className="num"><InlineText>刻度 30 · 40</InlineText></span></header>
        <ul className="constitution-bars">
          {assessment.results.map((result) => <li key={result.id} className="constitution-bar" data-tone={result.tone}>
            <div className="constitution-bar-label"><strong>{result.name}</strong><span>{result.label}</span><span className="num">{result.displayScore} 分</span></div>
            <div className="constitution-bar-track" role="img" aria-label={result.chartLabel}>
              <span className="constitution-bar-fill" style={{ '--constitution-fill': result.fillWidth } as CSSProperties} />
              <span className="constitution-bar-tick constitution-bar-tick--30" /><span className="constitution-bar-tick constitution-bar-tick--40" />
            </div>
          </li>)}
        </ul>
        <p className="constitution-meta">九项分别判定，可同时符合多质或倾向；分数显示一位小数，判定采用未取整分数。</p>
      </section>
      <section className="constitution-card" aria-label="与运气互参">
        <h4 className="constitution-eyebrow">与运气互参</h4>
        <dl className="constitution-reference-rows">
          <div><dt>体质</dt><dd>{assessment.decision}</dd></div>
          <div><dt>先天</dt><dd>{birth ? birth.candidates.map((candidate, index) => <span className="constitution-context-candidate" key={index}>{birth.ambiguous ? `${candidate.label}：` : ''}<InlineText>{candidate.detail}</InlineText></span>) : '未提供出生资料'}</dd></div>
          <div><dt>当下</dt><dd>{context ? <><InlineText>{context.current.summary}</InlineText><span className="constitution-context-candidate"><InlineText>{context.current.detail}</InlineText></span></> : '当前运气暂不可用'}</dd></div>
        </dl>
        <p className="constitution-meta">三者并列呈现供医师综合判断，系统不自动辨证、不给方药。</p>
      </section>
      <details className="constitution-source"><summary>判定说明与边界</summary><p>{assessment.summary}</p><p>{assessment.boundaryNote}</p></details>
      <details className="constitution-source"><summary>本次量表版本</summary><p className="constitution-meta num"><InlineText>{`${assessment.sexLabel} · ${assessment.questionnaireId} · ${assessment.version}`}</InlineText></p></details>
    </section>
  );
}
