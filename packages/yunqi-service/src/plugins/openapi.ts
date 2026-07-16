import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerOpenApi(
  app: FastifyInstance,
): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'YunQi Service API',
        version: '1.0.0',
        description: 'Versioned YunQi time-fact and rule-mapping contract.',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local server' },
      ],
      tags: [
        { name: 'system', description: 'Service status endpoints' },
        { name: 'yunqi', description: 'YunQi contract endpoints' },
      ],
    },
  });
}

export async function registerSwaggerUi(
  app: FastifyInstance,
): Promise<void> {
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
  });
}
