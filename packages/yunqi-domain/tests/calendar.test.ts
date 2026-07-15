import { describe, expect, it } from 'vitest';
import { parseDateTimeInput, formatBeijingDateTime } from '../src/calendar/beijing-time.js';
import { tymeCalendarProvider } from '../src/calendar/tyme-calendar-provider.js';

describe('Beijing time', () => {
  it('requires an absolute instant and formats it in UTC+08:00', () => {
    expect(() => parseDateTimeInput('2024-01-20T22:07:08')).toThrow(/时区/);
    const instant = parseDateTimeInput('2024-01-20T14:07:08Z');
    expect(formatBeijingDateTime(instant)).toBe('2024-01-20T22:07:08+08:00');
  });

  it('gets the 2024 Dahan instant from tyme4ts at second precision', () => {
    const dahan = tymeCalendarProvider.getSolarTermTime(2024, '大寒');
    expect(dahan.iso).toBe('2024-01-20T22:07:22+08:00');
  });
});
