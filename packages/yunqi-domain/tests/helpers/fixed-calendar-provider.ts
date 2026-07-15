import type { CalendarProvider, SolarTerm } from '../../src/calendar/provider.js';
import {
  createYunQiInstant,
  type YunQiInstant,
} from '../../src/calendar/time.js';

const MILLISECONDS_PER_DAY = 86_400_000;
const BEIJING_OFFSET_MILLISECONDS = 28_800_000;

const FIXED_TERM_FIELDS = Object.freeze({
  大寒: Object.freeze([1, 20, 22, 7, 22] as const),
  春分: Object.freeze([3, 20, 11, 6, 25] as const),
  小满: Object.freeze([5, 20, 20, 59, 31] as const),
  大暑: Object.freeze([7, 22, 15, 44, 26] as const),
  秋分: Object.freeze([9, 22, 20, 43, 42] as const),
  小雪: Object.freeze([11, 22, 3, 56, 31] as const),
} satisfies Record<SolarTerm, readonly [number, number, number, number, number]>);

export const FIXED_2024_BOUNDARY_EPOCHS = Object.freeze([
  1_705_759_642_000,
  1_710_903_985_000,
  1_716_209_971_000,
  1_721_634_266_000,
  1_727_009_022_000,
  1_732_218_991_000,
  1_737_316_808_000,
] as const);

export const fixed2024BoundaryInstants = Object.freeze(
  FIXED_2024_BOUNDARY_EPOCHS.map(createYunQiInstant),
);

function floorDivide(dividend: number, divisor: number): number {
  return Math.floor(dividend / divisor);
}

function epochMillisecondsForFixedTerm(year: number, term: SolarTerm): number {
  const [month, day, hour, minute, second] = FIXED_TERM_FIELDS[term];
  const adjustedYear = year - (month <= 2 ? 1 : 0);
  const era = floorDivide(adjustedYear, 400);
  const yearOfEra = adjustedYear - era * 400;
  const shiftedMonth = month + (month > 2 ? -3 : 9);
  const dayOfYear = floorDivide(153 * shiftedMonth + 2, 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 +
    floorDivide(yearOfEra, 4) -
    floorDivide(yearOfEra, 100) +
    dayOfYear;
  const daysSinceEpoch = era * 146_097 + dayOfEra - 719_468;

  return (
    daysSinceEpoch * MILLISECONDS_PER_DAY +
    hour * 3_600_000 +
    minute * 60_000 +
    second * 1_000 -
    BEIJING_OFFSET_MILLISECONDS
  );
}

function getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant {
  if (year === 2024) {
    const index = Object.keys(FIXED_TERM_FIELDS).indexOf(term);
    return fixed2024BoundaryInstants[index];
  }

  if (year === 2025 && term === '大寒') {
    return fixed2024BoundaryInstants[6];
  }

  return createYunQiInstant(epochMillisecondsForFixedTerm(year, term));
}

export const fixedCalendarProvider: CalendarProvider = Object.freeze({
  getSolarTermInstant,
});
