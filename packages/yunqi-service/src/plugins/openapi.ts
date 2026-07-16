import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import {
  ERROR_RESPONSE_EXAMPLES,
  HEALTH_SUCCESS_EXAMPLES,
} from '../schemas/common.js';
import {
  CALCULATE_REQUEST_EXAMPLES,
} from '../schemas/yunqi.js';

const COMPONENT_EXAMPLES = {
  CalculateRequest: CALCULATE_REQUEST_EXAMPLES,
  HealthSuccessResponse: HEALTH_SUCCESS_EXAMPLES,
  ErrorResponse: ERROR_RESPONSE_EXAMPLES,
} as const;

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
    refResolver: {
      buildLocalReference(json, _baseUri, _fragment, index) {
        return typeof json.$id === 'string' ? json.$id : `def-${index}`;
      },
    },
    transformObject(documentObject) {
      if (!('openapiObject' in documentObject)) {
        return documentObject.swaggerObject;
      }

      const { openapiObject } = documentObject;
      const schemas = openapiObject.components?.schemas;
      if (!schemas) return openapiObject;

      for (const [name, examples] of Object.entries(COMPONENT_EXAMPLES)) {
        const schema = schemas[name] as
          | Record<string, unknown>
          | undefined;
        if (!schema) continue;

        schema.examples = examples;
        delete schema.example;
      }

      return openapiObject;
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
