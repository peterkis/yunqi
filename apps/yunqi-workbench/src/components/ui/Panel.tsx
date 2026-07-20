import { useId, type ReactNode } from 'react';

export interface PanelProps {
  readonly children: ReactNode;
  readonly description?: string;
  readonly eyebrow?: string;
  readonly title: string;
}

export function Panel({
  children,
  description,
  eyebrow,
  title,
}: PanelProps) {
  const titleId = useId();

  return (
    <section className="ui-panel" aria-labelledby={titleId}>
      <header className="ui-panel__header">
        {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
        <h2 id={titleId}>{title}</h2>
        {description ? (
          <p className="ui-panel__description">{description}</p>
        ) : null}
      </header>
      <div className="ui-panel__content">{children}</div>
    </section>
  );
}

