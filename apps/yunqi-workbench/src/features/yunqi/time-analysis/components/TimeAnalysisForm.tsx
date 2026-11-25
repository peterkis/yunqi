import { Fragment, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react';
import { Button } from '../../../../components/design/Button';
import { NumericKeypad } from '../../../../components/design/NumericKeypad';
import { draftClock, draftDate, splitTimeInput, type TimeDraft } from '../time-input';

const dateParts = [
  ['year', '年', 'YYYY', '[0-9]{4}'], ['month', '月', 'MM', '(0?[1-9]|1[0-2])'],
  ['day', '日', 'DD', '(0?[1-9]|[12][0-9]|3[01])'],
] as const;
const clockParts = [
  ['hour', '时', 'HH', '([01]?[0-9]|2[0-3])'], ['minute', '分', 'mm', '[0-5]?[0-9]'],
  ['second', '秒', '00', '[0-5]?[0-9]'],
] as const;
const fields = [...dateParts, ...clockParts].map(([key]) => key);
type TimeField = keyof TimeDraft;

function segmentInput(form: HTMLFormElement | null, field: TimeField) {
  const element = form?.elements.namedItem(field);
  return element instanceof HTMLInputElement ? element : undefined;
}

export type TimeAnchor = 'now' | 'boundary' | 'midnight';
export interface TimeAnalysisFormProps {
  readonly draft: TimeDraft;
  readonly inputError: string | null;
  readonly isPending: boolean;
  readonly anchorYear?: number;
  readonly anchorLoading: boolean;
  readonly anchorError: boolean;
  readonly onAnchor: (anchor: TimeAnchor) => void;
  readonly onInputChange: (value: TimeDraft) => void;
  readonly onInvalid: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function TimeAnalysisForm({ draft, inputError, isPending, onInputChange, onInvalid, onSubmit,
  anchorYear, anchorLoading, anchorError, onAnchor }: TimeAnalysisFormProps) {
  const [activeField, setActiveField] = useState<TimeField>('year');

  function updateSegment(key: TimeField, input: HTMLInputElement, advance: boolean) {
    if (!/^\d*$/.test(input.value)) return;
    onInputChange({ ...draft, [key]: input.value });
    if (advance && input.value.length === input.maxLength && input.validity.valid) {
      const next = fields[fields.indexOf(key) + 1];
      if (next) segmentInput(input.form, next)?.focus();
    }
  }

  function pressKey(key: string, button: HTMLButtonElement) {
    if (key === '清空') {
      onInputChange(splitTimeInput());
      segmentInput(button.form, 'year')?.focus();
      return;
    }
    const deleting = key === '退格';
    let field = activeField;
    const previous = fields[fields.indexOf(field) - 1];
    const backIntoPrevious = deleting && draft[field] === '' && previous !== undefined;
    if (backIntoPrevious) field = previous;
    const input = segmentInput(button.form, field);
    if (!input) return;
    input.focus({ preventScroll: true });
    if (backIntoPrevious) input.setSelectionRange(input.value.length, input.value.length);
    let start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    if (deleting && start === end) start = Math.max(0, start - 1);
    if (!deleting && input.value.length - (end - start) >= input.maxLength) return;
    input.setRangeText(deleting ? '' : key, start, end, 'end');
    updateSegment(field, input, !deleting);
  }

  return <form aria-label="指定时点分析表单" className="drilldown-time-form specified-time-form jade-card" noValidate
    onSubmit={event => {
      const invalid = event.currentTarget.querySelector<HTMLInputElement>('input:invalid');
      const calendar = event.currentTarget.elements.namedItem('calendar') as HTMLInputElement;
      if (invalid || !calendar.value) {
        event.preventDefault();
        onInvalid();
        (invalid ?? event.currentTarget.querySelector<HTMLInputElement>('[name="day"]'))?.focus();
        return;
      }
      onSubmit(event);
    }}>
    {(['date', 'time'] as const).map(kind => {
      const date = kind === 'date';
      const label = date ? '日期' : '时刻';
      const parts = date ? dateParts : clockParts;
      return <div key={kind} role="group" aria-label={label} className="specified-time-row">
        <span aria-hidden="true">{label}</span>
        <div className="specified-time-segments">
          {parts.map(([key, name, placeholder, pattern], i) => <Fragment key={key}>
            {i > 0 && <span aria-hidden="true">{date ? '/' : ':'}</span>}
            <input name={key} aria-label={name} type="text" inputMode="none" autoComplete="off" data-active={activeField === key || undefined}
              maxLength={key === 'year' ? 4 : 2} pattern={pattern} required={key !== 'second'} disabled={isPending}
              placeholder={placeholder} value={draft[key]} aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? 'time-analysis-hint time-analysis-error' : 'time-analysis-hint'}
              onFocus={event => { setActiveField(key); event.currentTarget.select(); }}
              onClick={event => {
                const input = event.currentTarget;
                if (input.value.length === input.maxLength && input.selectionStart === input.selectionEnd) input.select();
              }}
              onChange={event => updateSegment(key, event.currentTarget, true)}
              onPaste={event => {
                const value = event.clipboardData.getData('text').trim().replace(' ', 'T');
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
                  event.preventDefault();
                  onInputChange(splitTimeInput(value));
                }
              }}
            />
          </Fragment>)}
        </div>
        <label className="specified-time-picker">
          {date ? <CalendarDays aria-hidden="true" /> : <Clock3 aria-hidden="true" />}
          <input name={date ? 'calendar' : 'clock'} type={kind} aria-label={date ? '选择日期' : '选择时刻'}
            value={date ? draftDate(draft) : draftClock(draft)} step={date ? undefined : '1'} disabled={isPending}
            onChange={event => {
              const values = event.currentTarget.value.split(date ? '-' : ':');
              const next = { ...draft };
              parts.forEach(([key], i) => { next[key] = values[i] ?? ''; });
              onInputChange(next);
            }} />
        </label>
      </div>;
    })}
    {inputError && <p id="time-analysis-error" role="alert">{inputError}</p>}
    <div className="specified-time-anchors" role="group" aria-label="快捷锚点">
      <span>快捷锚点</span>
      <button type="button" disabled={isPending || anchorLoading} onClick={() => onAnchor('now')}>当前时刻</button>
      <button type="button" disabled={isPending || anchorLoading} onClick={() => onAnchor('boundary')}>{anchorYear ?? '本年'} 大寒交运</button>
      <button type="button" disabled={isPending || anchorLoading} onClick={() => onAnchor('midnight')}>整点 00:00:00</button>
    </div>
    {anchorLoading && <p role="status">正在读取快捷时点</p>}
    {anchorError && <p role="alert">未能读取快捷时点，请重试或手动填写。</p>}
    <NumericKeypad disabled={isPending} clearLabel="清空日期和时刻" onKey={pressKey} />
    <Button disabled={isPending} type="submit">{isPending ? '正在分析' : '开始分析'}<ArrowRight aria-hidden="true" /></Button>
  </form>;
}
