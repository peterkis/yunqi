const BEIJING_TIMEZONE = 'Asia/Shanghai' as const;
const BEIJING_OFFSET_MILLISECONDS = 28_800_000n;
const MILLISECONDS_PER_DAY = 86_400_000n;

export interface YunQiInstant {
  epochMilliseconds: number;
  timezone: 'Asia/Shanghai';
}

interface BeijingCivilFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function assertSafeEpoch(epochMilliseconds: unknown, context: string): asserts epochMilliseconds is number {
  if (typeof epochMilliseconds !== 'number' || !Number.isSafeInteger(epochMilliseconds)) {
    throw new RangeError(`${context}的纪元毫秒值必须是安全整数`);
  }
}

export function createYunQiInstant(epochMilliseconds: number): YunQiInstant {
  assertSafeEpoch(epochMilliseconds, '运气时刻');

  return Object.freeze({
    epochMilliseconds,
    timezone: BEIJING_TIMEZONE,
  });
}

export function assertYunQiInstant(
  value: unknown,
  context = '运气时刻',
): asserts value is YunQiInstant {
  if (typeof value !== 'object' || value === null) {
    throw new RangeError(`${context}必须是有效的运气时刻`);
  }

  const candidate = value as Partial<YunQiInstant>;
  assertSafeEpoch(candidate.epochMilliseconds, context);

  if (candidate.timezone !== BEIJING_TIMEZONE) {
    throw new RangeError(`${context}的时区必须是 Asia/Shanghai`);
  }
}

function floorDivide(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  return dividend % divisor < 0n ? quotient - 1n : quotient;
}

function getBeijingCivilFields(instant: YunQiInstant): BeijingCivilFields {
  assertYunQiInstant(instant);

  const beijingMilliseconds =
    BigInt(instant.epochMilliseconds) + BEIJING_OFFSET_MILLISECONDS;
  const daysSinceEpoch = floorDivide(beijingMilliseconds, MILLISECONDS_PER_DAY);
  let millisecondsWithinDay =
    beijingMilliseconds - daysSinceEpoch * MILLISECONDS_PER_DAY;

  const shiftedDays = daysSinceEpoch + 719_468n;
  const era = floorDivide(shiftedDays, 146_097n);
  const dayOfEra = shiftedDays - era * 146_097n;
  const yearOfEra =
    (dayOfEra -
      dayOfEra / 1_460n +
      dayOfEra / 36_524n -
      dayOfEra / 146_096n) /
    365n;
  let year = yearOfEra + era * 400n;
  const dayOfYear =
    dayOfEra -
    (365n * yearOfEra + yearOfEra / 4n - yearOfEra / 100n);
  const shiftedMonth = (5n * dayOfYear + 2n) / 153n;
  const day = dayOfYear - (153n * shiftedMonth + 2n) / 5n + 1n;
  const month = shiftedMonth + (shiftedMonth < 10n ? 3n : -9n);
  year += month <= 2n ? 1n : 0n;

  const hour = millisecondsWithinDay / 3_600_000n;
  millisecondsWithinDay -= hour * 3_600_000n;
  const minute = millisecondsWithinDay / 60_000n;
  millisecondsWithinDay -= minute * 60_000n;
  const second = millisecondsWithinDay / 1_000n;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

export function formatYunQiInstant(instant: YunQiInstant): string {
  const fields = getBeijingCivilFields(instant);

  if (fields.year < 0 || fields.year > 9_999) {
    throw new RangeError('运气时刻超出四位公历年份格式范围');
  }

  return `${pad(fields.year, 4)}-${pad(fields.month)}-${pad(fields.day)}T${pad(fields.hour)}:${pad(fields.minute)}:${pad(fields.second)}+08:00`;
}

export function getBeijingCivilYear(instant: YunQiInstant): number {
  return getBeijingCivilFields(instant).year;
}
