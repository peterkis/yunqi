import type { YearParamResult } from '../../../../lib/year-validator';
import { YUNQI_YEAR_RANGE } from '../../../../lib/yunqi-year-range';

export interface InvalidYearPageProps {
  readonly reason: Extract<YearParamResult, { ok: false }>['reason'];
}

const messages = {
  format: '年份格式错误，请选择四位年份',
  range: `年份范围应为 ${YUNQI_YEAR_RANGE.min}–${YUNQI_YEAR_RANGE.max}`,
} as const;

export function InvalidYearPage({ reason }: InvalidYearPageProps) {
  return (
    <div className="feedback-state feedback-state--error" role="alert">
      <p>{messages[reason]}</p>
    </div>
  );
}
