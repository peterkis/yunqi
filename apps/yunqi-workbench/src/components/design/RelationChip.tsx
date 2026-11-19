import { InlineText } from './InlineText';
import { SegmentedText } from './SegmentedText';

export interface RelationChipProps {
  readonly tone: 'favorable' | 'adverse' | 'neutral';
  readonly label: string;
  /** Omit only when an adjacent explanation is supplied by the caller. */
  readonly explanation?: string;
  readonly compact?: boolean;
  readonly segmented?: boolean;
}

export function RelationChip({
  tone,
  label,
  explanation,
  compact = false,
  segmented = false,
}: RelationChipProps) {
  if (!label.trim()) {
    throw new Error('Relation chips require visible label text.');
  }

  return (
    <span className="ds-relation">
      <span
        className={`ds-relation__chip ds-relation__chip--${tone}${compact ? ' ds-relation__chip--compact' : ''}`}
      >
        {segmented && label.includes(' · ') ? <SegmentedText>{label}</SegmentedText> : <InlineText>{label}</InlineText>}
      </span>
      {explanation && (
        <span className="ds-relation__explanation"><InlineText>{explanation}</InlineText></span>
      )}
    </span>
  );
}
