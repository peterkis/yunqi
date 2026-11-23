import { afterAll, describe, expect, it } from 'vitest';
import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { buildApp } from '../src/app.js';
import { normalizeApiDateTime } from '../src/modules/time-normalizer/index.js';

const now = '2026-11-23T09:00:00';
const app = await buildApp({ provider: tyme4tsCalendarProvider, now: () => normalizeApiDateTime(now).instant.epochMilliseconds });
afterAll(() => app.close());
async function post(path: string, payload: Record<string, unknown>) {
  const result = await app.inject({ method: 'POST', url: '/api/v1/yunqi/learning/' + path, payload });
  expect(result.headers['cache-control']).toBe('no-store');
  return result;
}
describe('civil birth entry', () => {
  it.each([
    [1980, 10, 3, undefined, ['1980-11-10']],
    [1980, 11, 14, undefined, ['1980-01-01', '1980-12-20']],
    [2023, 2, 1, true, ['2023-03-22']],
    [2023, 2, 1, false, ['2023-02-20']],
    [2023, 1, 1, true, []],
  ] as const)('matches %s lunar %s/%s leap=%s', async (year, month, day, leap, wanted) => {
    const res = await post('birth-date-preview', { year, calendar: 'lunar', month, day, leap });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.matches.map((item: { birthDate: string }) => item.birthDate)).toEqual(wanted);
  });
  it('intersects the civil year with actual annual boundaries, the supported range and now', async () => {
    const request = async (year: number) => (await post('birth-year-comparison', { year })).json().data;
    const { candidates } = await request(1980);
    expect(candidates.map((item: { year: number }) => item.year)).toEqual([1979, 1980]);
    expect(candidates[0].until).toEqual(candidates[1].from);
    expect(candidates[0].from.localTime).toMatch(/^1980-01-01T00:00/);
    expect(candidates[1].comparisons.map((item: {title: string}) => item.title)).toEqual(['中运对照','司天对照','在泉对照']);
    expect(candidates[1]).not.toHaveProperty('learning');
    expect((await request(1900)).candidates).toHaveLength(1);
    expect((await request(2026)).candidates.at(-1).until.epochMilliseconds).toBe(normalizeApiDateTime(now).instant.epochMilliseconds + 1);
    expect((await post('birth-year-comparison', { year: 2027 })).statusCode).toBe(400);
  });
  it('returns the eligible candidates just before, at and after Great Cold', async () => {
    const end = normalizeApiDateTime('2026-01-21T00:00:00');
    const yr = (await post('birth-year-comparison', { year: 2026 })).json().data;
    const boundary = yr.candidates[0].until.epochMilliseconds;
    const { calculateBirthYear, previewBirthDate } = await import('../src/services/learning-service.js');
    const { normalizeEpochMilliseconds } = await import('../src/modules/time-normalizer/index.js');
    expect(boundary).toBeLessThan(end.instant.epochMilliseconds);
    for (const offset of [-1, 0, 1]) {
      const at = normalizeEpochMilliseconds(boundary + offset);
      const annual = calculateBirthYear(2026, at, tyme4tsCalendarProvider);
      expect(annual.candidates.at(-1)?.year).toBe(offset < 0 ? 2025 : 2026);
      const preview = previewBirthDate({ year: 2026, calendar: 'solar', month: 1, day: 20 }, at, tyme4tsCalendarProvider);
      expect(preview.matches[0]?.boundaries.some(item => item.label === '大寒交运气年')).toBe(true);
      expect(preview.matches[0]?.annualLabels).toHaveLength(offset < 0 ? 1 : 2);
    }
  });
  it('keeps private input and calendar exception details out of request logs', async () => {
    let lines = '';
    const broken = await buildApp({
      provider: { getSolarTermInstant() { throw new Error('private birth input 1980-11-10'); } },
      now: () => normalizeApiDateTime(now).instant.epochMilliseconds,
      logger: { stream: { write(value: string) { lines += value; } } },
    });
    try {
      const response = await broken.inject({ method: 'POST', url: '/api/v1/yunqi/learning/birth-year-comparison', payload: { year: 1980 } });
      expect(response.statusCode).toBe(503);
      expect(lines).toContain('Calendar provider unavailable');
      expect(lines).not.toMatch(/1980|private birth input/);
    } finally { await broken.close(); }
  });
  it('distinguishes ordinary, movement and Great Cold boundary days', async () => {
    const preview = async (month: number, day: number) => (await post('birth-date-preview', { calendar: 'solar', year: 2026, month, day })).json().data.matches;
    expect((await preview(3,12))[0].boundaries).toEqual([]);
    expect((await preview(1,20))[0].annualLabels).toHaveLength(2);
    expect((await preview(1,20))[0].boundaries.map((item: { label: string }) => item.label)).toContain('大寒交运气年');
    expect((await preview(4,2))[0].boundaries.some((item: { label: string }) => item.label.startsWith('交运'))).toBe(true);
    expect(await preview(12,31)).toEqual([]);
    expect((await post('birth-date-preview', { year: 1980, calendar: 'solar', month: 2, day: 31 })).statusCode).toBe(400);
  });
});
