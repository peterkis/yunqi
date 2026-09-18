export type BeijingDateTimeInputResult =
  | {
      readonly ok: true;
      readonly apiDateTime: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'empty' | 'format';
    };

const MINUTE_INPUT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const SECOND_INPUT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

export function normalizeBeijingDateTimeInput(
  value: string,
): BeijingDateTimeInputResult {
  if (value.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  if (MINUTE_INPUT_PATTERN.test(value)) {
    return {
      ok: true,
      apiDateTime: value + ':00+08:00',
    };
  }

  if (SECOND_INPUT_PATTERN.test(value)) {
    return {
      ok: true,
      apiDateTime: value + '+08:00',
    };
  }

  return { ok: false, reason: 'format' };
}
