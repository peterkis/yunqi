import type { ConstitutionAssessmentViewModel } from '../presentation/map-constitution';

export function ConstitutionResults({ assessment }: { readonly assessment: ConstitutionAssessmentViewModel }) {
  return (
    <section className="constitution-results" aria-label="体质测评结果" aria-live="polite">
      <header>
        <p className="section-label">本次测评</p>
        <h3>{assessment.summary}</h3>
        <p>{assessment.boundaryNote}</p>
      </header>
      <ul className="constitution-score-list">
        {assessment.results.map((result) => (
          <li key={result.id} className={`constitution-score constitution-score--${result.status}`}>
            <div className="constitution-score__label">
              <strong>{result.name}</strong>
              <span>{result.label}</span>
              <span>{result.displayScore} 分</span>
            </div>
            <progress aria-label={`${result.name}转换分`} value={result.score} max="100" />
            <span className="constitution-score__raw">原始分 {result.rawScore} · {result.itemCount} 个条目</span>
          </li>
        ))}
      </ul>
      <p className="form-note">可同时符合多种体质或倾向；各项分数分别判定。显示分数保留一位小数，判定使用未取整分数。</p>
      <details className="inline-disclosure">
        <summary>本次量表版本</summary>
        <p>{assessment.questionnaireId} · {assessment.version}</p>
      </details>
    </section>
  );
}
