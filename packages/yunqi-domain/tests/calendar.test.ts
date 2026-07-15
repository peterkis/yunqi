import { describe, expect, it } from 'vitest';
import { parseDateTimeInput, formatBeijingDateTime } from '../src/calendar/beijing-time.js';
import {
  defaultCalendarProvider,
  tymeCalendarProvider,
} from '../src/calendar/tyme-calendar-provider.js';
import * as publicApi from '../src/index.js';

describe('Beijing time', () => {
  it('requires an absolute instant and formats it in UTC+08:00', () => {
    expect(() => parseDateTimeInput('2024-01-20T22:07:08')).toThrow(/时区/);
    const instant = parseDateTimeInput('2024-01-20T14:07:08Z');
    expect(formatBeijingDateTime(instant)).toBe('2024-01-20T22:07:08+08:00');
  });

  it('rejects an invalid Date value', () => {
    expect(() => parseDateTimeInput(new Date(Number.NaN))).toThrow(/无效/);
  });

  it('gets the 2024 Dahan instant from tyme4ts at second precision', () => {
    const dahan = tymeCalendarProvider.getSolarTermTime(2024, '大寒');
    expect(dahan.iso).toBe('2024-01-20T22:07:22+08:00');
  });

  it('returns matching ISO and epoch representations for a solar term', () => {
    const dahan = tymeCalendarProvider.getSolarTermTime(2024, '大寒');

    expect(dahan.epochMilliseconds).toBe(Date.parse(dahan.iso));
    expect(formatBeijingDateTime(dahan.epochMilliseconds)).toBe(dahan.iso);
  });

  it('freezes the tyme calendar provider', () => {
    expect(Object.isFrozen(tymeCalendarProvider)).toBe(true);
  });

  it('uses the tyme calendar provider as the default', () => {
    expect(defaultCalendarProvider).toBe(tymeCalendarProvider);
  });

  it('exports the calendar contracts from the package entrypoint', () => {
    expect(publicApi.parseDateTimeInput).toBe(parseDateTimeInput);
    expect(publicApi.formatBeijingDateTime).toBe(formatBeijingDateTime);
    expect(publicApi.tymeCalendarProvider).toBe(tymeCalendarProvider);
    expect(publicApi.defaultCalendarProvider).toBe(defaultCalendarProvider);
  });
});
