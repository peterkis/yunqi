import { NavLink, type To } from 'react-router-dom';

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
  if (segments.length === 0 || segments.length > 3) {
    throw new Error('SegmentedNav requires one to three segments.');
  }

  return (
    <nav
      className={`ds-segmented-nav${compact ? ' ds-segmented-nav--compact' : ''}`}
      aria-label={label}
    >
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
