import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'current';

export interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: BadgeTone;
}

export function Badge({
  children,
  tone = 'neutral',
}: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone}`} data-tone={tone}>
      {children}
    </span>
  );
}
