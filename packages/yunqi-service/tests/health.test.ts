import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('GET /health', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('returns the versioned success envelope without calling Domain', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      code: 'SUCCESS',
      message: '',
      data: { status: 'ok', apiVersion: 'v1' },
    });
  });

  it('serves Swagger UI and emits OpenAPI 3.1', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/docs/' });
    const document = app.swagger();

    expect(response.statusCode).toBe(200);
    expect('openapi' in document ? document.openapi : undefined)
      .toBe('3.1.0');
  });
});
