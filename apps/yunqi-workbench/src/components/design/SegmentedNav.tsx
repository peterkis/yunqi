import { NavLink, useLocation, type To } from 'react-router-dom';
import { useSegmentIndicator } from './useSegmentIndicator';

export interface NavSegmentViewModel {
  readonly label: string;
  readonly to: To;
  readonly end?: boolean;
}

export interface SegmentedNavProps {
  readonly segments: readonly NavSegmentViewModel[];
  readonly label?: string;
  readonly compact?: boolean;
}

export function SegmentedNav({
  segments,
  label = '视图',
  compact = false,
}: SegmentedNavProps) {
  const { pathname } = useLocation();
  const trackRef = useSegmentIndicator<HTMLElement>(pathname);
  if (segments.length === 0 || segments.length > 3) {
    throw new Error('SegmentedNav requires one to three segments.');
  }

  return (
    <nav
      ref={trackRef}
      className={`ds-segmented-nav motion-segments${compact ? ' ds-segmented-nav--compact' : ''}`}
      aria-label={label}
    >
      <span className="motion-segment-indicator" aria-hidden="true" />
      {segments.map((segment) => (
        <NavLink
          className="ds-segmented-nav__link"
          key={segment.label}
          to={segment.to}
          end={segment.end}
          aria-current="page"
        >
          {segment.label}
        </NavLink>
      ))}
    </nav>
  );
}
