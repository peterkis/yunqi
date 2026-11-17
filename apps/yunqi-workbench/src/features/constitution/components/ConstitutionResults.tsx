import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Button } from '../../../components/design/Button';
import type { ConstitutionAssessmentViewModel, ConstitutionContextViewModel } from '../presentation/map-constitution';

export function ConstitutionResults({ assessment, context, onBack }: {
  readonly assessment: ConstitutionAssessmentViewModel;
  readonly context?: ConstitutionContextViewModel;
  readonly onBack: () => void;
}) {
  const birth = context?.birth;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { headingRef.current?.focus(); }, []);
  return (
    <section className="constitution-result-view" aria-label="体质测评结果">
      <div className="constitution-result-navigation"><Button variant="text" onClick={onBack}>返回修改</Button><h3>体质测评结果</h3></div>
      <section className="constitution-card constitution-decision" aria-label="量表判定">
        <p className="constitution-eyebrow">判定</p>
        <h4 ref={headingRef} tabIndex={-1}>{assessment.decision}</h4>
        {assessment.companions ? <p className="constitution-companions">{assessment.companions}</p> : null}
        <p className="constitution-meta">偏颇质转化分 ≥40 为“是”、30–39 为“倾向是”；平和质本类需 ≥60，且其余均 &lt;30 为“是”、均 &lt;40 且未达前项为“基本是”。</p>
      </section>
      <section className="constitution-card" aria-label="九种体质转化分">
        <header className="constitution-chart-header"><h4 className="constitution-eyebrow">九质转化分</h4><span>刻度 30 · 40</span></header>
        <ul className="constitution-bars">
          {assessment.results.map((result) => <li key={result.id} className="constitution-bar" data-tone={result.tone}>
            <div className="constitution-bar-label"><strong>{result.name}</strong><span>{result.label}</span><span>{result.displayScore} 分</span></div>
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
          <div><dt>体质</dt><dd>{assessment.summary}</dd></div>
          <div><dt>先天</dt><dd>{birth ? birth.candidates.map((candidate, index) => <span className="constitution-context-candidate" key={index}>{birth.ambiguous ? `${candidate.label}：` : ''}{candidate.detail}</span>) : '未提供出生资料'}</dd></div>
          <div><dt>当下</dt><dd>{context ? <>{context.current.summary}<span className="constitution-context-candidate">{context.current.detail}</span></> : '当前运气暂不可用'}</dd></div>
        </dl>
        <p className="constitution-meta">三者并列呈现供医师综合判断，系统不自动辨证、不给方药。</p>
      </section>
      <p className="constitution-meta">{assessment.boundaryNote}</p>
      <details className="constitution-source"><summary>本次量表版本</summary><p>{assessment.questionnaireId} · {assessment.version}</p></details>
    </section>
  );
}
