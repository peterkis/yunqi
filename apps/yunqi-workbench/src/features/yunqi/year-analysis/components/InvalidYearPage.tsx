import type { YearParamResult } from '../../../../lib/year-validator';

export interface InvalidYearPageProps {
  readonly reason: Extract<YearParamResult, { ok: false }>['reason'];
}

const messages = {
  format: '年份格式错误，请选择四位年份',
  range: '年份范围应为 1901–2099',
} as const;

export function InvalidYearPage({ reason }: InvalidYearPageProps) {
  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <p>{messages[reason]}</p>
    </div>
  );
}
