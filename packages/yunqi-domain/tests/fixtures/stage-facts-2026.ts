import type { CalendarProvider, SolarTerm } from '../../src/calendar/provider.js';
import { createYunQiInstant } from '../../src/calendar/time.js';
import { fixedCalendarProvider } from '../helpers/fixed-calendar-provider.js';

// Captured before E1 at bc86e17 with Domain 1.3.1 and tyme4ts 1.5.2.
// These are engineering regression witnesses, not independent astronomy data.
const TERM_EPOCHS_2026 = {
  大寒: 1_768_873_496_000,
  春分: 1_774_017_959_000,
  小满: 1_779_323_805_000,
  芒种: 1_780_674_501_000,
  大暑: 1_784_747_585_000,
  处暑: 1_787_451_529_000,
  秋分: 1_790_121_914_000,
  立冬: 1_794_045_125_000,
  小雪: 1_795_332_201_000,
} as const satisfies Readonly<Record<SolarTerm, number>>;

export const MOVEMENT_BOUNDARY_EPOCHS_2026 = [
  1_768_873_496_000,
  1_775_141_159_000,
  1_781_538_501_000,
  1_788_056_329_000,
  1_794_390_725_000,
  1_800_430_190_000,
] as const;

export const stageFacts2026Provider: CalendarProvider = Object.freeze({
  getSolarTermInstant(year: number, term: SolarTerm) {
    if (year === 2026) return createYunQiInstant(TERM_EPOCHS_2026[term]);
    if (year === 2027 && term === '大寒') return createYunQiInstant(MOVEMENT_BOUNDARY_EPOCHS_2026[5]);
    return fixedCalendarProvider.getSolarTermInstant(year, term);
  },
});
