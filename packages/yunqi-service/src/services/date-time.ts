import { Temporal } from '@js-temporal/polyfill';
import { createYunQiInstant, type YunQiInstant } from '@yunqi/domain';
import { InvalidArgumentError } from './invalid-argument-error.js';

export const HOSPITAL_TIME_ZONE = 'Asia/Shanghai' as const;

const LOCAL_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
const RFC3339_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const INVALID_DATE_TIME_MESSAGE =
  'dateTime 必须是 Asia/Shanghai 本地时间或带 Z/offset 的 RFC3339 时间';

export function parseApiDateTime(input: string): YunQiInstant {
  try {
    if (LOCAL_DATE_TIME.test(input)) {
      const plain = Temporal.PlainDateTime.from(input, { overflow: 'reject' });
      const zoned = plain.toZonedDateTime(HOSPITAL_TIME_ZONE, {
        disambiguation: 'reject',
      });
      return createYunQiInstant(zoned.epochMilliseconds);
    }

    if (RFC3339_DATE_TIME.test(input)) {
      return createYunQiInstant(Temporal.Instant.from(input).epochMilliseconds);
    }
  } catch {
    throw new InvalidArgumentError(INVALID_DATE_TIME_MESSAGE);
  }

  throw new InvalidArgumentError(INVALID_DATE_TIME_MESSAGE);
}
