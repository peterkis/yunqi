import { useRef, type KeyboardEvent, type ReactElement } from 'react';
import { useSegmentIndicator } from './useSegmentIndicator';

export interface ControlSegmentViewModel<Value extends string> {
  readonly value: Value;
  readonly label: string | ReactElement;
  readonly disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string> {
  readonly label: string;
  readonly describedBy?: string;
  readonly segments: readonly ControlSegmentViewModel<Value>[];
  readonly value: Value | '';
  readonly onChange: (value: Value) => void;
  readonly compact?: boolean;
  readonly slidingIndicator?: boolean;
  readonly disabled?: boolean;
}

/** Local selection only; navigation remains SegmentedNav's responsibility. */
export function SegmentedControl<Value extends string>({ label, describedBy, segments, value, onChange, compact = false, disabled = false, slidingIndicator = true }: SegmentedControlProps<Value>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const trackRef = useSegmentIndicator(value, slidingIndicator);
  const enabled = segments.map((segment, index) => ({ ...segment, index })).filter((segment) => !segment.disabled);
  const tabStop = enabled.find((segment) => segment.value === value) ?? enabled[0];

  function keyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const position = enabled.findIndex((segment) => segment.index === index);
    let next;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': next = enabled[(position + 1) % enabled.length]; break;
      case 'ArrowLeft':
      case 'ArrowUp': next = enabled[(position + enabled.length - 1) % enabled.length]; break;
      case 'Home': next = enabled[0]; break;
      case 'End': next = enabled[enabled.length - 1]; break;
      default: return;
    }
    if (!next) return;
    event.preventDefault();
    buttons.current[next.index]?.focus();
    if (next.value !== value) onChange(next.value);
  }

  return (
    <div ref={trackRef} role="radiogroup" aria-label={label} aria-describedby={describedBy} aria-disabled={disabled || undefined}
      className={`ds-segmented-control${slidingIndicator ? ' motion-segments' : ''}${compact ? ' ds-segmented-control--compact' : ''}`}>
      {slidingIndicator && <span className="motion-segment-indicator" aria-hidden="true" />}
      {segments.map((segment, index) => (
        <button key={segment.value} ref={(button) => { buttons.current[index] = button; }}
          type="button" role="radio" aria-checked={value === segment.value}
          disabled={disabled || segment.disabled} tabIndex={tabStop?.index === index ? 0 : -1}
          onClick={() => { if (segment.value !== value) onChange(segment.value); }} onKeyDown={(event) => keyDown(event, index)}>
          {segment.label}
        </button>
      ))}
    </div>
  );
}
