export const BEIJING_STANDARD_OFFSET = '+08:00' as const;
export const BEIJING_CALENDAR_TIME_STANDARD =
  'BeijingStandardTime+08:00' as const;

export type BeijingStandardOffset = typeof BEIJING_STANDARD_OFFSET;
export type CalendarTimeStandard = typeof BEIJING_CALENDAR_TIME_STANDARD;

/**
 * BeijingStandardTime+08:00 Absolute Representation.
 *
 * This keeps the public YunQiInstant name while explicitly limiting the model
 * to fixed Beijing Standard Time transport, ordering, persistence, audit, and
 * compatibility. epochMilliseconds is not the authoritative calendar
 * comparison source and must not be reinterpreted as civil timezone data.
 */
export interface YunQiInstant {
  readonly epochMilliseconds: number;
  readonly offset: BeijingStandardOffset;
}

export interface BeijingLocalDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export interface YunQiCalendarTime {
  readonly localDateTime: BeijingLocalDateTime;
  readonly calendarTimeStandard: CalendarTimeStandard;
  readonly instant: YunQiInstant;
}

const BEIJING_OFFSET_MILLISECONDS = 28_800_000n;
const MILLISECONDS_PER_DAY = 86_400_000n;
const MINIMUM_SAFE_INTEGER = BigInt(Number.MIN_SAFE_INTEGER);
const MAXIMUM_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);
const LOCAL_FIELD_NAMES = [
  'year',
  'month',
  'day',
  'hour',
  'minute',
  'second',
  'millisecond',
] as const satisfies readonly (keyof BeijingLocalDateTime)[];
const INSTANT_FIELD_NAMES = [
  'epochMilliseconds',
  'offset',
] as const satisfies readonly (keyof YunQiInstant)[];
const CALENDAR_TIME_FIELD_NAMES = [
  'localDateTime',
  'calendarTimeStandard',
  'instant',
] as const satisfies readonly (keyof YunQiCalendarTime)[];

function assertExactOwnDataProperties(
  value: object,
  fields: readonly (string | symbol)[],
  context: string,
): void {
  const ownKeys = Reflect.ownKeys(value);

  if (
    ownKeys.length !== fields.length ||
    !fields.every((field) => ownKeys.includes(field))
  ) {
    throw new RangeError(`${context}必须只包含规范的自有字段`);
  }

  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);

    if (descriptor === undefined || !('value' in descriptor)) {
      throw new RangeError(`${context}.${String(field)}必须是自有数据字段`);
    }
  }
}

function assertSafeInteger(
  value: unknown,
  context: string,
): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new RangeError(`${context}必须是安全整数`);
  }
}

