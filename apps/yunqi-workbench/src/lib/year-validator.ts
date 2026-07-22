import { YUNQI_YEAR_RANGE } from './yunqi-year-range';

export type YearParamResult =
  | { readonly ok: true; readonly year: number }
  | {
      readonly ok: false;
      readonly reason: 'format' | 'range';
    };

export function parseYearParam(
  value: string | undefined,
): YearParamResult {
  if (value === undefined || !/^\d{4}$/.test(value)) {
    return { ok: false, reason: 'format' };
  }

  const year = Number(value);
  if (
    !Number.isInteger(year) ||
    year < YUNQI_YEAR_RANGE.min ||
    year > YUNQI_YEAR_RANGE.max
  ) {
    return { ok: false, reason: 'range' };
  }

  return { ok: true, year };
}
