import { createYunQiInstant } from '@yunqi/domain';
import type { YunQiInstant } from '@yunqi/domain';

const EXPLICIT_TIME_ZONE_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;
const DATE_TIME_INPUT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

export type DateTimeInput = string | Date;

function parseStringInput(input: string): number {
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

export function toYunQiInstant(input: DateTimeInput): YunQiInstant {
  const epochMilliseconds =
    typeof input === 'string' ? parseStringInput(input) : input.getTime();

  if (!Number.isFinite(epochMilliseconds)) {
    throw new RangeError('日期时间无效');
  }

  return createYunQiInstant(epochMilliseconds);
}
