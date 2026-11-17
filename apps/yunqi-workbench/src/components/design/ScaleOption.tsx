import { useId, type KeyboardEvent } from 'react';

export interface ScaleOptionProps {
  readonly shortcut: 1 | 2 | 3 | 4 | 5;
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
  /** The caller owns the radiogroup and its roving tab stop. */
  readonly tabIndex?: 0 | -1;
}

function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.repeat) return;
  const group = event.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;

  const options = Array.from(
    group.querySelectorAll<HTMLButtonElement>('button.ds-scale-option:not(:disabled)'),
  ).filter((option) => option.closest('[role="radiogroup"]') === group);
  const index = options.indexOf(event.currentTarget);
  let target: HTMLButtonElement | undefined;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      target = options[(index + 1) % options.length];
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      target = options[(index + options.length - 1) % options.length];
      break;
    case 'Home':
      target = options[0];
      break;
    case 'End':
      target = options[options.length - 1];
      break;
    default:
      target = options.find((option) => option.dataset.shortcut === event.key);
  }

  if (target && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault();
    target.focus();
    // Browsing a scale must not answer it: callers may advance after a choice.
    if (/^[1-5]$/.test(event.key)) target.click();
  }
}

export function ScaleOption({
  shortcut,
  label,
  description,
  checked,
  onSelect,
  disabled = false,
  tabIndex = 0,
}: ScaleOptionProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <button
      type="button"
      role="radio"
      className="ds-scale-option"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={descriptionId}
      aria-keyshortcuts={String(shortcut)}
      data-shortcut={shortcut}
      disabled={disabled}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={handleOptionKeyDown}
    >
      <span className="ds-scale-option__key num" aria-hidden="true">{shortcut}</span>
      <span className="ds-scale-option__label" id={labelId}>{label}</span>
      <span className="ds-scale-option__description" id={descriptionId}>{description}</span>
    </button>
  );
}
