import type { CalendarProvider, SolarTerm } from '../calendar/provider.js';
import { createYunQiCalendarTime, createYunQiCalendarTimeFromInstant,
  compareBeijingLocalDateTime, type YunQiCalendarTime, type YunQiInstant } from '../calendar/time.js';
import type { SuiYun, YunQiYearResult } from '../types.js';
import { hostMovements, MOVEMENT_BOUNDARY_METHOD, MOVEMENT_ELEMENTS, MOVEMENT_NAMES } from './rules.js';

export interface MovementStep {
  readonly index: number;
  readonly name: string;
  readonly start: YunQiInstant;
  readonly end: YunQiInstant;
  readonly host: SuiYun;
  readonly guest: SuiYun;
  readonly boundaryMethod: string;
  readonly explanation: string;
}

/** Add whole fixed-Beijing calendar days, retaining clock fields without DST. */
export function addBeijingCalendarDays(input: YunQiCalendarTime, days: number): YunQiCalendarTime {
  if (!Number.isInteger(days) || days < 0 || days > 31) throw new RangeError('日偏移必须为0到31整数');
  const fields = { ...input.localDateTime };
  for (let i = 0; i < days; i++) {
    const leap = fields.year % 4 === 0 && (fields.year % 100 !== 0 || fields.year % 400 === 0);
    const lastDay = fields.month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(fields.month) ? 30 : 31;
    if (fields.day < lastDay) fields.day++;
    else { fields.day = 1; if (fields.month < 12) fields.month++; else { fields.month = 1; fields.year++; } }
  }
  return createYunQiCalendarTime(fields);
}

export function buildMovementSteps(annual: YunQiYearResult, provider: CalendarProvider): readonly MovementStep[] {
  const offsets: readonly (readonly [SolarTerm, number])[] = [['春分', 13], ['芒种', 10], ['处暑', 7], ['立冬', 4]];
  const boundaries = [annual.start, ...offsets.map(([term, days]) =>
    addBeijingCalendarDays(createYunQiCalendarTimeFromInstant(provider.getSolarTermInstant(annual.year, term)), days).instant), annual.end];
  for (let i = 1; i < boundaries.length; i++) {
    if (compareBeijingLocalDateTime(createYunQiCalendarTimeFromInstant(boundaries[i - 1]).localDateTime,
      createYunQiCalendarTimeFromInstant(boundaries[i]).localDateTime) >= 0) throw new RangeError('五步运边界必须递增');
  }
  const host = hostMovements(annual.stem);
  const firstGuest = MOVEMENT_ELEMENTS.indexOf(annual.suiYun.element);
  return host.map((movement, i) => ({
    index: i + 1, name: MOVEMENT_NAMES[i], start: boundaries[i], end: boundaries[i + 1],
    host: movement, guest: host[(firstGuest + i) % 5], boundaryMethod: MOVEMENT_BOUNDARY_METHOD,
    explanation: '主运按木火土金水排列，客运从当年中运起排；太少采用《素问·六元正纪大论》所列五音次序。交运采用节气时刻加整日，不等同于古代每运七十三日五刻定长法。',
  }));
}

export function movementContains(step: MovementStep, input: YunQiCalendarTime): boolean {
  return compareBeijingLocalDateTime(createYunQiCalendarTimeFromInstant(step.start).localDateTime, input.localDateTime) <= 0
    && compareBeijingLocalDateTime(input.localDateTime, createYunQiCalendarTimeFromInstant(step.end).localDateTime) < 0;
}
