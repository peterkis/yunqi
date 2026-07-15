import type { CalendarProvider } from '../calendar/provider.js';
import type { YunQiInstant } from '../calendar/time.js';
import type { SixQiStep } from '../types.js';
import { calculateYunQi } from './calculate-yunqi.js';

export function getCurrentStep(
  input: YunQiInstant,
  provider: CalendarProvider,
): SixQiStep {
  return calculateYunQi(input, provider).currentStep;
}
