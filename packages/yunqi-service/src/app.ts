import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { CalendarProvider } from '@yunqi/domain';
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import { installErrorHandler } from './plugins/error-handler.js';
import {
  registerOpenApi,
  registerSwaggerUi,
} from './plugins/openapi.js';
import { healthRoutes } from './routes/health.js';
import { contractSchemas } from './schemas/index.js';

export interface BuildAppOptions {
  provider: CalendarProvider;
  now: () => number;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false })
    .withTypeProvider<TypeBoxTypeProvider>();

  await registerOpenApi(app);
  for (const schema of contractSchemas) {
    app.addSchema(schema);
  }
  installErrorHandler(app);
  await app.register(healthRoutes);
  await registerSwaggerUi(app);

  return app;
}
