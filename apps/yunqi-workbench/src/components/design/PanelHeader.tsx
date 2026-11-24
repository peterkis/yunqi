import type { ReactNode } from 'react';
import { Button } from './Button';
import { InlineText } from './InlineText';

export type PanelHeaderProps = {
  readonly title: string;
  readonly actions?: ReactNode;
} & (
  | { readonly variant?: 'default'; readonly status: string }
  | {
      readonly variant: 'drilldown';
      readonly subtitle?: string;
      readonly onBack: () => void;
    }
);

export function PanelHeader(props: PanelHeaderProps) {
  const secondaryLine = props.variant === 'drilldown' ? props.subtitle : props.status;

  return (
    <header className="ds-panel-header" role={props.variant === 'drilldown' ? 'presentation' : undefined}>
      {props.variant === 'drilldown' ? (
        <Button variant="text" onClick={props.onBack}>
          <svg className="ds-panel-header__back-icon" viewBox="0 0 16 16" aria-hidden="true">
            <path d="m10 3-5 5 5 5" />
          </svg>
          返回
        </Button>
      ) : (
        <span className="ds-panel-header__brand" aria-hidden="true" />
      )}
      <div className="ds-panel-header__text">
        {props.title && <h2 className="ds-panel-header__title">{props.title}</h2>}
        {secondaryLine && <p className="ds-panel-header__status num"><InlineText>{secondaryLine}</InlineText></p>}
      </div>
      {props.actions && <div className="ds-panel-header__actions">{props.actions}</div>}
    </header>
  );
}
