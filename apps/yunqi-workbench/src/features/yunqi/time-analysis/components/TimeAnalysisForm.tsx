import type { FormEvent } from 'react';

export interface TimeAnalysisFormProps {
  readonly inputError: string | null;
  readonly inputValue: string;
  readonly isPending: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function TimeAnalysisForm({
  inputError,
  inputValue,
  isPending,
  onInputChange,
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
          onChange={(event) => onInputChange(event.target.value)}
          required
          step="1"
          type="datetime-local"
          value={inputValue}
        />
        <p id="time-analysis-hint">
          输入一个北京标准时间，格式为 YYYY-MM-DDTHH:mm 或
          YYYY-MM-DDTHH:mm:ss。
          <span>北京时间 UTC+08</span>
        </p>
        {inputError ? (
          <p id="time-analysis-error" role="alert">
            {inputError}
          </p>
        ) : null}
      </div>
      <button disabled={isPending} type="submit">
        {isPending ? '正在分析' : '开始分析'}
      </button>
    </form>
  );
}
