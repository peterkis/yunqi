import type { DateTimeInput } from '../types.js';

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function assembleBeijingDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}+08:00`;
}

export function parseDateTimeInput(input: DateTimeInput): number {
  if (typeof input === 'string' && !EXPLICIT_TIME_ZONE_PATTERN.test(input)) {
    throw new RangeError('日期时间字符串必须包含明确的时区');
  }

  const epochMilliseconds = typeof input === 'string' ? Date.parse(input) : input.getTime();

  if (!Number.isFinite(epochMilliseconds)) {
    throw new RangeError('日期时间无效');
  }

  return epochMilliseconds;
}

export function formatBeijingDateTime(epochMilliseconds: number): string {
  if (!Number.isFinite(epochMilliseconds)) {
    throw new RangeError('纪元毫秒值无效');
  }

  const beijingFields = new Date(epochMilliseconds + BEIJING_OFFSET_MILLISECONDS);

  if (!Number.isFinite(beijingFields.getTime())) {
    throw new RangeError('纪元毫秒值超出可格式化范围');
  }

  return assembleBeijingDateTime(
    beijingFields.getUTCFullYear(),
    beijingFields.getUTCMonth() + 1,
    beijingFields.getUTCDate(),
    beijingFields.getUTCHours(),
    beijingFields.getUTCMinutes(),
    beijingFields.getUTCSeconds(),
  );
}

export function formatBeijingFields(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): string {
  const iso = assembleBeijingDateTime(year, month, day, hour, minute, second);
  const epochMilliseconds = Date.parse(iso);

  if (!Number.isFinite(epochMilliseconds) || formatBeijingDateTime(epochMilliseconds) !== iso) {
    throw new RangeError('北京时间字段无效');
  }

  return iso;
}
