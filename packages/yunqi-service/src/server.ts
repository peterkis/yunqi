import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { buildApp } from './app.js';
import { readServerConfig } from './server-config.js';

const config = readServerConfig(process.env);

const app = await buildApp({
  provider: tyme4tsCalendarProvider,
  now: Date.now,
  logger: true,
});

await app.listen({
  host: config.host,
  port: config.port,
});
