import { Static, Type } from '@fastify/type-provider-typebox';

const HeavenlyStemSchema = Type.Union([
  Type.Literal('甲'),
  Type.Literal('乙'),
  Type.Literal('丙'),
  Type.Literal('丁'),
  Type.Literal('戊'),
  Type.Literal('己'),
  Type.Literal('庚'),
  Type.Literal('辛'),
  Type.Literal('壬'),
  Type.Literal('癸'),
]);
const EarthlyBranchSchema = Type.Union([
  Type.Literal('子'),
  Type.Literal('丑'),
  Type.Literal('寅'),
  Type.Literal('卯'),
  Type.Literal('辰'),
  Type.Literal('巳'),
  Type.Literal('午'),
  Type.Literal('未'),
  Type.Literal('申'),
  Type.Literal('酉'),
  Type.Literal('戌'),
  Type.Literal('亥'),
]);
const ElementSchema = Type.Union([
  Type.Literal('木'),
  Type.Literal('火'),
  Type.Literal('土'),
  Type.Literal('金'),
  Type.Literal('水'),
]);
const YunStateSchema = Type.Union([
  Type.Literal('太过'),
  Type.Literal('不及'),
]);
const ToneSchema = Type.Union([
  Type.Literal('太角'),
  Type.Literal('少角'),
  Type.Literal('太徵'),
  Type.Literal('少徵'),
  Type.Literal('太宫'),
  Type.Literal('少宫'),
  Type.Literal('太商'),
  Type.Literal('少商'),
  Type.Literal('太羽'),
  Type.Literal('少羽'),
]);
const QiSchema = Type.Union([
  Type.Literal('厥阴风木'),
  Type.Literal('少阴君火'),
  Type.Literal('太阴湿土'),
  Type.Literal('少阳相火'),
  Type.Literal('阳明燥金'),
  Type.Literal('太阳寒水'),
]);
const StepNameSchema = Type.Union([
  Type.Literal('初之气'),
  Type.Literal('二之气'),
  Type.Literal('三之气'),
  Type.Literal('四之气'),
  Type.Literal('五之气'),
  Type.Literal('终之气'),
]);

