import { InlineText } from './InlineText';

export interface QuoteBlockProps {
  readonly quote: string;
  readonly source: string;
  readonly label?: string;
  readonly interpretation?: string;
  readonly fullQuote?: string;
  readonly compact?: boolean;
  /** The caller may supply a card-ending notice here, or share one in its footer. */
  readonly notice?: string;
}

export function QuoteBlock({
  quote,
  source,
  label,
  interpretation,
  fullQuote,
  compact = false,
  notice,
}: QuoteBlockProps) {
  if (!source.trim()) {
    throw new Error('Classical quotations require a visible source.');
  }

  return (
    <figure className={`ds-quote-block${compact ? ' ds-quote-block--compact' : ''}`}>
      {label && <div className="ds-quote-block__label"><InlineText>{label}</InlineText></div>}
      <blockquote className="ds-quote-block__original">“{quote}”</blockquote>
      {fullQuote && (
        <details className="ds-quote-block__details">
          <summary className="ds-quote-block__summary">展开全段</summary>
          <blockquote className="ds-quote-block__original">“{fullQuote}”</blockquote>
        </details>
      )}
      {interpretation && (
        <div className="ds-quote-block__interpretation">
          <p className="ds-quote-block__label">阅读释义</p>
          <p className="ds-quote-block__reading">{interpretation}</p>
        </div>
      )}
      <figcaption className="ds-quote-block__source num"><InlineText>{source}</InlineText></figcaption>
      {notice && <p className="ds-quote-block__notice">{notice}</p>}
    </figure>
  );
}
