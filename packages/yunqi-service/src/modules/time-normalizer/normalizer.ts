import {
  createYunQiCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  type YunQiCalendarTime,
} from '@yunqi/domain';
import { InvalidArgumentError } from '../../services/invalid-argument-error.js';
import { parseApiDateTimeLexeme } from './parser.js';

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const INVALID_DATE_TIME_MESSAGE =
  'dateTime 必须是固定北京时间或等价 UTC，格式为 YYYY-MM-DDTHH:mm:ss[.SSS]、+08:00 或 Z';

export function normalizeApiDateTime(input: string): YunQiCalendarTime {
  try {
    const parsed = parseApiDateTimeLexeme(input);
    const calendarTime = createYunQiCalendarTime(parsed.localDateTime);
    if (parsed.form !== 'UTC') {
      return calendarTime;
    }

    return normalizeEpochMilliseconds(
      calendarTime.instant.epochMilliseconds +
        BEIJING_OFFSET_MILLISECONDS,
    );
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidArgumentError(INVALID_DATE_TIME_MESSAGE, {
        cause: error,
      });
    }
    throw error;
  }
}

export function normalizeYunQiInstant(
  instant: YunQiCalendarTime['instant'],
): YunQiCalendarTime {
  return createYunQiCalendarTimeFromInstant(instant);
}

export function normalizeEpochMilliseconds(
  epochMilliseconds: number,
): YunQiCalendarTime {
  return normalizeYunQiInstant(createYunQiInstant(epochMilliseconds));
}
