import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { readServerConfig } from '../src/server-config.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

it('validates process server configuration', () => {
  expect(readServerConfig({})).toEqual({
    host: '0.0.0.0',
    port: 3000,
  });
  expect(readServerConfig({ HOST: '127.0.0.1', PORT: '0' })).toEqual({
    host: '127.0.0.1',
    port: 0,
  });
  expect(() => readServerConfig({ PORT: '3000.5' })).toThrow(RangeError);
  expect(() => readServerConfig({ PORT: '65536' })).toThrow(RangeError);
});

it('listens on and closes an ephemeral port', async () => {
  const app = await buildApp({
    provider: fixedCalendarProvider,
    now: () => 1_716_210_000_000,
    logger: false,
  });

  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    expect(address).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const response = await fetch(address + '/health');
    expect(response.status).toBe(200);
  } finally {
    await app.close();
  }
});
