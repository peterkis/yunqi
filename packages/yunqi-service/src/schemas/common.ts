import {
  Static,
  Type,
  type TSchema,
} from '@fastify/type-provider-typebox';

export const HealthDataSchema = Type.Object(
  {
    status: Type.Literal('ok'),
    apiVersion: Type.Literal('v1'),
  },
  { $id: 'HealthData', additionalProperties: false },
);

export const HealthSuccessSchema = Type.Object(
  {
    code: Type.Literal('SUCCESS'),
    message: Type.Literal(''),
    data: Type.Ref('HealthData'),
  },
  {
    $id: 'HealthSuccessResponse',
    additionalProperties: false,
    examples: [
      {
        code: 'SUCCESS',
        message: '',
        data: { status: 'ok', apiVersion: 'v1' },
      },
    ],
  },
);

export const ErrorResponseSchema = Type.Object(
  {
    code: Type.Union([
      Type.Literal('INVALID_ARGUMENT'),
      Type.Literal('CALENDAR_PROVIDER_UNAVAILABLE'),
      Type.Literal('INTERNAL_ERROR'),
    ]),
    message: Type.String(),
    details: Type.Record(Type.String(), Type.Unknown()),
  },
  {
    $id: 'ErrorResponse',
    additionalProperties: false,
    examples: [
      {
        code: 'INVALID_ARGUMENT',
        message: '请求参数无效',
        details: {},
      },
      {
        code: 'CALENDAR_PROVIDER_UNAVAILABLE',
        message: '历法服务暂时不可用',
        details: {},
      },
      {
        code: 'INTERNAL_ERROR',
        message: '服务内部错误',
        details: {},
      },
    ],
  },
);

type CommonSchemaContext = {
  HealthData: typeof HealthDataSchema;
};

export type HealthSuccessResponse = Static<
  typeof HealthSuccessSchema,
  CommonSchemaContext
>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export function routeResponses<T extends TSchema>(successSchema: T) {
  const successSchemaId = (
    successSchema as T & { readonly $id: string }
  ).$id;

  return {
    200: Type.Ref(successSchemaId),
    400: Type.Ref('ErrorResponse'),
    503: Type.Ref('ErrorResponse'),
    500: Type.Ref('ErrorResponse'),
  } as const;
}
