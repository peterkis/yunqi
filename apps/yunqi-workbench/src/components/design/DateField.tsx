import { useEffect, useId, useImperativeHandle, useRef, useState, type Ref } from 'react';

export interface DateFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly onInvalid?: () => void;
  readonly describedBy?: string;
  readonly ref?: Ref<HTMLInputElement>;
}

const segments = [
  { label: '年', placeholder: 'YYYY', length: 4, pattern: '(19[0-9]{2}|20[0-9]{2}|2100)' },
  { label: '月', placeholder: 'MM', length: 2, pattern: '(0?[1-9]|1[0-2])' },
  { label: '日', placeholder: 'DD', length: 2, pattern: '(0?[1-9]|[12][0-9]|3[01])' },
] as const;

function split(value: string) {
  return value ? value.split('-') : ['', '', ''];
}

/** Syntax and integer ranges only. The API owns calendar-date validity. */
function canonical(parts: readonly string[]) {
  const valid = segments.every((segment, index) => new RegExp(`^${segment.pattern}$`).test(parts[index]));
  return valid ? parts.map((part, index) => part.padStart(segments[index].length, '0')).join('-') : '';
}

export function DateField({ label, value, onChange, required = false, disabled = false, onInvalid, describedBy, ref }: DateFieldProps) {
  const [parts, setParts] = useState(() => split(value));
  const emitted = useRef(value);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const labelId = useId();
  useImperativeHandle(ref, () => inputs.current[0]!, []);

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setParts(split(value));
    }
  }, [value]);

  function update(next: string[]) {
    setParts(next);
    emitted.current = canonical(next);
    // Notify even when the public value stays empty: editing invalidates results.
    onChange(emitted.current);
  }

  return (
    <fieldset className="ds-date-field" disabled={disabled} aria-labelledby={labelId}>
      <legend id={labelId}>{label}</legend>
      <div className="ds-date-field__segments">
        {segments.map((segment, index) => (
          <label className="ds-date-field__part" key={segment.label}>
            <input
              ref={(input) => { inputs.current[index] = input; }}
              type="text" inputMode="numeric" aria-label={segment.label}
              placeholder={segment.placeholder} maxLength={segment.length}
              pattern={segment.pattern} required={required} value={parts[index]}
              aria-describedby={describedBy} onInvalid={onInvalid}
              onChange={(event) => {
                const next = [...parts];
                next[index] = event.currentTarget.value;
                update(next);
                if (next[index].length === segment.length && /^\d+$/.test(next[index])) {
                  inputs.current[index + 1]?.focus();
                  inputs.current[index + 1]?.select();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && parts[index] === '' && index > 0) {
                  event.preventDefault();
                  inputs.current[index - 1]?.focus();
                }
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData('text').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(pasted)) return;
                event.preventDefault();
                update(split(pasted));
                inputs.current[2]?.focus();
              }}
            />
            <span aria-hidden="true">{segment.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
