import type { BeijingDateTime, SixStepBoundaryTerm } from '../types.js';

export interface CalendarProvider {
  getSolarTermTime(year: number, term: SixStepBoundaryTerm): BeijingDateTime;
}
