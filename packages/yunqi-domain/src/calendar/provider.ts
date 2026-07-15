import type { YunQiInstant } from './time.js';

export type SolarTerm = '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪';

export interface CalendarProvider {
  getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant;
}