function assertRange(
  value: number,
  minimum: number,
  maximum: number,
  context: string,
): void {
  if (value < minimum || value > maximum) {
    throw new RangeError(`${context}必须在 ${minimum} 到 ${maximum} 之间`);
  }
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function assertBeijingLocalDateTime(
  value: unknown,
  context: string,
): asserts value is BeijingLocalDateTime {
  if (typeof value !== 'object' || value === null) {
    throw new RangeError(`${context}必须是有效的固定北京时间字段`);
  }

  assertExactOwnDataProperties(value, LOCAL_FIELD_NAMES, context);
  const candidate = value as Partial<BeijingLocalDateTime>;

  for (const field of LOCAL_FIELD_NAMES) {
    assertSafeInteger(candidate[field], `${context}.${field}`);
  }

  const localDateTime = candidate as BeijingLocalDateTime;

  assertRange(localDateTime.month, 1, 12, `${context}.month`);
  assertRange(
    localDateTime.day,
    1,
    getDaysInMonth(localDateTime.year, localDateTime.month),
    `${context}.day`,
  );
  assertRange(localDateTime.hour, 0, 23, `${context}.hour`);
  assertRange(localDateTime.minute, 0, 59, `${context}.minute`);
  assertRange(localDateTime.second, 0, 59, `${context}.second`);
  assertRange(localDateTime.millisecond, 0, 999, `${context}.millisecond`);
}

function floorDivide(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  return dividend % divisor < 0n ? quotient - 1n : quotient;
}

function localDateTimeToEpochMilliseconds(
  localDateTime: BeijingLocalDateTime,
): number {
  const originalYear = BigInt(localDateTime.year);
  const month = BigInt(localDateTime.month);
  const day = BigInt(localDateTime.day);
  const adjustedYear =
    originalYear - (localDateTime.month <= 2 ? 1n : 0n);
  const era = floorDivide(adjustedYear, 400n);
  const yearOfEra = adjustedYear - era * 400n;
  const shiftedMonth = month + (localDateTime.month > 2 ? -3n : 9n);
  const dayOfYear = (153n * shiftedMonth + 2n) / 5n + day - 1n;
  const dayOfEra =
    yearOfEra * 365n +
    yearOfEra / 4n -
    yearOfEra / 100n +
    dayOfYear;
  const daysSinceEpoch = era * 146_097n + dayOfEra - 719_468n;
  const epochMilliseconds =
    daysSinceEpoch * MILLISECONDS_PER_DAY +
    BigInt(localDateTime.hour) * 3_600_000n +
    BigInt(localDateTime.minute) * 60_000n +
    BigInt(localDateTime.second) * 1_000n +
    BigInt(localDateTime.millisecond) -
    BEIJING_OFFSET_MILLISECONDS;

  if (
    epochMilliseconds < MINIMUM_SAFE_INTEGER ||
    epochMilliseconds > MAXIMUM_SAFE_INTEGER
  ) {
    throw new RangeError('固定北京时间超出安全纪元毫秒范围');
  }

  return Number(epochMilliseconds);
}

function instantToBeijingLocalDateTime(
  instant: YunQiInstant,
): BeijingLocalDateTime {
  const beijingMilliseconds =
    BigInt(instant.epochMilliseconds) + BEIJING_OFFSET_MILLISECONDS;
  const daysSinceEpoch = floorDivide(
    beijingMilliseconds,
    MILLISECONDS_PER_DAY,
  );
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
  const millisecond = millisecondsWithinDay - second * 1_000n;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(millisecond),
  };
}

function freezeLocalDateTime(
  localDateTime: BeijingLocalDateTime,
): BeijingLocalDateTime {
  return Object.freeze({
    year: localDateTime.year,
    month: localDateTime.month,
    day: localDateTime.day,
    hour: localDateTime.hour,
    minute: localDateTime.minute,
    second: localDateTime.second,
    millisecond: localDateTime.millisecond,
  });
}

export function createYunQiInstant(
  epochMilliseconds: number,
): YunQiInstant {
  assertSafeInteger(epochMilliseconds, '运气时刻的纪元毫秒值');

  return Object.freeze({
    epochMilliseconds,
    offset: BEIJING_STANDARD_OFFSET,
  });
}

export function assertYunQiInstant(
  value: unknown,
  context = '运气时刻',
): asserts value is YunQiInstant {
  if (typeof value !== 'object' || value === null) {
    throw new RangeError(`${context}必须是有效的运气时刻`);
  }

  assertExactOwnDataProperties(value, INSTANT_FIELD_NAMES, context);
  const candidate = value as Partial<YunQiInstant>;
  assertSafeInteger(candidate.epochMilliseconds, `${context}的纪元毫秒值`);

  if (candidate.offset !== BEIJING_STANDARD_OFFSET) {
    throw new RangeError(
      `${context}的固定偏移必须是 ${BEIJING_STANDARD_OFFSET}`,
    );
  }
}

export function createYunQiCalendarTime(
  localDateTime: BeijingLocalDateTime,
): YunQiCalendarTime {
  assertBeijingLocalDateTime(localDateTime, '固定北京时间');

  const frozenLocalDateTime = freezeLocalDateTime(localDateTime);
  const instant = createYunQiInstant(
    localDateTimeToEpochMilliseconds(frozenLocalDateTime),
  );
  const value = Object.freeze({
    localDateTime: frozenLocalDateTime,
    calendarTimeStandard: BEIJING_CALENDAR_TIME_STANDARD,
    instant,
  });

  assertYunQiCalendarTime(value);
  return value;
}

