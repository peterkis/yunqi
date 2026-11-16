import type { YunQiInstant } from './time.js';

export type SolarTerm = '大寒' | '春分' | '小满' | '芒种' | '大暑' | '处暑' | '秋分' | '立冬' | '小雪';

/**
 * Provides astronomical solar-term instants only.
 *
 * Implementations must not decide YunQi year, six-step ownership, interval
 * semantics, or any five-movement/six-qi rule.
 */
export interface CalendarProvider {
  getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant;
}
