import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

it('does not expose unexpected internal errors', async () => {
  const app = await buildApp({
    provider: fixedCalendarProvider,
    now: () => 1_716_210_000_000,
    logger: false,
  });
  app.get('/test-error', async () => {
    throw new Error('secret dependency text');
  });

  try {
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
  } finally {
    await app.close();
  }
});
