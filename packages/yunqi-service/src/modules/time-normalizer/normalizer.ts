import {
  compareBeijingLocalDateTime,
  createYunQiCalendarTime,
  createYunQiCalendarTimeFromInstant,
  createYunQiInstant,
  type YunQiCalendarTime,
} from '@yunqi/domain';
import type { BirthRequest } from '../../schemas/learning.js';
import type { CalculateRequest } from '../../schemas/yunqi.js';
import { InvalidArgumentError } from '../../services/invalid-argument-error.js';
import { parseApiDateTimeLexeme } from './parser.js';

const BEIJING_OFFSET_MILLISECONDS = 8 * 60 * 60 * 1_000;
const INVALID_DATE_TIME_MESSAGE =
  'dateTime 必须是固定北京时间或等价 UTC，格式为 YYYY-MM-DDTHH:mm:ss[.SSS]、+08:00 或 Z';

export interface NormalizedBirthRequest {
  readonly from: YunQiCalendarTime;
  readonly precision: 'date' | 'time';
}

export function normalizeCalculateRequest(
  request: CalculateRequest,
): YunQiCalendarTime {
  return normalizeApiDateTime(request.dateTime);
}

export function normalizeBirthRequest(
  request: BirthRequest,
): NormalizedBirthRequest {
  return {
    // For date-only input this is the interval's lower bound, not a
    // presumed birth time. The service retains the input precision.
    from: normalizeApiDateTime(
      `${request.birthDate}T${request.birthTime ?? '00:00:00'}`,
    ),
    precision: request.birthTime === undefined ? 'date' : 'time',
  };
}

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

export function compareCalendarTimes(
  left: YunQiCalendarTime,
  right: YunQiCalendarTime,
): number {
  return compareBeijingLocalDateTime(left.localDateTime, right.localDateTime);
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
