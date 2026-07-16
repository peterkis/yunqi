import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('service error handling', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function createApp(now = () => 1_716_210_000_000) {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now,
      logger: false,
    });
    apps.push(app);
    return app;
  }

  it('does not expose unexpected internal errors', async () => {
    const app = await createApp();
    app.get('/test-error', async () => {
      throw new Error('secret dependency text');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '服务内部错误',
      details: {},
    });
    expect(response.body).not.toContain('secret dependency text');
  });

  it('sanitizes an injected clock RangeError as an internal error', async () => {
    const app = await createApp(() => {
      throw new RangeError('secret clock range text');
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/current',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '服务内部错误',
      details: {},
    });
    expect(response.body).not.toContain('secret clock range text');
  });

  it.each([
    ['malformed JSON', '{"dateTime":'],
    ['an empty JSON document', ' '],
  ])('maps %s to a generic invalid-argument response', async (_name, payload) => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      headers: { 'content-type': 'application/json' },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 'INVALID_ARGUMENT',
      message: '请求参数无效',
      details: {},
    });
  });

  it('maps an unsupported request media type to a generic 400', async () => {
    const app = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/yunqi/calculate',
      headers: { 'content-type': 'application/xml' },
      payload: '<calculate />',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 'INVALID_ARGUMENT',
      message: '请求参数无效',
      details: {},
    });
  });
});
