import type { YunQiInstant } from './time.js';

export type SolarTerm = '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪';

/**
 * Provides astronomical solar-term instants only.
 *
 * Implementations must not decide YunQi year, six-step ownership, interval
 * semantics, or any five-movement/six-qi rule.
 */
export interface CalendarProvider {
  getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant;
}
