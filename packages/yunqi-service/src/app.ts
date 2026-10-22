import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { CalendarProvider } from '@yunqi/domain';
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import { installErrorHandler } from './plugins/error-handler.js';
import { DEFAULT_INGRESS_LIMITS, installIngress, type IngressLimits } from './plugins/ingress.js';
import {
  registerOpenApi,
  registerSwaggerUi,
} from './plugins/openapi.js';
import { healthRoutes } from './routes/health.js';
import { yunqiRoutes } from './routes/yunqi.js';
import { contractSchemas } from './schemas/index.js';

export interface BuildAppOptions {
  provider: CalendarProvider;
  now: () => number;
  logger?: FastifyServerOptions['logger'];
  ingress?: Partial<IngressLimits>;
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const ingress = { ...DEFAULT_INGRESS_LIMITS, ...options.ingress };
  for (const [name, value] of Object.entries(ingress)) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > 2_147_483_647) {
      throw new RangeError(`Invalid ingress limit: ${name}`);
    }
  }
  const app = Fastify({
    requestTimeout: ingress.requestDeadlineMs,
    connectionTimeout: ingress.connectionTimeoutMs,
    logger: options.logger ?? false,
    // Keep scalar path-param coercion, but never unwrap arrays in JSON bodies.
    ajv: { customOptions: { removeAdditional: false, coerceTypes: true } },
  })
    .withTypeProvider<TypeBoxTypeProvider>();

  installIngress(app, ingress);

  await registerOpenApi(app);
  for (const schema of contractSchemas) {
    app.addSchema(schema);
  }
  installErrorHandler(app);
  await app.register(healthRoutes);
  await app.register(yunqiRoutes, {
    prefix: '/api/v1/yunqi',
    provider: options.provider,
    now: options.now,
  });
  await registerSwaggerUi(app);

  return app;
}
