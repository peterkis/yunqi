import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('1991 fixed Beijing historical-DST regressions', () => {
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
      term: '小满',
      local: '1991-05-21T21:20:14',
      offset: '1991-05-21T21:20:14+08:00',
      utc: '1991-05-21T13:20:14Z',
      epochMilliseconds: 674_832_014_000,
      step: 3,
    },
    {
      term: '大暑',
      local: '1991-07-23T16:11:08',
      offset: '1991-07-23T16:11:08+08:00',
      utc: '1991-07-23T08:11:08Z',
      epochMilliseconds: 680_256_668_000,
      step: 4,
    },
  ])(
    'normalizes all $term boundary forms to the exact fixed +08 result',
    async ({ local, offset, utc, epochMilliseconds, step }) => {
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
      for (const result of [localResult, offsetResult, utcResult]) {
        expect(result.year).toBe(1991);
        expect(result.currentStep.index).toBe(step);
      }
    },
    15_000,
  );
});
