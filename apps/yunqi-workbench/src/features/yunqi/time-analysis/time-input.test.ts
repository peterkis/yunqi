import { describe, expect, it } from 'vitest';
import { normalizeBeijingDateTimeInput } from './time-input';

describe('normalizeBeijingDateTimeInput', () => {
  it('adds seconds and the fixed Beijing offset to minute precision input', () => {
    expect(
      normalizeBeijingDateTimeInput('2026-05-20T13:30'),
    ).toEqual({
      ok: true,
      apiDateTime: '2026-05-20T13:30:00+08:00',
    });
  });

  it('keeps seconds and adds the fixed Beijing offset', () => {
    expect(
      normalizeBeijingDateTimeInput('2026-05-20T13:30:45'),
    ).toEqual({
      ok: true,
      apiDateTime: '2026-05-20T13:30:45+08:00',
    });
  });

  it.each([
    '',
    '2026-05-20',
    '2026-05-20 13:30',
    '2026-05-20T13:30:45.000',
    '2026-05-20T13:30:00+08:00',
    '2026-05-20T13:30:00Z',
    '2026-05-20T13:30:00+09:00',
    '2026-05-20T13:30:00-not-an-input',
  ])('rejects invalid local wall time input %s', (value) => {
    const result = normalizeBeijingDateTimeInput(value);

    expect(result.ok).toBe(false);
    expect(result).not.toHaveProperty('apiDateTime');
  });
});
