import { Type, type Static } from '@fastify/type-provider-typebox';

const Closed = { additionalProperties: false } as const;
const Sex = Type.Union([Type.Literal('male'), Type.Literal('female')]);
export const ConstitutionQuestionnaireDtoSchema = Type.Object({
  id: Type.Literal('GBT46939-2025'), version: Type.String(), title: Type.String(), standard: Type.String(),
  sourceUrl: Type.String(), sourceNote: Type.String(), instructions: Type.Array(Type.String()),
  questions: Type.Array(Type.Object({
    id: Type.String(), text: Type.String(),
    sex: Type.Union([Type.Literal('all'), Type.Literal('male'), Type.Literal('female')]),
  }, Closed)),
  scales: Type.Array(Type.Object({
    id: Type.String(), name: Type.String(), items: Type.Array(Type.Object({
      questionId: Type.String(), reverse: Type.Boolean(),
    }, Closed)),
  }, Closed)),
  options: Type.Array(Type.Object({ value: Type.Integer({ minimum: 1, maximum: 5 }), label: Type.String() }, Closed)),
}, { ...Closed, $id: 'ConstitutionQuestionnaireDto' });

export const ConstitutionRequestSchema = Type.Object({
  questionnaireId: Type.String({ const: 'GBT46939-2025' }), sex: Sex,
  answers: Type.Record(Type.String({ pattern: '^[a-z][a-z0-9_-]{0,31}$' }),
    Type.Integer({ minimum: 1, maximum: 5 }), { maxProperties: 27 }),
}, { ...Closed, $id: 'ConstitutionRequest' });

export const ConstitutionAssessmentDtoSchema = Type.Object({
  questionnaireId: Type.String(), version: Type.String(), sex: Sex,
  results: Type.Array(Type.Object({
    id: Type.String(), name: Type.String(), itemCount: Type.Integer(), rawScore: Type.Integer(),
    score: Type.Number({ minimum: 0, maximum: 100 }),
    status: Type.Union([Type.Literal('yes'), Type.Literal('tendency'), Type.Literal('basically'), Type.Literal('no')]),
    label: Type.String(),
  }, Closed), { minItems: 9, maxItems: 9 }),
  matchedTypes: Type.Array(Type.String()), tendencyTypes: Type.Array(Type.String()),
  summary: Type.String(), boundaryNote: Type.String(),
}, { ...Closed, $id: 'ConstitutionAssessmentDto' });

export const QuestionnaireSuccessSchema = Type.Object({
  code: Type.Literal('SUCCESS'), message: Type.Literal(''), data: Type.Ref('ConstitutionQuestionnaireDto'),
}, { ...Closed, $id: 'QuestionnaireSuccessResponse' });
export const AssessmentSuccessSchema = Type.Object({
  code: Type.Literal('SUCCESS'), message: Type.Literal(''), data: Type.Ref('ConstitutionAssessmentDto'),
}, { ...Closed, $id: 'AssessmentSuccessResponse' });

export type ConstitutionRequest = Static<typeof ConstitutionRequestSchema>;
export const constitutionSchemas = [ConstitutionQuestionnaireDtoSchema,
  ConstitutionRequestSchema, ConstitutionAssessmentDtoSchema,
  QuestionnaireSuccessSchema, AssessmentSuccessSchema] as const;
