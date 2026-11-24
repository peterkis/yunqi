import { Fragment, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react';
import { Button } from '../../../../components/design/Button';
import { draftClock, draftDate, splitTimeInput, type TimeDraft } from '../time-input';

const dateParts = [
  ['year', '年', 'YYYY', '[0-9]{4}'], ['month', '月', 'MM', '(0?[1-9]|1[0-2])'],
  ['day', '日', 'DD', '(0?[1-9]|[12][0-9]|3[01])'],
] as const;
const clockParts = [
  ['hour', '时', 'HH', '([01]?[0-9]|2[0-3])'], ['minute', '分', 'mm', '[0-5]?[0-9]'],
  ['second', '秒', '00', '[0-5]?[0-9]'],
] as const;
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
            <input name={key} aria-label={name} type="text" inputMode="numeric" autoComplete="off"
              maxLength={key === 'year' ? 4 : 2} pattern={pattern} required={key !== 'second'} disabled={isPending}
              placeholder={placeholder} value={draft[key]} aria-invalid={inputError ? true : undefined}
              aria-describedby={inputError ? 'time-analysis-hint time-analysis-error' : 'time-analysis-hint'}
              onFocus={event => event.currentTarget.select()}
              onChange={event => {
                const value = event.currentTarget.value;
                if (!/^\d*$/.test(value)) return;
                onInputChange({ ...draft, [key]: value });
                if (value.length === event.currentTarget.maxLength && event.currentTarget.validity.valid) {
                  const next = parts[i + 1]?.[0] ?? (date ? 'hour' : undefined);
                  const nextInput = next && event.currentTarget.form?.elements.namedItem(next);
                  if (nextInput instanceof HTMLInputElement) {
                    nextInput.focus();
                    nextInput.select();
                  }
                }
              }}
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
    <Button disabled={isPending} type="submit">{isPending ? '正在分析' : '开始分析'}<ArrowRight aria-hidden="true" /></Button>
  </form>;
}
