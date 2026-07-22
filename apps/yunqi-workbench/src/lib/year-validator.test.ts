import { describe, expect, it } from 'vitest';
import {
  YUNQI_YEAR_OPTIONS,
  YUNQI_YEAR_RANGE,
} from './yunqi-year-range';
import { parseYearParam } from './year-validator';

describe('YunQi year URL validation', () => {
  it('exposes one inclusive option list', () => {
    expect(YUNQI_YEAR_OPTIONS[0]).toBe(YUNQI_YEAR_RANGE.min);
    expect(YUNQI_YEAR_OPTIONS.at(-1)).toBe(YUNQI_YEAR_RANGE.max);
    expect(YUNQI_YEAR_OPTIONS).toHaveLength(
      YUNQI_YEAR_RANGE.max - YUNQI_YEAR_RANGE.min + 1,
    );
  });

  it.each(['1901', '2026', '2099'])('accepts %s', (value) => {
    expect(parseYearParam(value)).toEqual({
      ok: true,
      year: Number(value),
    });
  });

  it.each([undefined, 'abc', '2026abc', '2026.5', '02026'])(
    'rejects %s as format',
    (value) => {
      expect(parseYearParam(value)).toEqual({
        ok: false,
        reason: 'format',
      });
    },
  );

  it.each(['1900', '2100'])('rejects %s as range', (value) => {
    expect(parseYearParam(value)).toEqual({
      ok: false,
      reason: 'range',
    });
  });
});
