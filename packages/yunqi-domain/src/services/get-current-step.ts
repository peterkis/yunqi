import type { CalendarProvider } from '../calendar/calendar-provider.js';
import { defaultCalendarProvider } from '../calendar/tyme-calendar-provider.js';
import type { DateTimeInput, SixQiStep } from '../types.js';
import { calculateYunQi } from './calculate-yunqi.js';

export function getCurrentStep(
  input: DateTimeInput,
  provider: CalendarProvider = defaultCalendarProvider,
): SixQiStep {
  return calculateYunQi(input, provider).currentStep;
}
