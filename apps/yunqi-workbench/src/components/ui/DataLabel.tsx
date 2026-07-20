import type { ReactNode } from 'react';

export interface DataLabelProps {
  readonly label: string;
  readonly value: ReactNode;
}

export function DataLabel({ label, value }: DataLabelProps) {
  return (
    <dl className="data-label">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </dl>
  );
}

