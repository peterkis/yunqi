import {
  createYunQiInstant,
  type CalendarProvider,
  type SolarTerm,
} from '@yunqi/domain';

const TERM_FIELDS = {
  大寒: [1, 20, 22, 7, 22],
  春分: [3, 20, 11, 6, 25],
  小满: [5, 20, 20, 59, 31],
  大暑: [7, 22, 15, 44, 26],
  秋分: [9, 22, 20, 43, 42],
  小雪: [11, 22, 3, 56, 31],
} as const satisfies Record<
  SolarTerm,
  readonly [number, number, number, number, number]
>;

export const fixedCalendarProvider: CalendarProvider = Object.freeze({
  getSolarTermInstant(year: number, term: SolarTerm) {
    const [month, day, hour, minute, second] = TERM_FIELDS[term];
    const epoch = Date.UTC(year, month - 1, day, hour - 8, minute, second);
    return createYunQiInstant(epoch);
  },
});
