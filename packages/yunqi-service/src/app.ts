import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { CalendarProvider } from '@yunqi/domain';
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import { installErrorHandler } from './plugins/error-handler.js';
import {
  DEFAULT_INGRESS_LIMITS,
  installIngress,
  type IngressClock,
  type IngressLimits,
} from './plugins/ingress.js';
import { healthRoutes } from './routes/health.js';
import { yunqiRoutes } from './routes/yunqi.js';
import { learningRoutes } from './routes/learning.js';
import { constitutionRoutes } from './routes/constitution.js';
import { contractSchemas } from './schemas/index.js';

export interface BuildAppOptions {
  provider: CalendarProvider;
  now: () => number;
  logger?: FastifyServerOptions['logger'];
  ingress?: Partial<IngressLimits>;
  /** Set to false to omit documentation routes from this Fastify instance. */
  documentation?: boolean;
  /** Internal test seam for the ingress rate window; defaults to a monotonic clock. */
  ingressClock?: IngressClock;
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

  installIngress(app, ingress, options.ingressClock);

  const docs = options.documentation === false ? undefined : await import('./plugins/openapi.js');
  await docs?.registerOpenApi(app);
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
  await docs?.registerSwaggerUi(app);
  await app.register(learningRoutes, { prefix: '/api/v1/yunqi/learning', provider: options.provider, now: options.now });
  await app.register(constitutionRoutes, { prefix: '/api/v1/constitution' });

  return app;
}
