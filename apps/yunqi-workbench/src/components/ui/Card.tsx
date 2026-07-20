import type { ReactNode } from 'react';

export interface CardProps {
  readonly children: ReactNode;
  readonly title?: string;
}

export function Card({ children, title }: CardProps) {
  return (
    <article className="ui-card">
      {title ? <h3 className="ui-card__title">{title}</h3> : null}
      <div className="ui-card__content">{children}</div>
    </article>
  );
}
