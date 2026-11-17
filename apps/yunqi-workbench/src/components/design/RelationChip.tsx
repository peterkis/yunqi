export interface RelationChipProps {
  readonly tone: 'favorable' | 'adverse' | 'neutral';
  readonly label: string;
  /** Omit only when an adjacent explanation is supplied by the caller. */
  readonly explanation?: string;
  readonly compact?: boolean;
}

export function RelationChip({
  tone,
  label,
  explanation,
  compact = false,
}: RelationChipProps) {
  if (!label.trim()) {
    throw new Error('Relation chips require visible label text.');
  }

  return (
    <span className="ds-relation">
      <span
        className={`ds-relation__chip ds-relation__chip--${tone}${compact ? ' ds-relation__chip--compact' : ''}`}
      >
        {label}
      </span>
      {explanation && (
        <span className="ds-relation__explanation">{explanation}</span>
      )}
    </span>
  );
}