export function createYunQiCalendarTimeFromInstant(
  instant: YunQiInstant,
): YunQiCalendarTime {
  assertYunQiInstant(instant);

  const frozenInstant = Object.isFrozen(instant)
    ? instant
    : createYunQiInstant(instant.epochMilliseconds);
  const localDateTime = freezeLocalDateTime(
    instantToBeijingLocalDateTime(frozenInstant),
  );
  const value = Object.freeze({
    localDateTime,
    calendarTimeStandard: BEIJING_CALENDAR_TIME_STANDARD,
    instant: frozenInstant,
  });

  assertYunQiCalendarTime(value);
  return value;
}

export function assertYunQiCalendarTimeStructure(
  value: unknown,
  context = '运气日历时间',
): asserts value is YunQiCalendarTime {
  if (typeof value !== 'object' || value === null) {
    throw new RangeError(`${context}必须是有效的运气日历时间`);
  }

  assertExactOwnDataProperties(value, CALENDAR_TIME_FIELD_NAMES, context);
  const candidate = value as Partial<YunQiCalendarTime>;
  assertBeijingLocalDateTime(
    candidate.localDateTime,
    `${context}.localDateTime`,
  );

  if (candidate.calendarTimeStandard !== BEIJING_CALENDAR_TIME_STANDARD) {
    throw new RangeError(
      `${context}.calendarTimeStandard必须是 ${BEIJING_CALENDAR_TIME_STANDARD}`,
    );
  }

  assertYunQiInstant(candidate.instant, `${context}.instant`);
}

export function assertYunQiCalendarTime(
  value: unknown,
  context = '运气日历时间',
): asserts value is YunQiCalendarTime {
  assertYunQiCalendarTimeStructure(value, context);

  if (
    !Object.isFrozen(value) ||
    !Object.isFrozen(value.localDateTime) ||
    !Object.isFrozen(value.instant)
  ) {
    throw new RangeError(`${context}及其嵌套值必须不可变`);
  }

  const derivedEpoch = localDateTimeToEpochMilliseconds(value.localDateTime);

  if (derivedEpoch !== value.instant.epochMilliseconds) {
    throw new RangeError(`${context}的本地字段与纪元毫秒不一致`);
  }

  const projectedLocalDateTime = instantToBeijingLocalDateTime(value.instant);

  if (
    compareBeijingLocalDateTime(
      value.localDateTime,
      projectedLocalDateTime,
    ) !== 0
  ) {
    throw new RangeError(`${context}未通过固定偏移往返校验`);
  }
}

export function compareBeijingLocalDateTime(
  left: BeijingLocalDateTime,
  right: BeijingLocalDateTime,
): number {
  assertBeijingLocalDateTime(left, '左侧固定北京时间');
  assertBeijingLocalDateTime(right, '右侧固定北京时间');

  for (const field of LOCAL_FIELD_NAMES) {
    const difference = left[field] - right[field];

    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

function formatLocalDateTime(
  localDateTime: BeijingLocalDateTime,
  preserveMilliseconds: boolean,
): string {
  if (localDateTime.year < 0 || localDateTime.year > 9_999) {
    throw new RangeError('固定北京时间超出四位公历年份格式范围');
  }

  const fractionalSecond =
    preserveMilliseconds && localDateTime.millisecond !== 0
      ? `.${pad(localDateTime.millisecond, 3)}`
      : '';

  return `${pad(localDateTime.year, 4)}-${pad(localDateTime.month)}-${pad(localDateTime.day)}T${pad(localDateTime.hour)}:${pad(localDateTime.minute)}:${pad(localDateTime.second)}${fractionalSecond}${BEIJING_STANDARD_OFFSET}`;
}

export function formatYunQiInstant(instant: YunQiInstant): string {
  assertYunQiInstant(instant);

  return formatLocalDateTime(
    instantToBeijingLocalDateTime(instant),
    false,
  );
}

export function formatYunQiCalendarTime(value: YunQiCalendarTime): string {
  assertYunQiCalendarTimeStructure(value);

  return formatLocalDateTime(value.localDateTime, true);
}

export function getBeijingCivilYear(instant: YunQiInstant): number {
  assertYunQiInstant(instant);

  return instantToBeijingLocalDateTime(instant).year;
}
