import type { FastifyError, FastifyInstance } from 'fastify';
import type { ErrorResponse } from '../schemas/common.js';
import { InvalidArgumentError } from '../services/invalid-argument-error.js';
import { CalendarProviderUnavailableError } from '../services/provider-boundary.js';

function isFastifyRequestError(error: FastifyError): boolean {
  return (
    typeof error.code === 'string' &&
    error.code.startsWith('FST_ERR_') &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

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

    if (error instanceof CalendarProviderUnavailableError) {
      request.log.error({ err: error }, 'Calendar provider unavailable');
      const body: ErrorResponse = {
        code: 'CALENDAR_PROVIDER_UNAVAILABLE',
        message: '历法服务暂时不可用',
        details: {},
      };
      return reply.status(503).send(body);
    }

    if (error instanceof InvalidArgumentError) {
      const body: ErrorResponse = {
        code: 'INVALID_ARGUMENT',
        message: error.message,
        details: {},
      };
      return reply.status(400).send(body);
    }

    if (isFastifyRequestError(error)) {
      const body: ErrorResponse = {
        code: 'INVALID_ARGUMENT',
        message: '请求参数无效',
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
