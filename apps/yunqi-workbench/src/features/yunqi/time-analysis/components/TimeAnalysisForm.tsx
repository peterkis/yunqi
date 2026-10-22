import type { FormEvent } from 'react';
import { YUNQI_YEAR_RANGE } from '../../../../lib/yunqi-year-range';

export interface TimeAnalysisFormProps {
  readonly inputError: string | null;
  readonly inputValue: string;
  readonly isPending: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onInvalid: () => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function TimeAnalysisForm({
  inputError,
  inputValue,
  isPending,
  onInputChange,
  onInvalid,
  onSubmit,
}: TimeAnalysisFormProps) {
  return (
    <form
      aria-label="指定时点分析表单"
      className="time-analysis-form"
      onSubmit={onSubmit}
    >
      <div className="time-analysis-form__field">
        <label htmlFor="time-analysis-input">分析时间</label>
        <input
          aria-describedby={
            inputError
              ? 'time-analysis-hint time-analysis-error'
              : 'time-analysis-hint'
          }
          disabled={isPending}
          aria-invalid={inputError !== null}
          id="time-analysis-input"
          onInvalid={(event) => {
            event.preventDefault();
            onInvalid();
            event.currentTarget.focus();
          }}
          onChange={(event) => onInputChange(event.target.value)}
          required
          step="1"
          type="datetime-local"
          value={inputValue}
        />
        {inputError ? (
          <p id="time-analysis-error" role="alert">
            {inputError}
          </p>
        ) : null}
      </div>
      <button disabled={isPending} type="submit">
        {isPending ? '正在分析' : '开始分析'}
      </button>
      <p id="time-analysis-hint" className="time-analysis-form__hint">
        按北京时间填写日期、时、分、秒；整分钟可将秒填为 00。
        <span><strong>北京时间 UTC+08</strong> · 支持 {YUNQI_YEAR_RANGE.min}–{YUNQI_YEAR_RANGE.max} 运气年，年界以大寒交节为准。</span>
      </p>
    </form>
  );
}
