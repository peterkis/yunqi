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

export function splitTimeInput(localTime = '') {
  return {
    year: localTime.slice(0, 4), month: localTime.slice(5, 7), day: localTime.slice(8, 10),
    hour: localTime.slice(11, 13), minute: localTime.slice(14, 16), second: localTime.slice(17, 19),
  };
}
export type TimeDraft = ReturnType<typeof splitTimeInput>;

export function draftDate({ year, month, day }: TimeDraft) {
  return year.length === 4 && month && day ? [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-') : '';
}

export function draftClock({ hour, minute, second }: TimeDraft) {
  return hour && minute ? [hour, minute, second || '0'].map(value => value.padStart(2, '0')).join(':') : '';
}
