import { SegmentedText } from './SegmentedText';

const elementLabels = {
  wood: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
};

export interface ElementDotProps {
  readonly element: keyof typeof elementLabels;
  /** A presentation label such as 少阴君火; the element name is the fallback. */
  readonly label?: string;
  readonly compact?: boolean;
}

export function ElementDot({ element, label, compact = false }: ElementDotProps) {
  const text = label?.trim() || elementLabels[element];
  return (
    <span className={`ds-element${compact ? ' ds-element--compact' : ''}`}>
      <span
        className={`ds-element__dot ds-element__dot--${element}`}
        aria-hidden="true"
      />
      <span>{text.includes(' · ') ? <SegmentedText>{text}</SegmentedText> : text}</span>
    </span>
  );
}
