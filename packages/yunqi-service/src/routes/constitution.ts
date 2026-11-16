import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { evaluateConstitution, getConstitutionQuestionnaire } from '@yunqi/domain';
import { routeResponses } from '../schemas/common.js';
import { AssessmentSuccessSchema, QuestionnaireSuccessSchema, type ConstitutionRequest } from '../schemas/constitution.js';
import { InvalidArgumentError } from '../services/invalid-argument-error.js';

export const constitutionRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.addHook('onRequest', async (_request, reply) => { reply.header('Cache-Control', 'no-store'); });
  app.get('/questionnaire', { schema: { operationId: 'getConstitutionQuestionnaire', tags: ['constitution'],
    summary: 'Versioned GB/T 46939-2025 questionnaire', response: routeResponses(QuestionnaireSuccessSchema) } },
  async () => {
    const questionnaire = getConstitutionQuestionnaire();
    return { code: 'SUCCESS', message: '', data: { ...questionnaire, instructions: [questionnaire.instructions] } };
  });
  app.post<{ Body: ConstitutionRequest }>('/assess', {
    // The existing service permits scalar path coercion; answers must stay strict JSON numbers.
    preValidation: async (request) => {
      const answers = request.body?.answers;
      if (answers !== null && typeof answers === 'object'
        && Object.values(answers).some((value) => typeof value !== 'number')) {
        throw new InvalidArgumentError('量表分值必须为整数');
      }
    },
    schema: { operationId: 'assessConstitution', tags: ['constitution'],
      summary: 'Score a complete questionnaire without retaining responses', body: Type.Ref('ConstitutionRequest'),
      response: routeResponses(AssessmentSuccessSchema) },
  }, async (request) => {
    try { return { code: 'SUCCESS', message: '', data: evaluateConstitution(request.body) }; }
    catch (error) {
      if (error instanceof RangeError) throw new InvalidArgumentError('量表提交无效，请检查版本、性别及完整作答', { cause: error });
      throw error;
    }
  });
};
