import {
  Type,
  type FastifyPluginAsyncTypebox,
} from '@fastify/type-provider-typebox';

export const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        operationId: 'getHealth',
        summary: 'Get service health',
        tags: ['system'],
        response: {
          200: Type.Ref('HealthSuccessResponse'),
          500: Type.Ref('ErrorResponse'),
        },
      },
    },
    async () => ({
      code: 'SUCCESS',
      message: '',
      data: {
        status: 'ok',
        apiVersion: 'v1',
      },
    }),
  );
};
