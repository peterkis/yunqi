import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('versioned YunQi routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a mapped annual success envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      code: 'SUCCESS',
      message: '',
      data: {
        ruleVersion: 'V1.0-2026.7.7-implementation.1',
        year: 2024,
        stemBranch: { ganzhi: '甲辰', stem: '甲', branch: '辰' },
        sixQi: { sitian: '太阳寒水', zaiquan: '太阴湿土' },
      },
    });
  });

  it.each(['2024.5', 'not-a-year', '1900', '2100'])(
    'rejects invalid year %s',
    async (year) => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/yunqi/year/${year}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('INVALID_ARGUMENT');
    },
  );

  it.each([
    '2024-05-20T21:00:00',
    '2024-05-20T13:00:00Z',
    '2024-05-20T21:00:00+08:00',
  ])('calculates equivalent input %s', async (dateTime) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload: { dateTime },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.input.epochMilliseconds)
      .toBe(1_716_210_000_000);
  });

  it('uses the injected absolute clock for current', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/current',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.input.epochMilliseconds)
      .toBe(1_716_210_000_000);
  });

  it.each([
    ['missing dateTime', {}],
    [
      'an additional property',
      { dateTime: '2024-05-20T21:00:00', extra: true },
    ],
    ['an invalid calendar date', { dateTime: '2024-02-30T21:00:00' }],
    [
      'unsupported fractional precision',
      { dateTime: '2024-05-20T21:00:00.1234' },
    ],
    [
      'a nonexistent hospital-local time',
      { dateTime: '1991-04-14T02:30:00' },
    ],
    [
      'an ambiguous hospital-local time',
      { dateTime: '1991-09-15T01:30:00' },
    ],
  ])('rejects a request body with %s', async (_caseName, payload) => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_ARGUMENT');
  });
});
