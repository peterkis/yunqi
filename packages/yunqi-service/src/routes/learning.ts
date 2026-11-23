import {
  Type,
  type FastifyPluginAsyncTypebox,
} from '@fastify/type-provider-typebox';
import type { CalendarProvider } from '@yunqi/domain';
import { routeResponses } from '../schemas/common.js';
import {
  BirthSuccessSchema, BirthDatePreviewSuccessSchema, BirthYearSuccessSchema,
  type BirthDatePreviewRequest, type BirthYearRequest,
  LearningSuccessSchema,
  type BirthRequest,
} from '../schemas/learning.js';
import type { CalculateRequest } from '../schemas/yunqi.js';
import {
  calculateBirthComparison, calculateBirthYear, previewBirthDate,
  calculateLearningDto,
  calculateLearningRequestDto,
} from '../services/learning-service.js';
import { currentCalendarTime } from '../services/yunqi-service.js';

export const learningRoutes: FastifyPluginAsyncTypebox<{
  provider: CalendarProvider;
  now: () => number;
}> = async (app, options) => {
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
  });

  app.get(
    '/current',
    {
      schema: {
        operationId: 'getLearningCurrent',
        tags: ['yunqi'],
        summary: 'Current YunQi facts with sourced learning notes',
        response: routeResponses(LearningSuccessSchema),
      },
    },
    async () => ({
      code: 'SUCCESS',
      message: '',
      data: calculateLearningDto(
        currentCalendarTime(options.now),
        options.provider,
      ),
    }),
  );

  app.post<{ Body: CalculateRequest }>(
    '/calculate',
    {
      schema: {
        operationId: 'calculateLearning',
        tags: ['yunqi'],
        summary: 'YunQi learning notes for a selected fixed-Beijing time',
        body: Type.Ref('CalculateRequest'),
        response: routeResponses(LearningSuccessSchema),
      },
    },
    async (request) => ({
      code: 'SUCCESS',
      message: '',
      data: calculateLearningRequestDto(request.body, options.provider),
    }),
  );

  app.post<{ Body: BirthDatePreviewRequest }>(
    '/birth-date-preview', { schema: { operationId: 'previewBirthDate', tags: ['yunqi'], summary: 'Resolve a birthday within a civil year',
      body: Type.Ref('BirthDatePreviewRequest'), response: routeResponses(BirthDatePreviewSuccessSchema) } },
    async ({ body }) => ({ code: 'SUCCESS', message: '', data: previewBirthDate(body, currentCalendarTime(options.now), options.provider) }),
  );
  app.post<{ Body: BirthYearRequest }>(
    '/birth-year-comparison', { schema: { operationId: 'compareBirthYear', tags: ['yunqi'], summary: 'Compare possible annual structures for a civil birth year',
      body: Type.Ref('BirthYearRequest'), response: routeResponses(BirthYearSuccessSchema) } },
    async ({ body }) => ({ code: 'SUCCESS', message: '', data: calculateBirthYear(body.year, currentCalendarTime(options.now), options.provider) }),
  );
  app.post<{ Body: BirthRequest }>(
    '/birth-comparison',
    {
      schema: {
        operationId: 'compareBirth',
        tags: ['yunqi'],
        summary: 'Compare birth-period facts and current facts without disease inference or storage',
        body: Type.Ref('BirthRequest'),
        response: routeResponses(BirthSuccessSchema),
      },
    },
    async (request) => ({
      code: 'SUCCESS',
      message: '',
      data: calculateBirthComparison(
        request.body,
        currentCalendarTime(options.now),
        options.provider,
      ),
    }),
  );
};
