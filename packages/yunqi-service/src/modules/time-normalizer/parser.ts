import type { BeijingLocalDateTime } from '@yunqi/domain';

export type ApiDateTimeForm = 'LOCAL' | 'BEIJING_OFFSET' | 'UTC';

export interface ParsedApiDateTime {
  readonly form: ApiDateTimeForm;
  readonly localDateTime: BeijingLocalDateTime;
}

const API_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?(Z|\+08:00)?$/;

export function parseApiDateTimeLexeme(input: string): ParsedApiDateTime {
  const match = API_DATE_TIME_PATTERN.exec(input);
  if (match === null) {
    throw new RangeError('dateTime 格式不符合固定北京时间输入契约');
  }

  const suffix = match[8];
  return {
    form:
      suffix === 'Z'
        ? 'UTC'
        : suffix === '+08:00'
          ? 'BEIJING_OFFSET'
          : 'LOCAL',
    localDateTime: {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      hour: Number(match[4]),
      minute: Number(match[5]),
      second: Number(match[6]),
      millisecond: Number(match[7] ?? 0),
    },
  };
}
