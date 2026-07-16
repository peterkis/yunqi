import type { FastifyError, FastifyInstance } from 'fastify';
import type { ErrorResponse } from '../schemas/common.js';

export function installErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.validation !== undefined) {
      const issues = error.validation.map((issue) => ({
        instancePath: issue.instancePath,
        keyword: issue.keyword,
        message: issue.message ?? '',
      }));
      const body: ErrorResponse = {
        code: 'INVALID_ARGUMENT',
        message: '请求参数无效',
        details: { issues },
      };
      return reply.status(400).send(body);
    }

    if (error instanceof RangeError) {
      const body: ErrorResponse = {
        code: 'INVALID_ARGUMENT',
        message: error.message,
        details: {},
      };
      return reply.status(400).send(body);
    }

    request.log.error({ err: error }, 'Unhandled service error');
    const body: ErrorResponse = {
      code: 'INTERNAL_ERROR',
      message: '服务内部错误',
      details: {},
    };
    return reply.status(500).send(body);
  });
}
