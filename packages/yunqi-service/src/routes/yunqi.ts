import {
  Type,
  type FastifyPluginAsyncTypebox,
  type Static,
} from '@fastify/type-provider-typebox';
import type { CalendarProvider } from '@yunqi/domain';
import { routeResponses } from '../schemas/common.js';
import {
  CalculationSuccessSchema,
  YearParamsSchema,
  YearSuccessSchema,
  type CalculateRequest,
} from '../schemas/yunqi.js';
import { parseApiDateTime } from '../services/date-time.js';
import {
  calculateAnnualDto,
  calculateAtDto,
  currentInstant,
} from '../services/yunqi-service.js';

type YearParams = Static<typeof YearParamsSchema>;

export const yunqiRoutes: FastifyPluginAsyncTypebox<{
  provider: CalendarProvider;
  now: () => number;
}> = async (app, options) => {
  app.get<{ Params: YearParams }>(
    '/year/:year',
    {
      schema: {
        operationId: 'getYunQiYear',
        summary: 'Get a YunQi year',
        tags: ['yunqi'],
        params: Type.Ref('YearParams'),
        response: routeResponses(YearSuccessSchema),
      },
    },
    async (request) => ({
      code: 'SUCCESS',
      message: '',
      data: calculateAnnualDto(request.params.year, options.provider),
    }),
  );

  app.get(
    '/current',
    {
      schema: {
        operationId: 'getCurrentYunQi',
        summary: 'Get YunQi facts for the current instant',
        tags: ['yunqi'],
        response: routeResponses(CalculationSuccessSchema),
      },
    },
    async () => ({
      code: 'SUCCESS',
      message: '',
      data: calculateAtDto(
        currentInstant(options.now),
        options.provider,
      ),
    }),
  );

  app.post<{ Body: CalculateRequest }>(
    '/calculate',
    {
      schema: {
        operationId: 'calculateYunQi',
        summary: 'Calculate YunQi facts for a date-time',
        tags: ['yunqi'],
        body: Type.Ref('CalculateRequest'),
        response: routeResponses(CalculationSuccessSchema),
      },
    },
    async (request) => ({
      code: 'SUCCESS',
      message: '',
      data: calculateAtDto(
        parseApiDateTime(request.body.dateTime),
        options.provider,
      ),
    }),
  );
};
