import type {
  CalendarProvider,
  SolarTerm,
  YunQiInstant,
} from '@yunqi/domain';

export class CalendarProviderUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Calendar provider unavailable', { cause });
    this.name = 'CalendarProviderUnavailableError';
  }
}

export function protectCalendarProvider(
  provider: CalendarProvider,
): CalendarProvider {
  return Object.freeze({
    getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant {
      try {
        return provider.getSolarTermInstant(year, term);
      } catch (cause) {
        throw new CalendarProviderUnavailableError(cause);
      }
    },
  });
}
