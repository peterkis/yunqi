import type { YearParamResult } from '../../../../lib/year-validator';

export interface InvalidYearPageProps {
  readonly reason: Extract<YearParamResult, { ok: false }>['reason'];
}

const messages = {
  format: '年份格式无效，请选择四位年份。',
  range: '年份超出可查询范围，请从批准列表中选择。',
} as const;

export function InvalidYearPage({ reason }: InvalidYearPageProps) {
  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <p>{messages[reason]}</p>
    </div>
  );
}
