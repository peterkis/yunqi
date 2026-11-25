import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import './numeric-keypad.css';

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '清空', '0', '退格'] as const;

interface NumericKeypadProps {
  readonly onKey: (key: typeof keys[number], button: HTMLButtonElement) => void;
  readonly disabled?: boolean;
  readonly clearLabel: string;
  readonly backspaceIcon?: ReactNode;
  readonly className?: string;
}

export function NumericKeypad({ onKey, disabled, clearLabel, backspaceIcon, className = '' }: NumericKeypadProps) {
  return <div className={`numeric-keypad ${className}`.trim()} role="group" aria-label="数字键盘">
    {keys.map(key => <button key={key} type="button" disabled={disabled} data-digit={key.length === 1 || undefined}
      aria-label={key === '清空' ? clearLabel : key} onMouseDown={event => event.preventDefault()} onClick={event => onKey(key, event.currentTarget)}>
      {key === '退格' ? backspaceIcon ?? <X size={18} aria-hidden="true" /> : key}
    </button>)}
  </div>;
}
