import type { BeijingDateTime, DateTimeInput } from '../types.js';

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;
const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

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
  if (typeof input === 'string') {
    if (!EXPLICIT_TIME_ZONE_PATTERN.test(input)) {
      throw new RangeError('日期时间字符串必须包含明确的时区');
    }

    const match = DATE_TIME_INPUT_PATTERN.exec(input);

    if (!match) {
      throw new RangeError('日期时间格式或日历字段无效');
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);
    const millisecond = Number((match[7] ?? '').padEnd(3, '0'));
    const offsetHour = match[8] === 'Z' ? 0 : Number(match[10]);
    const offsetMinute = match[8] === 'Z' ? 0 : Number(match[11]);

    if (offsetHour > 23 || offsetMinute > 59) {
      throw new RangeError('日期时间格式或日历字段无效');
    }

    const offsetDirection = match[9] === '-' ? -1 : 1;
    const offsetMilliseconds =
      offsetDirection * (offsetHour * 60 + offsetMinute) * 60 * 1_000;
    const wallClock = new Date(0);
    wallClock.setUTCFullYear(year, month - 1, day);
    wallClock.setUTCHours(hour, minute, second, millisecond);
    const epochMilliseconds = wallClock.getTime() - offsetMilliseconds;
    const roundTrip = new Date(epochMilliseconds + offsetMilliseconds);

    if (
      !Number.isFinite(epochMilliseconds) ||
      roundTrip.getUTCFullYear() !== year ||
      roundTrip.getUTCMonth() + 1 !== month ||
      roundTrip.getUTCDate() !== day ||
      roundTrip.getUTCHours() !== hour ||
      roundTrip.getUTCMinutes() !== minute ||
      roundTrip.getUTCSeconds() !== second ||
      roundTrip.getUTCMilliseconds() !== millisecond
    ) {
      throw new RangeError('日期时间格式或日历字段无效');
    }

    return epochMilliseconds;
  }

  const epochMilliseconds = input.getTime();

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

export function validateBeijingDateTime(
  value: BeijingDateTime,
  context = '节气边界',
): void {
  if (!Number.isFinite(value.epochMilliseconds)) {
    throw new RangeError(`${context}的纪元毫秒值必须是有限数值`);
  }

  const parsedEpochMilliseconds = Date.parse(value.iso);

  if (!Number.isFinite(parsedEpochMilliseconds)) {
    throw new RangeError(`${context}的 ISO 时间无效`);
  }

  if (parsedEpochMilliseconds !== value.epochMilliseconds) {
    throw new RangeError(`${context}的 ISO 时间与纪元毫秒值不一致`);
  }

  if (value.iso !== formatBeijingDateTime(value.epochMilliseconds)) {
    throw new RangeError(`${context}必须使用规范的北京时间秒格式`);
  }
}
