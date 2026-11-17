import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type InfoCardProps = {
  readonly label: string;
  readonly meta?: string;
  readonly children: ReactNode;
  readonly hint?: ReactNode;
  readonly compact?: boolean;
} & (
  | { readonly href?: never; readonly to?: never; readonly linkLabel?: never }
  | { readonly href: string; readonly to?: never; readonly linkLabel?: string }
  | { readonly to: string; readonly href?: never; readonly linkLabel?: string }
);

export function InfoCard({
  href,
  to,
  linkLabel = '原文与释义',
  label,
  meta,
  children,
  hint,
  compact = false,
}: InfoCardProps) {
  const labelId = useId();

  return (
    <section
      className={`ds-info-card${compact ? ' ds-info-card--compact' : ''}`}
      aria-labelledby={labelId}
    >
      <div className="ds-info-card__eyebrow">
        <span className="ds-info-card__label" id={labelId}>{label}</span>
        <span className="ds-info-card__meta">
          {meta && <span>{meta}</span>}
          {to !== undefined ? (
            <Link className="ds-info-card__link" to={to}>
              {linkLabel}<span aria-hidden="true"> ›</span>
            </Link>
          ) : href !== undefined && (
            <a className="ds-info-card__link" href={href}>
              {linkLabel}<span aria-hidden="true"> ›</span>
            </a>
          )}
        </span>
      </div>
      <div className="ds-info-card__content">{children}</div>
      {hint && <div className="ds-info-card__hint">{hint}</div>}
    </section>
  );
}