export const YunQiTimeDtoSchema = Type.Object(
  {
    localTime: Type.String({
      pattern:
        '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?\\+08:00$',
    }),
    epochMilliseconds: Type.Integer({
      minimum: Number.MIN_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    offset: Type.Literal('+08:00'),
    calendarTimeStandard: Type.Literal('BeijingStandardTime+08:00'),
  },
  { $id: 'YunQiTimeDto', additionalProperties: false },
);

export const HostGuestRelationDtoSchema = Type.Object(
  {
    qiRelation: Type.Union([
      Type.Literal('SAME_QI'),
      Type.Literal('DIFFERENT_QI'),
    ]),
    elementRelation: Type.Union([
      Type.Literal('SAME_ELEMENT'),
      Type.Literal('DIFFERENT_ELEMENT'),
    ]),
    direction: Type.Union([
      Type.Literal('NONE'),
      Type.Literal('HOST_GENERATES_GUEST'),
      Type.Literal('GUEST_GENERATES_HOST'),
      Type.Literal('HOST_CONTROLS_GUEST'),
      Type.Literal('GUEST_CONTROLS_HOST'),
    ]),
    traditionalLabel: Type.String(),
  },
  { $id: 'HostGuestRelationDto', additionalProperties: false },
);

export const SixQiStepDtoSchema = Type.Object(
  {
    index: Type.Integer({ minimum: 1, maximum: 6 }),
    name: StepNameSchema,
    start: Type.Ref('YunQiTimeDto'),
    end: Type.Ref('YunQiTimeDto'),
    hostQi: QiSchema,
    guestQi: QiSchema,
    relation: Type.Ref('HostGuestRelationDto'),
  },
  { $id: 'SixQiStepDto', additionalProperties: false },
);

export const StemBranchDtoSchema = Type.Object(
  {
    ganzhi: Type.String({ minLength: 2, maxLength: 2 }),
    stem: HeavenlyStemSchema,
    branch: EarthlyBranchSchema,
  },
  { $id: 'StemBranchDto', additionalProperties: false },
);

export const SuiYunDtoSchema = Type.Object(
  {
    element: ElementSchema,
    state: YunStateSchema,
    tone: ToneSchema,
  },
  { $id: 'SuiYunDto', additionalProperties: false },
);

export const IntervalDtoSchema = Type.Object(
  {
    start: Type.Ref('YunQiTimeDto'),
    end: Type.Ref('YunQiTimeDto'),
  },
  { $id: 'YunQiIntervalDto', additionalProperties: false },
);

export const SixQiDtoSchema = Type.Object(
  {
    sitian: QiSchema,
    zaiquan: QiSchema,
    steps: Type.Array(Type.Ref('SixQiStepDto'), {
      minItems: 6,
      maxItems: 6,
    }),
  },
  { $id: 'SixQiDto', additionalProperties: false },
);

export const YunQiYearDtoSchema = Type.Object(
  {
    ruleVersion: Type.String({ minLength: 1 }),
    year: Type.Integer({ minimum: 1901, maximum: 2099 }),
    stemBranch: Type.Ref('StemBranchDto'),
    interval: Type.Ref('YunQiIntervalDto'),
    suiYun: Type.Ref('SuiYunDto'),
    sixQi: Type.Ref('SixQiDto'),
    explanations: Type.Array(Type.String()),
  },
  { $id: 'YunQiYearDto', additionalProperties: false },
);

export const YunQiCalculationDtoSchema = Type.Object(
  {
    ...YunQiYearDtoSchema.properties,
    input: Type.Ref('YunQiTimeDto'),
    currentStep: Type.Ref('SixQiStepDto'),
  },
  { $id: 'YunQiCalculationDto', additionalProperties: false },
);

export const YearParamsSchema = Type.Object(
  { year: Type.Integer({ minimum: 1901, maximum: 2099 }) },
  { $id: 'YearParams', additionalProperties: false },
);

export const CALCULATE_REQUEST_EXAMPLES = [
  { dateTime: '2024-05-20T21:00:00' },
  { dateTime: '2024-05-20T13:00:00Z' },
  { dateTime: '2024-05-20T21:00:00+08:00' },
] as const;

export const CalculateRequestSchema = Type.Object(
  {
    dateTime: Type.String({
      pattern:
        '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?(?:Z|\\+08:00)?$',
      examples: CALCULATE_REQUEST_EXAMPLES.map(
        (example) => example.dateTime,
      ),
    }),
  },
  {
    $id: 'CalculateRequest',
    additionalProperties: false,
    examples: CALCULATE_REQUEST_EXAMPLES,
  },
);

export const YearSuccessSchema = Type.Object(
  {
    code: Type.Literal('SUCCESS'),
    message: Type.Literal(''),
    data: Type.Ref('YunQiYearDto'),
  },
  { $id: 'YearSuccessResponse', additionalProperties: false },
);

export const CalculationSuccessSchema = Type.Object(
  {
    code: Type.Literal('SUCCESS'),
    message: Type.Literal(''),
    data: Type.Ref('YunQiCalculationDto'),
  },
  { $id: 'CalculationSuccessResponse', additionalProperties: false },
);

type YunQiSchemaContext = {
  YunQiTimeDto: typeof YunQiTimeDtoSchema;
  HostGuestRelationDto: typeof HostGuestRelationDtoSchema;
  SixQiStepDto: typeof SixQiStepDtoSchema;
  StemBranchDto: typeof StemBranchDtoSchema;
  SuiYunDto: typeof SuiYunDtoSchema;
  YunQiIntervalDto: typeof IntervalDtoSchema;
  SixQiDto: typeof SixQiDtoSchema;
  YunQiYearDto: typeof YunQiYearDtoSchema;
  YunQiCalculationDto: typeof YunQiCalculationDtoSchema;
};

export type YunQiTimeDto = Static<
  typeof YunQiTimeDtoSchema,
  YunQiSchemaContext
>;
export type HostGuestRelationDto = Static<
  typeof HostGuestRelationDtoSchema,
  YunQiSchemaContext
>;
export type SixQiStepDto = Static<
  typeof SixQiStepDtoSchema,
  YunQiSchemaContext
>;
export type YunQiYearDto = Static<
  typeof YunQiYearDtoSchema,
  YunQiSchemaContext
>;
export type YunQiCalculationDto = Static<
  typeof YunQiCalculationDtoSchema,
  YunQiSchemaContext
>;
export type CalculateRequest = Static<typeof CalculateRequestSchema>;
