import { Type, type Static } from '@fastify/type-provider-typebox';
import { HostGuestRelationDtoSchema, YunQiCalculationDtoSchema } from './yunqi.js';

const Closed = { additionalProperties: false } as const;
export const LearningRelationDtoSchema = Type.Object({
  title: Type.String(), label: Type.String(), relation: Type.String(),
  explanation: Type.String(), sourceIds: Type.Array(Type.String()),
  sources: Type.Array(Type.Object({ id: Type.String(), title: Type.String(), url: Type.String() }, Closed)),
}, { ...Closed, $id: 'LearningRelationDto' });

export const ClassicalPassageDtoSchema = Type.Object({
  id: Type.String(), work: Type.String(), chapter: Type.String(), section: Type.String(),
  scope: Type.String(), quote: Type.String(), explanation: Type.String(), sourceUrl: Type.String(),
}, { ...Closed, $id: 'ClassicalPassageDto' });

export const MovementRelationDtoSchema = Type.Object({
  elementRelation: HostGuestRelationDtoSchema.properties.elementRelation,
  direction: HostGuestRelationDtoSchema.properties.direction,
  traditionalLabel: HostGuestRelationDtoSchema.properties.traditionalLabel,
}, { ...Closed, $id: 'MovementRelationDto' });

export const MovementStepDtoSchema = Type.Object({
  index: Type.Integer({ minimum: 1, maximum: 5 }), name: Type.String(),
  start: Type.Ref('YunQiTimeDto'), end: Type.Ref('YunQiTimeDto'),
  startLabel: Type.String(), endLabel: Type.String(),
  host: Type.Ref('SuiYunDto'), guest: Type.Ref('SuiYunDto'),
  relation: Type.Ref('MovementRelationDto'),
  boundaryMethod: Type.String(), explanation: Type.String(),
}, { ...Closed, $id: 'MovementStepDto' });

export const YunQiLearningDtoSchema = Type.Object({
  ruleVersion: Type.String(), facts: Type.Ref('YunQiCalculationDto'),
  annualRelation: Type.Ref('LearningRelationDto'), currentQi: Type.Ref('LearningRelationDto'),
  currentMovement: Type.Ref('MovementStepDto'),
  currentMovementProgress: Type.Ref('StageProgressDto'),
  movements: Type.Array(Type.Ref('MovementStepDto'), { minItems: 5, maxItems: 5 }),
  annualPassages: Type.Array(Type.Ref('ClassicalPassageDto')),
  currentPassages: Type.Array(Type.Ref('ClassicalPassageDto')),
  notes: Type.Array(Type.String()),
}, { ...Closed, $id: 'YunQiLearningDto' });

export const BirthRequestSchema = Type.Object({
  birthDate: Type.String({ pattern: '^\\d{4}-\\d{2}-\\d{2}$' }),
  birthTime: Type.Optional(Type.String({ pattern: '^\\d{2}:\\d{2}:\\d{2}$' })),
}, { ...Closed, $id: 'BirthRequest' });

export const BirthComparisonDtoSchema = Type.Object({
  ruleVersion: Type.String(), birthPrecision: Type.Union([Type.Literal('date'), Type.Literal('time')]),
  ambiguous: Type.Boolean(), message: Type.String(), current: Type.Ref('YunQiLearningDto'),
  candidates: Type.Array(Type.Object({
    label: Type.String(), from: Type.Ref('YunQiTimeDto'), until: Type.Ref('YunQiTimeDto'),
    learning: Type.Ref('YunQiLearningDto'), comparisons: Type.Array(Type.Ref('LearningRelationDto')),
  }, Closed), { minItems: 1, maxItems: 4 }),
}, { ...Closed, $id: 'BirthComparisonDto' });

export const LearningSuccessSchema = Type.Object({
  code: Type.Literal('SUCCESS'), message: Type.Literal(''), data: Type.Ref('YunQiLearningDto'),
}, { ...Closed, $id: 'LearningSuccessResponse' });
export const BirthSuccessSchema = Type.Object({
  code: Type.Literal('SUCCESS'), message: Type.Literal(''), data: Type.Ref('BirthComparisonDto'),
}, { ...Closed, $id: 'BirthSuccessResponse' });

export type BirthRequest = Static<typeof BirthRequestSchema>;
// Reuse the existing context, so references never become handwritten DTO copies.
type Context = import('./yunqi.js').YunQiSchemaContext & {
  YunQiCalculationDto: typeof YunQiCalculationDtoSchema;
  YunQiLearningDto: typeof YunQiLearningDtoSchema;
  MovementStepDto: typeof MovementStepDtoSchema;
  MovementRelationDto: typeof MovementRelationDtoSchema;
  LearningRelationDto: typeof LearningRelationDtoSchema;
  ClassicalPassageDto: typeof ClassicalPassageDtoSchema;
};
export type YunQiLearningDto = Static<typeof YunQiLearningDtoSchema, Context>;
export type BirthComparisonDto = Static<typeof BirthComparisonDtoSchema, Context>;
export type LearningRelationDto = Static<typeof LearningRelationDtoSchema>;
export type MovementStepDto = Static<typeof MovementStepDtoSchema, Context>;

export const learningSchemas = [LearningRelationDtoSchema, ClassicalPassageDtoSchema, MovementRelationDtoSchema,
  MovementStepDtoSchema, YunQiLearningDtoSchema, BirthRequestSchema,
  BirthComparisonDtoSchema, LearningSuccessSchema, BirthSuccessSchema] as const;
