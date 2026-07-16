import {
  type CalendarProvider,
  type SolarTerm,
} from '@yunqi/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { assertSupportedYear } from '../src/services/yunqi-service.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('YunQi service boundaries', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function createApp(provider: CalendarProvider) {
    const app = await buildApp({
      provider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('brands service year assertion failures as invalid arguments', () => {
    let thrown: unknown;
    try {
      assertSupportedYear(1900);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toMatchObject({ name: 'InvalidArgumentError' });
  });

  it('classifies a provider-thrown RangeError as a sanitized 503', async () => {
    const provider: CalendarProvider = {
      getSolarTermInstant() {
        throw new RangeError('provider secret');
      },
    };
    const app = await createApp(provider);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      code: 'CALENDAR_PROVIDER_UNAVAILABLE',
      message: '历法服务暂时不可用',
      details: {},
    });
    expect(response.body).not.toContain('provider secret');
  });

  it('keeps a Domain RangeError as a 400', async () => {
    const provider: CalendarProvider = {
      getSolarTermInstant(year: number, term: SolarTerm) {
        if (year === 2024 && term === '小满') {
          return fixedCalendarProvider.getSolarTermInstant(2024, '春分');
        }

        return fixedCalendarProvider.getSolarTermInstant(year, term);
      },
    };
    const app = await createApp(provider);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_ARGUMENT');
  });

  it('rejects a normalized input whose YunQi year is unsupported', async () => {
    const app = await createApp(fixedCalendarProvider);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload: { dateTime: '1901-01-01T00:00:00+08:00' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_ARGUMENT');
  });

  it.each([
    '1800-06-01T12:00:00',
    '2201-06-01T04:00:00Z',
  ])(
    'rejects far-out normalized input %s before provider access',
    async (dateTime) => {
      let providerCalls = 0;
      const provider: CalendarProvider = {
        getSolarTermInstant() {
          providerCalls += 1;
          throw new RangeError('far-out provider secret');
        },
      };
      const app = await createApp(provider);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/yunqi/calculate',
        payload: { dateTime },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().code).toBe('INVALID_ARGUMENT');
      expect(response.body).not.toContain('far-out provider secret');
      expect(providerCalls).toBe(0);
    },
  );

  it('allows a 2100 civil instant in supported YunQi year 2099', async () => {
    const app = await createApp(fixedCalendarProvider);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      payload: { dateTime: '2100-01-01T00:00:00+08:00' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.year).toBe(2099);
  });
});
