import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('fixed Beijing Service boundary normalization', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function calculate(dateTime: string) {
    const app = await buildApp({
      provider: tyme4tsCalendarProvider,
      now: () => 1_705_759_642_000,
      logger: false,
    });
    apps.push(app);
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload: { dateTime },
    });

    expect(response.statusCode).toBe(200);
    return response.json().data;
  }

  it.each([
    {
      local: '2024-01-20T22:07:21',
      offset: '2024-01-20T22:07:21+08:00',
      utc: '2024-01-20T14:07:21Z',
      epochMilliseconds: 1_705_759_641_000,
      year: 2023,
      step: 6,
    },
    {
      local: '2024-01-20T22:07:22',
      offset: '2024-01-20T22:07:22+08:00',
      utc: '2024-01-20T14:07:22Z',
      epochMilliseconds: 1_705_759_642_000,
      year: 2024,
      step: 1,
    },
    {
      local: '2024-01-20T22:07:23',
      offset: '2024-01-20T22:07:23+08:00',
      utc: '2024-01-20T14:07:23Z',
      epochMilliseconds: 1_705_759_643_000,
      year: 2024,
      step: 1,
    },
  ])(
    'keeps equivalent forms aligned at $offset',
    async ({ local, offset, utc, epochMilliseconds, year, step }) => {
      const [localResult, offsetResult, utcResult] = await Promise.all([
        calculate(local),
        calculate(offset),
        calculate(utc),
      ]);

      expect(localResult.input).toEqual(offsetResult.input);
      expect(utcResult.input).toEqual(offsetResult.input);
      expect(offsetResult.input).toEqual({
        localTime: offset,
        epochMilliseconds,
        offset: '+08:00',
        calendarTimeStandard: 'BeijingStandardTime+08:00',
      });
      expect([localResult.year, localResult.currentStep.index]).toEqual([
        year,
        step,
      ]);
      expect([utcResult.year, utcResult.currentStep.index]).toEqual([
        year,
        step,
      ]);
    },
    15_000,
  );
});
