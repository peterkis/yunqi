import { useId } from 'react';
import { InlineText } from '../../../components/design/InlineText';
import type { ClassicsCardViewModel } from '../presentation/map-classics';

function OriginalText({ children }: { readonly children: string }) {
  return <blockquote className="classics-card__quote">
    <span className="classics-card__opening" aria-hidden="true">“</span>
    <p>{children}</p>
  </blockquote>;
}

export function ClassicsReadingCard({ reading }: { readonly reading: ClassicsCardViewModel }) {
  const id = useId();
  return <article className={`classics-card${reading.isCurrent ? ' classics-card--current' : ''}`} aria-labelledby={`${id}-heading`}>
    <header className="classics-card__header">
      <h3 id={`${id}-heading`}><InlineText>{reading.heading}</InlineText></h3>
      <span className={`classics-card__badge${reading.isCurrent ? ' classics-card__badge--current' : ''}`}>
        {reading.isCurrent ? <span className="classics-card__dot" aria-hidden="true" /> : null}
        {reading.badge}
      </span>
    </header>
    <div className="classics-card__body">
      <section className="classics-card__original" aria-labelledby={`${id}-original`}>
        <h4 className="classics-card__label" id={`${id}-original`}>原 文</h4>
        <OriginalText>{reading.quote}</OriginalText>
        {reading.fullQuote ? <details className="classics-card__details">
          <summary>展开全段</summary>
          <OriginalText>{reading.fullQuote}</OriginalText>
        </details> : null}
      </section>
      <section className="classics-card__interpretation" aria-labelledby={`${id}-interpretation`}>
        <h4 className="classics-card__label classics-card__label--interpretation" id={`${id}-interpretation`}>释 义</h4>
        <p>{reading.interpretation}</p>
      </section>
      <footer className="classics-card__source">
        <p><span>{reading.sourceTitle}</span><span><InlineText>{reading.sourceSection}</InlineText></span></p>
        <a className="learning-text-link" href={reading.sourceUrl} target="_blank" rel="noreferrer">
          出处 <span aria-hidden="true">›</span><span className="visually-hidden">：{reading.sourceTitle}{reading.sourceSection}（新窗口打开）</span>
        </a>
      </footer>
    </div>
  </article>;
}

export function ClassicsReadingNotice({ children = '原文为文献线索，非个体发病预测' }: { readonly children?: string }) {
  return <p className="classics-reading-notice">
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
    </svg>
    <span>{children}</span>
  </p>;
}
