import type { ReactNode } from 'react';
import { Badge } from './Badge';

export interface TimelineItemProps {
  readonly children: ReactNode;
  readonly id: string;
  readonly isCurrent?: boolean;
  readonly isExpanded: boolean;
  readonly onToggle: () => void;
  readonly summary: ReactNode;
  readonly title: string;
}

export function TimelineItem({
  children,
  id,
  isCurrent = false,
  isExpanded,
  onToggle,
  summary,
  title,
}: TimelineItemProps) {
  const controlId = `${id}-control`;
  const detailsId = `${id}-details`;
  const detailsLabelId = `${id}-details-label`;
  const action = isExpanded ? '收起' : '展开';

  return (
    <article
      id={id}
      className={`timeline-item${isCurrent ? ' is-current' : ''}`}
    >
      <div className="timeline-item__marker" aria-hidden="true" />
      <div className="timeline-item__body">
        <div className="timeline-item__heading">
          <div>
            <div className="timeline-item__title-line">
              <h3>{title}</h3>
              {isCurrent ? <Badge tone="current">当前</Badge> : null}
            </div>
            <div className="timeline-item__summary">{summary}</div>
          </div>
          <button
            id={controlId}
            className="timeline-item__toggle"
            type="button"
            aria-controls={detailsId}
            aria-expanded={isExpanded}
            aria-label={`${action}${title}详情`}
            onClick={onToggle}
          >
            <span id={detailsLabelId}>{title}详情</span>
            <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
          </button>
        </div>
        <div
          id={detailsId}
          className="timeline-item__details"
          role="region"
          aria-labelledby={detailsLabelId}
          hidden={!isExpanded}
        >
          {children}
        </div>
      </div>
    </article>
  );
}
