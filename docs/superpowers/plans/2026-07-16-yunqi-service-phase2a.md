# YunQi Service Phase 2-A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Build the independent Fastify 5 YunQi service package, OpenAPI 3.1 and JSON Schema contract, explicit Domain-to-API mapping, and browser-safe React workbench client contract defined by the approved Phase 2-A design.

**Architecture:** TypeBox schemas are the HTTP contract source and are attached to Fastify routes for validation and serialization. Fastify generates OpenAPI 3.1, checked-in generated types feed a transport-neutral browser client, and a mapper prevents Domain objects from crossing the HTTP boundary. Service time parsing converts strict hospital-local Asia/Shanghai or RFC 3339 input into an absolute YunQiInstant before any Domain call.

**Tech Stack:** Node.js 22, pnpm 10.32.1, TypeScript 7.0.2 strict ESM, Fastify 5.10.0, @fastify/swagger 9.8.1, @fastify/swagger-ui 6.1.0, @fastify/type-provider-typebox 6.1.0, @js-temporal/polyfill 0.5.1, Vitest 4.1.10, Ajv 8.20.0, OpenAPI TypeScript 7.13.0, Redocly CLI 2.39.0, YAML 2.9.0.

## Global Constraints

- Do not change any core calculation file under packages/yunqi-domain.
- Domain remains framework-free and receives only an already normalized YunQiInstant plus an injected CalendarProvider.
- The public year range is the inclusive integer range 1901-2099.
- Hospital-local input uses strict YYYY-MM-DDTHH:mm:ss with optional 1-3 fractional digits and the IANA zone Asia/Shanghai.
- RFC 3339 input must carry Z or a numeric HH:mm offset; ambiguous or nonexistent local wall times are rejected.
- Every success response uses code SUCCESS, an empty message, and data; every error uses code, message, and details.
- Provider exceptions map to HTTP 503, input or Domain RangeError maps to HTTP 400, and unexpected errors map to HTTP 500.
- API output contains only time facts, rule mappings, calendar results, and existing safe explanations; never diagnosis, disease judgment, treatment advice, or individual prediction.
- Controllers return only mapper-created DTOs and never a Domain result object.
- OpenAPI is exactly 3.1.0 and checked-in generated YAML and TypeScript must be deterministic and drift-checked.
- Preserve the user's existing untracked AGENTS.md and codex/prompts files; stage only files named by each task.

## File map

- packages/yunqi-service/src/services/date-time.ts: strict local/RFC 3339 input normalization.
- packages/yunqi-service/src/services/provider-boundary.ts: distinguish provider failures from Domain failures.
- packages/yunqi-service/src/services/yunqi-service.ts: supported-range checks and Domain orchestration.
- packages/yunqi-service/src/schemas/common.ts: response envelopes and health schemas.
- packages/yunqi-service/src/schemas/yunqi.ts: complete YunQi request/DTO schemas and server-side inferred types.
- packages/yunqi-service/src/schemas/index.ts: schema registration list.
- packages/yunqi-service/src/mappers/yunqi-mapper.ts: fresh Domain-to-DTO conversion.
- packages/yunqi-service/src/plugins/openapi.ts: OpenAPI and Swagger UI registration.
- packages/yunqi-service/src/plugins/error-handler.ts: safe HTTP error classification.
- packages/yunqi-service/src/routes/health.ts: health route.
- packages/yunqi-service/src/routes/yunqi.ts: year, current, and calculate routes.
- packages/yunqi-service/src/app.ts: injectable Fastify construction.
- packages/yunqi-service/src/server-config.ts: validated HOST and PORT configuration.
- packages/yunqi-service/src/server.ts: real provider, clock, and process listening.
- packages/yunqi-service/src/contracts/generated-client.ts: generated OpenAPI path/component types.
- packages/yunqi-service/src/contracts/yunqi-types.ts: ergonomic browser aliases.
- packages/yunqi-service/src/contracts/yunqi-api.ts: Fetch/Axios-compatible typed client and query options.
- packages/yunqi-service/scripts/generate-openapi.mjs: deterministic YAML writer.
- packages/yunqi-service/scripts/check-generated.mjs: non-mutating generated-artifact drift gate.
- packages/yunqi-service/tests: API, boundary, mapper, schema, OpenAPI, client, safety, and startup evidence.

---

### Task 1: Package foundation and date-time normalization

**Files:**
- Modify: pnpm-workspace.yaml
- Create: packages/yunqi-service/package.json
- Create: packages/yunqi-service/tsconfig.json
- Create: packages/yunqi-service/tsconfig.test.json
- Create: packages/yunqi-service/vitest.config.ts
- Create: packages/yunqi-service/src/index.ts
- Create: packages/yunqi-service/src/services/date-time.ts
- Create: packages/yunqi-service/tests/date-time.test.ts
- Modify: pnpm-lock.yaml

**Interfaces:**
- Produces: HOSPITAL_TIME_ZONE = 'Asia/Shanghai'
- Produces: parseApiDateTime(input: string): YunQiInstant
- Produces: package @yunqi/service with ESM build/test/typecheck scripts

- [ ] **Step 1: Register and scaffold the package**

Add packages/yunqi-service to pnpm-workspace.yaml. Create package.json with the exact dependency set below, then run pnpm install from the repository root so pnpm-lock.yaml records the workspace and versions.

~~~yaml
packages:
  - packages/yunqi-domain
  - packages/calendar-adapters/*
  - packages/yunqi-service
~~~

~~~json
{
  "name": "@yunqi/service",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./contracts": {
      "types": "./dist/contracts/index.d.ts",
      "import": "./dist/contracts/index.js"
    }
  },
  "files": ["dist", "openapi"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test:typecheck": "tsc -p tsconfig.test.json",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@fastify/swagger": "9.8.1",
    "@fastify/swagger-ui": "6.1.0",
    "@fastify/type-provider-typebox": "6.1.0",
    "@js-temporal/polyfill": "0.5.1",
    "@yunqi/calendar-adapter-tyme4ts": "workspace:*",
    "@yunqi/domain": "workspace:*",
    "fastify": "5.10.0"
  },
  "devDependencies": {
    "@redocly/cli": "2.39.0",
    "@types/node": "22.20.1",
    "@vitest/coverage-v8": "4.1.10",
    "ajv": "8.20.0",
    "openapi-typescript": "7.13.0",
    "typescript": "7.0.2",
    "vitest": "4.1.10",
    "yaml": "2.9.0"
  }
}
~~~

Create tsconfig.json exactly as follows:

~~~json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "coverage", "node_modules", "tests"]
}
~~~

Create tsconfig.test.json:

~~~json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"],
  "exclude": ["dist", "coverage", "node_modules"]
}
~~~

Create vitest.config.ts:

~~~ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/server.ts',
        'src/contracts/generated-client.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
~~~

Run: pnpm install

Expected: lockfile updates successfully and pnpm --filter @yunqi/service exec node --version prints v22.14.0 or another supported Node 22 release.

- [ ] **Step 2: Write the failing date-time tests**

Create tests/date-time.test.ts with explicit equivalence and rejection cases:

~~~ts
import { describe, expect, it } from 'vitest';
import { parseApiDateTime } from '../src/services/date-time.js';

describe('parseApiDateTime', () => {
  it.each([
    '2024-05-20T21:00:00',
    '2024-05-20T13:00:00Z',
    '2024-05-20T21:00:00+08:00',
  ])('normalizes %s to the same absolute instant', (value) => {
    expect(parseApiDateTime(value)).toEqual({
      epochMilliseconds: 1_716_210_000_000,
      timezone: 'Asia/Shanghai',
    });
  });

  it('preserves supported millisecond precision', () => {
    expect(parseApiDateTime('2024-05-20T21:00:00.123').epochMilliseconds)
      .toBe(1_716_210_000_123);
  });

  it.each([
    '2024-05-20 21:00:00',
    '2024-05-20T21:00',
    '2024-02-30T21:00:00',
    '2024-05-20T21:00:00.1234',
    'not-a-date',
  ])('rejects malformed input %s', (value) => {
    expect(() => parseApiDateTime(value)).toThrow(RangeError);
  });

  it.each([
    '1991-04-14T02:30:00',
    '1991-09-15T01:30:00',
  ])('rejects a nonexistent or ambiguous Shanghai wall time %s', (value) => {
    expect(() => parseApiDateTime(value)).toThrow(RangeError);
  });
});
~~~

- [ ] **Step 3: Run the focused test and confirm RED**

Run: pnpm --filter @yunqi/domain build && pnpm --filter @yunqi/service test -- tests/date-time.test.ts

Expected: FAIL because src/services/date-time.ts does not exist.

- [ ] **Step 4: Implement strict service-boundary parsing**

Create src/services/date-time.ts:

~~~ts
import { Temporal } from '@js-temporal/polyfill';
import { createYunQiInstant, type YunQiInstant } from '@yunqi/domain';

export const HOSPITAL_TIME_ZONE = 'Asia/Shanghai' as const;

const LOCAL_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
const RFC3339_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export function parseApiDateTime(input: string): YunQiInstant {
  try {
    if (LOCAL_DATE_TIME.test(input)) {
      const plain = Temporal.PlainDateTime.from(input, { overflow: 'reject' });
      const zoned = plain.toZonedDateTime(HOSPITAL_TIME_ZONE, {
        disambiguation: 'reject',
      });
      return createYunQiInstant(zoned.epochMilliseconds);
    }

    if (RFC3339_DATE_TIME.test(input)) {
      return createYunQiInstant(Temporal.Instant.from(input).epochMilliseconds);
    }
  } catch {
    throw new RangeError(
      'dateTime 必须是 Asia/Shanghai 本地时间或带 Z/offset 的 RFC3339 时间',
    );
  }

  throw new RangeError(
    'dateTime 必须是 Asia/Shanghai 本地时间或带 Z/offset 的 RFC3339 时间',
  );
}
~~~

Create src/index.ts:

~~~ts
export {
  HOSPITAL_TIME_ZONE,
  parseApiDateTime,
} from './services/date-time.js';
~~~

- [ ] **Step 5: Verify GREEN and type safety**

Run:

~~~powershell
pnpm --filter @yunqi/domain build
pnpm --filter @yunqi/service test -- tests/date-time.test.ts
pnpm --filter @yunqi/service typecheck
pnpm --filter @yunqi/service test:typecheck
~~~

Expected: all tests and both typechecks pass.

- [ ] **Step 6: Commit the package foundation**

~~~powershell
git add pnpm-workspace.yaml pnpm-lock.yaml packages/yunqi-service/package.json packages/yunqi-service/tsconfig.json packages/yunqi-service/tsconfig.test.json packages/yunqi-service/vitest.config.ts packages/yunqi-service/src/index.ts packages/yunqi-service/src/services/date-time.ts packages/yunqi-service/tests/date-time.test.ts
git commit -m "feat(yunqi-service): normalize API date-time input"
~~~

### Task 2: Stable schemas and explicit Domain mappers

**Files:**
- Create: packages/yunqi-service/src/schemas/common.ts
- Create: packages/yunqi-service/src/schemas/yunqi.ts
- Create: packages/yunqi-service/src/schemas/index.ts
- Create: packages/yunqi-service/src/mappers/yunqi-mapper.ts
- Create: packages/yunqi-service/tests/helpers/fixed-calendar-provider.ts
- Create: packages/yunqi-service/tests/mapper.test.ts

**Interfaces:**
- Consumes: YunQiYearResult, YunQiResult, YunQiInstant, SixQiStep from @yunqi/domain
- Produces: HealthSuccessSchema, ErrorResponseSchema, YearParamsSchema, CalculateRequestSchema, YearSuccessSchema, CalculationSuccessSchema
- Produces: mapYearResult(result): YunQiYearDto
- Produces: mapCalculationResult(result): YunQiCalculationDto

- [ ] **Step 1: Add a deterministic service test provider**

Create tests/helpers/fixed-calendar-provider.ts using the deterministic test-only provider below. Keep the production adapter out of mapper unit tests.

Core fixture contract:

~~~ts
import {
  createYunQiInstant,
  type CalendarProvider,
  type SolarTerm,
} from '@yunqi/domain';

const TERM_FIELDS = {
  大寒: [1, 20, 22, 7, 22],
  春分: [3, 20, 11, 6, 25],
  小满: [5, 20, 20, 59, 31],
  大暑: [7, 22, 15, 44, 26],
  秋分: [9, 22, 20, 43, 42],
  小雪: [11, 22, 3, 56, 31],
} as const satisfies Record<
  SolarTerm,
  readonly [number, number, number, number, number]
>;

export const fixedCalendarProvider: CalendarProvider = Object.freeze({
  getSolarTermInstant(year, term) {
    const [month, day, hour, minute, second] = TERM_FIELDS[term];
    const epoch = Date.UTC(year, month - 1, day, hour - 8, minute, second);
    return createYunQiInstant(epoch);
  },
});
~~~

Date.UTC is safe here because every exercised service year is at least 1900; the JavaScript 0-99 special case is outside this fixture's range.

- [ ] **Step 2: Write mapper tests before schemas and mapper**

Create tests/mapper.test.ts:

~~~ts
import { calculateYearYunQi, calculateYunQi, createYunQiInstant } from '@yunqi/domain';
import { describe, expect, it } from 'vitest';
import {
  mapCalculationResult,
  mapYearResult,
} from '../src/mappers/yunqi-mapper.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('YunQi API mapper', () => {
  it('maps the annual Domain result into the stable nested DTO', () => {
    const domain = calculateYearYunQi(2024, fixedCalendarProvider);
    const dto = mapYearResult(domain);

    expect(dto.ruleVersion).toBe('V1.0-2026.7.7-implementation.1');
    expect(dto.year).toBe(2024);
    expect(dto.stemBranch).toEqual({
      ganzhi: '甲辰',
      stem: '甲',
      branch: '辰',
    });
    expect(dto.interval.start).toEqual(domain.start);
    expect(dto.sixQi.sitian).toBe('太阳寒水');
    expect(dto.sixQi.steps).toHaveLength(6);
    expect(dto.sixQi.steps).not.toBe(domain.steps);
    expect(dto.explanations).not.toBe(domain.explanations);
    expect(dto).not.toBe(domain);
  });

  it('maps dated results and copies currentStep', () => {
    const domain = calculateYunQi(
      createYunQiInstant(1_716_210_000_000),
      fixedCalendarProvider,
    );
    const dto = mapCalculationResult(domain);

    expect(dto.input).toEqual(domain.input);
    expect(dto.input).not.toBe(domain.input);
    expect(dto.currentStep).toEqual(dto.sixQi.steps[2]);
    expect(dto.currentStep).not.toBe(domain.currentStep);
  });
});
~~~

- [ ] **Step 3: Run the focused mapper test and confirm RED**

Run: pnpm --filter @yunqi/service test -- tests/mapper.test.ts

Expected: FAIL because schemas and yunqi-mapper.ts do not exist.

- [ ] **Step 4: Define complete TypeBox contracts**

In schemas/common.ts define closed HealthData, HealthSuccess, ErrorDetails, and ErrorResponse schemas. In schemas/yunqi.ts define literal unions for every Domain enum and closed object schemas for instant, stem/branch, SuiYun, relation, step, year DTO, calculation DTO, params, request, and success envelopes.

Use these exact public IDs and constraints:

~~~ts
export const YearParamsSchema = Type.Object(
  { year: Type.Integer({ minimum: 1901, maximum: 2099 }) },
  { $id: 'YearParams', additionalProperties: false },
);

export const CalculateRequestSchema = Type.Object(
  {
    dateTime: Type.String({
      pattern:
        '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})?$',
      examples: [
        '2024-05-20T21:00:00',
        '2024-05-20T13:00:00Z',
        '2024-05-20T21:00:00+08:00',
      ],
    }),
  },
  { $id: 'CalculateRequest', additionalProperties: false },
);

export const YunQiInstantDtoSchema = Type.Object(
  {
    epochMilliseconds: Type.Integer({
      minimum: Number.MIN_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    timezone: Type.Literal('Asia/Shanghai'),
  },
  { $id: 'YunQiInstantDto', additionalProperties: false },
);
~~~

Complete schemas/common.ts with:

~~~ts
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
    data: Type.Ref(HealthDataSchema),
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

export type HealthSuccessResponse = Static<typeof HealthSuccessSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

export function routeResponses<T extends TSchema>(successSchema: T) {
  return {
    200: Type.Ref(successSchema),
    400: Type.Ref(ErrorResponseSchema),
    503: Type.Ref(ErrorResponseSchema),
    500: Type.Ref(ErrorResponseSchema),
  } as const;
}
~~~

Complete schemas/yunqi.ts with the exact component structure below. Each Type.Object includes additionalProperties: false.

~~~ts
import { Static, Type } from '@fastify/type-provider-typebox';

const HeavenlyStemSchema = Type.Union(
  [
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
  ],
);
const EarthlyBranchSchema = Type.Union(
  [
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
  ],
);
const ElementSchema = Type.Union(
  [
    Type.Literal('木'),
    Type.Literal('火'),
    Type.Literal('土'),
    Type.Literal('金'),
    Type.Literal('水'),
  ],
);
const YunStateSchema = Type.Union(
  [Type.Literal('太过'), Type.Literal('不及')],
);
const ToneSchema = Type.Union(
  [
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
  ],
);
const QiSchema = Type.Union(
  [
    Type.Literal('厥阴风木'),
    Type.Literal('少阴君火'),
    Type.Literal('太阴湿土'),
    Type.Literal('少阳相火'),
    Type.Literal('阳明燥金'),
    Type.Literal('太阳寒水'),
  ],
);
const StepNameSchema = Type.Union(
  [
    Type.Literal('初之气'),
    Type.Literal('二之气'),
    Type.Literal('三之气'),
    Type.Literal('四之气'),
    Type.Literal('五之气'),
    Type.Literal('终之气'),
  ],
);

export const YunQiInstantDtoSchema = Type.Object(
  {
    epochMilliseconds: Type.Integer({
      minimum: Number.MIN_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
    }),
    timezone: Type.Literal('Asia/Shanghai'),
  },
  { $id: 'YunQiInstantDto', additionalProperties: false },
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
    start: Type.Ref(YunQiInstantDtoSchema),
    end: Type.Ref(YunQiInstantDtoSchema),
    hostQi: QiSchema,
    guestQi: QiSchema,
    relation: Type.Ref(HostGuestRelationDtoSchema),
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
    start: Type.Ref(YunQiInstantDtoSchema),
    end: Type.Ref(YunQiInstantDtoSchema),
  },
  { $id: 'YunQiIntervalDto', additionalProperties: false },
);

export const SixQiDtoSchema = Type.Object(
  {
    sitian: QiSchema,
    zaiquan: QiSchema,
    steps: Type.Array(Type.Ref(SixQiStepDtoSchema), {
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
    stemBranch: Type.Ref(StemBranchDtoSchema),
    interval: Type.Ref(IntervalDtoSchema),
    suiYun: Type.Ref(SuiYunDtoSchema),
    sixQi: Type.Ref(SixQiDtoSchema),
    explanations: Type.Array(Type.String()),
  },
  { $id: 'YunQiYearDto', additionalProperties: false },
);

export const YunQiCalculationDtoSchema = Type.Object(
  {
    ...YunQiYearDtoSchema.properties,
    input: Type.Ref(YunQiInstantDtoSchema),
    currentStep: Type.Ref(SixQiStepDtoSchema),
  },
  { $id: 'YunQiCalculationDto', additionalProperties: false },
);

export const YearParamsSchema = Type.Object(
  { year: Type.Integer({ minimum: 1901, maximum: 2099 }) },
  { $id: 'YearParams', additionalProperties: false },
);

export const CalculateRequestSchema = Type.Object(
  {
    dateTime: Type.String({
      pattern:
        '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?(?:Z|[+-]\\d{2}:\\d{2})?$',
      examples: [
        '2024-05-20T21:00:00',
        '2024-05-20T13:00:00Z',
        '2024-05-20T21:00:00+08:00',
      ],
    }),
  },
  { $id: 'CalculateRequest', additionalProperties: false },
);

export const YearSuccessSchema = Type.Object(
  {
    code: Type.Literal('SUCCESS'),
    message: Type.Literal(''),
    data: Type.Ref(YunQiYearDtoSchema),
  },
  { $id: 'YearSuccessResponse', additionalProperties: false },
);

export const CalculationSuccessSchema = Type.Object(
  {
    code: Type.Literal('SUCCESS'),
    message: Type.Literal(''),
    data: Type.Ref(YunQiCalculationDtoSchema),
  },
  { $id: 'CalculationSuccessResponse', additionalProperties: false },
);

export type YunQiInstantDto = Static<typeof YunQiInstantDtoSchema>;
export type HostGuestRelationDto =
  Static<typeof HostGuestRelationDtoSchema>;
export type SixQiStepDto = Static<typeof SixQiStepDtoSchema>;
export type YunQiYearDto = Static<typeof YunQiYearDtoSchema>;
export type YunQiCalculationDto =
  Static<typeof YunQiCalculationDtoSchema>;
export type CalculateRequest = Static<typeof CalculateRequestSchema>;
~~~

Export contractSchemas from schemas/index.ts in this dependency order:

~~~ts
import { ErrorResponseSchema, HealthDataSchema, HealthSuccessSchema } from './common.js';
import {
  CalculateRequestSchema,
  CalculationSuccessSchema,
  HostGuestRelationDtoSchema,
  IntervalDtoSchema,
  SixQiStepDtoSchema,
  SixQiDtoSchema,
  StemBranchDtoSchema,
  SuiYunDtoSchema,
  YearParamsSchema,
  YearSuccessSchema,
  YunQiCalculationDtoSchema,
  YunQiInstantDtoSchema,
  YunQiYearDtoSchema,
} from './yunqi.js';

export const contractSchemas = [
  HealthDataSchema,
  YunQiInstantDtoSchema,
  HostGuestRelationDtoSchema,
  SixQiStepDtoSchema,
  StemBranchDtoSchema,
  SuiYunDtoSchema,
  IntervalDtoSchema,
  SixQiDtoSchema,
  YunQiYearDtoSchema,
  YunQiCalculationDtoSchema,
  CalculateRequestSchema,
  YearParamsSchema,
  HealthSuccessSchema,
  YearSuccessSchema,
  CalculationSuccessSchema,
  ErrorResponseSchema,
] as const;
~~~

- [ ] **Step 5: Implement fresh-object mappers**

Create mappers/yunqi-mapper.ts with small functions for instants, relations, and steps, then compose the two public mappers:

~~~ts
import type {
  HostGuestRelationResult,
  SixQiStep,
  YunQiInstant,
  YunQiResult,
  YunQiYearResult,
} from '@yunqi/domain';
import type {
  HostGuestRelationDto,
  SixQiStepDto,
  YunQiCalculationDto,
  YunQiInstantDto,
  YunQiYearDto,
} from '../schemas/yunqi.js';

function mapInstant(value: YunQiInstant): YunQiInstantDto {
  return {
    epochMilliseconds: value.epochMilliseconds,
    timezone: value.timezone,
  };
}

function mapRelation(value: HostGuestRelationResult): HostGuestRelationDto {
  return {
    qiRelation: value.qiRelation,
    elementRelation: value.elementRelation,
    direction: value.direction,
    traditionalLabel: value.traditionalLabel,
  };
}

function mapStep(value: SixQiStep): SixQiStepDto {
  return {
    index: value.index,
    name: value.name,
    start: mapInstant(value.start),
    end: mapInstant(value.end),
    hostQi: value.hostQi,
    guestQi: value.guestQi,
    relation: mapRelation(value.relation),
  };
}

export function mapYearResult(value: YunQiYearResult): YunQiYearDto {
  return {
    ruleVersion: value.ruleVersion,
    year: value.year,
    stemBranch: {
      ganzhi: value.ganzhi,
      stem: value.stem,
      branch: value.branch,
    },
    interval: {
      start: mapInstant(value.start),
      end: mapInstant(value.end),
    },
    suiYun: { ...value.suiYun },
    sixQi: {
      sitian: value.sitian,
      zaiquan: value.zaiquan,
      steps: value.steps.map(mapStep),
    },
    explanations: [...value.explanations],
  };
}

export function mapCalculationResult(
  value: YunQiResult,
): YunQiCalculationDto {
  return {
    ...mapYearResult(value),
    input: mapInstant(value.input),
    currentStep: mapStep(value.currentStep),
  };
}
~~~

- [ ] **Step 6: Verify mapper and schema type safety**

Run:

~~~powershell
pnpm --filter @yunqi/service test -- tests/mapper.test.ts
pnpm --filter @yunqi/service typecheck
pnpm --filter @yunqi/service test:typecheck
~~~

Expected: all pass; exact ruleVersion is preserved and identity assertions prove fresh mapping.

- [ ] **Step 7: Commit schemas and mappers**

~~~powershell
git add packages/yunqi-service/src/schemas packages/yunqi-service/src/mappers packages/yunqi-service/tests/helpers/fixed-calendar-provider.ts packages/yunqi-service/tests/mapper.test.ts
git commit -m "feat(yunqi-service): define stable API DTO mapping"
~~~

### Task 3: Fastify shell, health route, and safe errors

**Files:**
- Create: packages/yunqi-service/src/plugins/openapi.ts
- Create: packages/yunqi-service/src/plugins/error-handler.ts
- Create: packages/yunqi-service/src/routes/health.ts
- Create: packages/yunqi-service/src/app.ts
- Modify: packages/yunqi-service/src/index.ts
- Create: packages/yunqi-service/tests/health.test.ts
- Create: packages/yunqi-service/tests/error-handler.test.ts

**Interfaces:**
- Produces: BuildAppOptions with provider, now, and logger
- Produces: buildApp(options): Promise<FastifyInstance>
- Produces: installErrorHandler(app): void
- Produces: registerOpenApi(app): Promise<void> and registerSwaggerUi(app): Promise<void>

- [ ] **Step 1: Write failing health and generic-error tests**

Create tests/health.test.ts:

~~~ts
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('GET /health', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('returns the versioned success envelope without calling Domain', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      code: 'SUCCESS',
      message: '',
      data: { status: 'ok', apiVersion: 'v1' },
    });
  });
});
~~~

Create tests/error-handler.test.ts:

~~~ts
import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

it('does not expose unexpected internal errors', async () => {
  const app = await buildApp({
    provider: fixedCalendarProvider,
    now: () => 1_716_210_000_000,
    logger: false,
  });
  app.get('/test-error', async () => {
    throw new Error('secret dependency text');
  });

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/test-error',
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '服务内部错误',
      details: {},
    });
    expect(response.body).not.toContain('secret dependency text');
  } finally {
    await app.close();
  }
});
~~~

- [ ] **Step 2: Run focused tests and confirm RED**

Run: pnpm --filter @yunqi/service test -- tests/health.test.ts tests/error-handler.test.ts

Expected: FAIL because app.ts and plugins do not exist.

- [ ] **Step 3: Register OpenAPI before routes**

Implement plugins/openapi.ts:

~~~ts
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'YunQi Service API',
        version: '1.0.0',
        description: 'Versioned YunQi time-fact and rule-mapping contract.',
      },
      servers: [{ url: 'http://localhost:3000', description: 'Local server' }],
      tags: [
        { name: 'system', description: 'Service status endpoints' },
        { name: 'yunqi', description: 'YunQi contract endpoints' },
      ],
    },
  });
}

export async function registerSwaggerUi(app: FastifyInstance): Promise<void> {
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
  });
}
~~~

- [ ] **Step 4: Install the safe error handler**

Implement plugins/error-handler.ts. Task 4 adds the provider-specific branch after CalendarProviderUnavailableError exists.

~~~ts
import type { FastifyInstance } from 'fastify';
import type { ErrorResponse } from '../schemas/common.js';

export function installErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
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
~~~

- [ ] **Step 5: Build the injectable app and health route**

Implement routes/health.ts:

~~~ts
import {
  FastifyPluginAsyncTypebox,
  Type,
} from '@fastify/type-provider-typebox';
import {
  ErrorResponseSchema,
  HealthSuccessSchema,
} from '../schemas/common.js';

export const healthRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get('/health', {
    schema: {
      operationId: 'getHealth',
      summary: 'Get service health',
      tags: ['system'],
      response: {
        200: Type.Ref(HealthSuccessSchema),
        500: Type.Ref(ErrorResponseSchema),
      },
    },
  }, async () => ({
    code: 'SUCCESS',
    message: '',
    data: {
      status: 'ok',
      apiVersion: 'v1',
    },
  }));
};
~~~

Implement app.ts:

~~~ts
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { CalendarProvider } from '@yunqi/domain';
import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify';
import { installErrorHandler } from './plugins/error-handler.js';
import { registerOpenApi, registerSwaggerUi } from './plugins/openapi.js';
import { healthRoutes } from './routes/health.js';
import { contractSchemas } from './schemas/index.js';

export interface BuildAppOptions {
  provider: CalendarProvider;
  now: () => number;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp(
  options: BuildAppOptions,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false })
    .withTypeProvider<TypeBoxTypeProvider>();

  await registerOpenApi(app);
  for (const schema of contractSchemas) app.addSchema(schema);
  installErrorHandler(app);
  await app.register(healthRoutes);
  await registerSwaggerUi(app);
  return app;
}
~~~

Keep provider and now in BuildAppOptions even before YunQi routes consume them; Task 4 wires them.

- [ ] **Step 6: Verify health, errors, Swagger UI, and types**

Add assertions that GET /docs/ returns 200 and app.swagger().openapi equals 3.1.0. Then run:

~~~powershell
pnpm --filter @yunqi/service test -- tests/health.test.ts tests/error-handler.test.ts
pnpm --filter @yunqi/service typecheck
pnpm --filter @yunqi/service test:typecheck
~~~

Expected: all pass and no internal error text is serialized.

- [ ] **Step 7: Commit the Fastify shell**

~~~powershell
git add packages/yunqi-service/src/app.ts packages/yunqi-service/src/index.ts packages/yunqi-service/src/plugins packages/yunqi-service/src/routes/health.ts packages/yunqi-service/tests/health.test.ts packages/yunqi-service/tests/error-handler.test.ts
git commit -m "feat(yunqi-service): add Fastify contract shell"
~~~

### Task 4: YunQi service orchestration and versioned routes

**Files:**
- Create: packages/yunqi-service/src/services/provider-boundary.ts
- Create: packages/yunqi-service/src/services/yunqi-service.ts
- Create: packages/yunqi-service/src/routes/yunqi.ts
- Modify: packages/yunqi-service/src/app.ts
- Create: packages/yunqi-service/tests/api.test.ts
- Create: packages/yunqi-service/tests/boundary.test.ts
- Create: packages/yunqi-service/tests/safety.test.ts

**Interfaces:**
- Consumes: parseApiDateTime, schemas, mappers, BuildAppOptions
- Produces: CalendarProviderUnavailableError
- Produces: calculateAnnualDto(year, provider): YunQiYearDto
- Produces: calculateAtDto(input, provider): YunQiCalculationDto
- Produces: GET /api/v1/yunqi/year/:year, GET /current, POST /calculate

- [ ] **Step 1: Write failing route and error-boundary tests**

Create tests/api.test.ts with one app per test and app.close in afterEach. Cover all required request families:

~~~ts
it('returns a mapped annual success envelope', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/yunqi/year/2024',
  });
  expect(response.statusCode).toBe(200);
  expect(response.json()).toMatchObject({
    code: 'SUCCESS',
    message: '',
    data: {
      ruleVersion: 'V1.0-2026.7.7-implementation.1',
      year: 2024,
      stemBranch: { ganzhi: '甲辰', stem: '甲', branch: '辰' },
      sixQi: { sitian: '太阳寒水', zaiquan: '太阴湿土' },
    },
  });
});

it.each(['2024.5', 'not-a-year', '1900', '2100'])(
  'rejects invalid year %s',
  async (year) => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/' + year,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().code).toBe('INVALID_ARGUMENT');
  },
);

it.each([
  '2024-05-20T21:00:00',
  '2024-05-20T13:00:00Z',
  '2024-05-20T21:00:00+08:00',
])('calculates equivalent input %s', async (dateTime) => {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/yunqi/calculate',
    payload: { dateTime },
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.input.epochMilliseconds)
    .toBe(1_716_210_000_000);
});

it('uses the injected absolute clock for current', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/yunqi/current',
  });
  expect(response.statusCode).toBe(200);
  expect(response.json().data.input.epochMilliseconds)
    .toBe(1_716_210_000_000);
});
~~~

Add body rejection tests for missing dateTime, additional properties, invalid calendar date, unsupported fraction precision, and ambiguous/nonexistent local time.

Create tests/boundary.test.ts with:

- a provider whose getSolarTermInstant throws RangeError('provider secret'), expecting 503 and no secret;
- a provider returning non-increasing term instants, expecting Domain RangeError to remain 400;
- a normalized input whose calculated YunQi year is outside 1901-2099, expecting 400.

- [ ] **Step 2: Run focused API tests and confirm RED**

Run: pnpm --filter @yunqi/service test -- tests/api.test.ts tests/boundary.test.ts

Expected: FAIL because the routes and service boundary do not exist.

- [ ] **Step 3: Isolate provider failures**

Create services/provider-boundary.ts:

~~~ts
import type {
  CalendarProvider,
  SolarTerm,
  YunQiInstant,
} from '@yunqi/domain';

export class CalendarProviderUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Calendar provider unavailable', { cause });
    this.name = 'CalendarProviderUnavailableError';
  }
}

export function protectCalendarProvider(
  provider: CalendarProvider,
): CalendarProvider {
  return Object.freeze({
    getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant {
      try {
        return provider.getSolarTermInstant(year, term);
      } catch (cause) {
        throw new CalendarProviderUnavailableError(cause);
      }
    },
  });
}
~~~

Update the error handler to test CalendarProviderUnavailableError before RangeError so a provider-thrown RangeError becomes 503.

Insert this import and branch immediately before the RangeError branch:

~~~ts
import { CalendarProviderUnavailableError } from '../services/provider-boundary.js';

if (error instanceof CalendarProviderUnavailableError) {
  request.log.error({ err: error }, 'Calendar provider unavailable');
  const body: ErrorResponse = {
    code: 'CALENDAR_PROVIDER_UNAVAILABLE',
    message: '历法服务暂时不可用',
    details: {},
  };
  return reply.status(503).send(body);
}
~~~

- [ ] **Step 4: Implement service orchestration**

Create services/yunqi-service.ts:

~~~ts
import {
  calculateYearYunQi,
  calculateYunQi,
  createYunQiInstant,
  type CalendarProvider,
  type YunQiInstant,
} from '@yunqi/domain';
import {
  mapCalculationResult,
  mapYearResult,
} from '../mappers/yunqi-mapper.js';
import type {
  YunQiCalculationDto,
  YunQiYearDto,
} from '../schemas/yunqi.js';
import { protectCalendarProvider } from './provider-boundary.js';

export const MIN_SUPPORTED_YEAR = 1901;
export const MAX_SUPPORTED_YEAR = 2099;

export function assertSupportedYear(year: number): void {
  if (
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > MAX_SUPPORTED_YEAR
  ) {
    throw new RangeError('年份必须是 1901 到 2099 的整数');
  }
}

export function calculateAnnualDto(
  year: number,
  provider: CalendarProvider,
): YunQiYearDto {
  assertSupportedYear(year);
  return mapYearResult(calculateYearYunQi(year, protectCalendarProvider(provider)));
}

export function calculateAtDto(
  input: YunQiInstant,
  provider: CalendarProvider,
): YunQiCalculationDto {
  const result = calculateYunQi(input, protectCalendarProvider(provider));
  assertSupportedYear(result.year);
  return mapCalculationResult(result);
}

export function currentInstant(now: () => number): YunQiInstant {
  return createYunQiInstant(now());
}
~~~

- [ ] **Step 5: Register the three YunQi routes**

Create routes/yunqi.ts as FastifyPluginAsyncTypebox. It receives provider and now options and uses only service orchestration functions:

~~~ts
export const yunqiRoutes: FastifyPluginAsyncTypebox<{
  provider: CalendarProvider;
  now: () => number;
}> = async (app, options) => {
  app.get('/year/:year', {
    schema: {
      operationId: 'getYunQiYear',
      summary: 'Get a YunQi year',
      tags: ['yunqi'],
      params: Type.Ref(YearParamsSchema),
      response: routeResponses(YearSuccessSchema),
    },
  }, async (request) => ({
    code: 'SUCCESS',
    message: '',
    data: calculateAnnualDto(request.params.year, options.provider),
  }));

  app.get('/current', {
    schema: {
      operationId: 'getCurrentYunQi',
      summary: 'Get YunQi facts for the current instant',
      tags: ['yunqi'],
      response: routeResponses(CalculationSuccessSchema),
    },
  }, async () => ({
    code: 'SUCCESS',
    message: '',
    data: calculateAtDto(currentInstant(options.now), options.provider),
  }));

  app.post('/calculate', {
    schema: {
      operationId: 'calculateYunQi',
      summary: 'Calculate YunQi facts for a date-time',
      tags: ['yunqi'],
      body: Type.Ref(CalculateRequestSchema),
      response: routeResponses(CalculationSuccessSchema),
    },
  }, async (request) => ({
    code: 'SUCCESS',
    message: '',
    data: calculateAtDto(
      parseApiDateTime(request.body.dateTime),
      options.provider,
    ),
  }));
};
~~~

Import routeResponses from schemas/common.ts. Register this plugin in app.ts with prefix /api/v1/yunqi before Swagger UI registration:

~~~ts
await app.register(yunqiRoutes, {
  prefix: '/api/v1/yunqi',
  provider: options.provider,
  now: options.now,
});
~~~

- [ ] **Step 6: Add medical-safety response assertions**

Create tests/safety.test.ts. Inject all three successful YunQi endpoints, stringify each body, and reject the prohibited pattern:

~~~ts
const PROHIBITED =
  /诊断|疾病判断|治疗建议|个体预测|处方|方剂|中药|剂量|用药|预后|diagnos|prescri|dosage|treat|prognos/i;

expect(JSON.stringify(response.json())).not.toMatch(PROHIBITED);
~~~

Also assert no response property is named diagnosis, disease, treatment, prescription, dosage, prognosis, or prediction.

- [ ] **Step 7: Verify all API and boundary behavior**

Run:

~~~powershell
pnpm --filter @yunqi/service test -- tests/api.test.ts tests/boundary.test.ts tests/safety.test.ts
pnpm --filter @yunqi/service typecheck
pnpm --filter @yunqi/service test:typecheck
~~~

Expected: all pass; local, Z, and offset inputs return the same absolute input; provider failures are 503; Domain RangeError is 400.

- [ ] **Step 8: Commit the YunQi routes**

~~~powershell
git add packages/yunqi-service/src/app.ts packages/yunqi-service/src/plugins/error-handler.ts packages/yunqi-service/src/routes/yunqi.ts packages/yunqi-service/src/services/provider-boundary.ts packages/yunqi-service/src/services/yunqi-service.ts packages/yunqi-service/tests/api.test.ts packages/yunqi-service/tests/boundary.test.ts packages/yunqi-service/tests/safety.test.ts
git commit -m "feat(yunqi-service): expose versioned YunQi routes"
~~~

### Task 5: OpenAPI 3.1 generation, validation, and response contract tests

**Files:**
- Create: packages/yunqi-service/scripts/generate-openapi.mjs
- Create: packages/yunqi-service/scripts/check-generated.mjs
- Create: packages/yunqi-service/redocly.yaml
- Create: packages/yunqi-service/openapi/yunqi-service.openapi.yaml
- Create initially by generator: packages/yunqi-service/src/contracts/generated-client.ts
- Modify: packages/yunqi-service/package.json
- Create: packages/yunqi-service/tests/openapi-contract.test.ts

**Interfaces:**
- Consumes: built dist/app.js and real tyme4tsCalendarProvider
- Produces: generateOpenApi(outputPath): Promise<void>
- Produces: OpenAPI 3.1 YAML and generated paths/components types
- Produces: openapi:generate, openapi:lint, and openapi:check scripts

- [ ] **Step 1: Write failing OpenAPI contract tests**

Create tests/openapi-contract.test.ts:

~~~ts
import Ajv2020 from 'ajv/dist/2020.js';
import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { buildApp } from '../src/app.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

describe('OpenAPI contract', () => {
  const apps: Awaited<ReturnType<typeof buildApp>>[] = [];
  afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

  it('publishes complete OpenAPI 3.1 metadata and paths', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);
    await app.ready();
    const document = app.swagger() as Record<string, any>;

    expect(document.openapi).toBe('3.1.0');
    expect(document.info.version).toBe('1.0.0');
    expect(Object.keys(document.paths ?? {})).toEqual(expect.arrayContaining([
      '/health',
      '/api/v1/yunqi/year/{year}',
      '/api/v1/yunqi/current',
      '/api/v1/yunqi/calculate',
    ]));
    expect(document.components.schemas).toHaveProperty('ErrorResponse');
    expect(document.components.schemas.CalculateRequest.examples).toHaveLength(3);
    expect(document.components.schemas.HealthSuccessResponse.examples)
      .toHaveLength(1);
    expect(document.components.schemas.ErrorResponse.examples).toHaveLength(3);
  });

  it('validates a live annual response against its OpenAPI schema', async () => {
    const app = await buildApp({
      provider: fixedCalendarProvider,
      now: () => 1_716_210_000_000,
      logger: false,
    });
    apps.push(app);
    await app.ready();
    const document = app.swagger() as Record<string, any>;
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
    });
    const schemas = document.components.schemas;
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const rootId = 'https://yunqi.local/openapi-contract.json';
    ajv.addSchema({
      $id: rootId,
      components: { schemas },
    });
    const responseSchema =
      document.paths['/api/v1/yunqi/year/{year}'].get.responses['200']
        .content['application/json'].schema;
    const validate = ajv.compile({
      $ref: rootId + responseSchema.$ref,
    });

    expect(validate(response.json()), JSON.stringify(validate.errors)).toBe(true);
  });

  it('has a checked-in OpenAPI 3.1 YAML artifact', async () => {
    const source = await readFile(
      new URL('../openapi/yunqi-service.openapi.yaml', import.meta.url),
      'utf8',
    );
    const document = parse(source);
    expect(document.openapi).toBe('3.1.0');
    expect(document.paths).toHaveProperty('/api/v1/yunqi/calculate');
  });
});
~~~

Add assertions that each of the three YunQi operations references 400, 503, and 500, and that component examples exist for health success, calculate request, and all three error codes.

- [ ] **Step 2: Run the OpenAPI test and confirm RED**

Run: pnpm --filter @yunqi/service test -- tests/openapi-contract.test.ts

Expected: FAIL because openapi/yunqi-service.openapi.yaml does not exist.

- [ ] **Step 3: Add deterministic generation and lint configuration**

Create scripts/generate-openapi.mjs:

~~~js
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { buildApp } from '../dist/app.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = resolve(
  packageRoot,
  'openapi/yunqi-service.openapi.yaml',
);

export async function generateOpenApi(outputPath = defaultOutput) {
  const app = await buildApp({
    provider: tyme4tsCalendarProvider,
    now: Date.now,
    logger: false,
  });
  try {
    await app.ready();
    const yaml = app.swagger({ yaml: true }).replace(/\r\n/g, '\n');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, yaml.endsWith('\n') ? yaml : yaml + '\n', 'utf8');
  } finally {
    await app.close();
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) {
  await generateOpenApi(process.argv[2] ?? defaultOutput);
}
~~~

Create redocly.yaml:

~~~yaml
extends:
  - recommended
rules:
  info-license: off
  security-defined: off
~~~

Add package scripts:

~~~json
{
  "openapi:generate": "node scripts/generate-openapi.mjs && openapi-typescript openapi/yunqi-service.openapi.yaml --output src/contracts/generated-client.ts --immutable --alphabetize",
  "openapi:lint": "redocly lint openapi/yunqi-service.openapi.yaml --config redocly.yaml",
  "openapi:check": "node scripts/check-generated.mjs"
}
~~~

- [ ] **Step 4: Add a non-mutating drift checker**

Create scripts/check-generated.mjs:

~~~js
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateOpenApi } from './generate-openapi.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const trackedYaml = resolve(
  packageRoot,
  'openapi/yunqi-service.openapi.yaml',
);
const trackedTypes = resolve(
  packageRoot,
  'src/contracts/generated-client.ts',
);
const temporaryRoot = await mkdtemp(join(tmpdir(), 'yunqi-openapi-'));
const temporaryYaml = join(temporaryRoot, 'yunqi-service.openapi.yaml');
const temporaryTypes = join(temporaryRoot, 'generated-client.ts');

async function assertSame(
  expectedPath,
  actualPath,
  staleMessage,
) {
  const [expected, actual] = await Promise.all([
    readFile(expectedPath),
    readFile(actualPath),
  ]);
  if (!expected.equals(actual)) throw new Error(staleMessage);
}

try {
  await generateOpenApi(temporaryYaml);
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const generated = spawnSync(
    pnpm,
    [
      'exec',
      'openapi-typescript',
      temporaryYaml,
      '--output',
      temporaryTypes,
      '--immutable',
      '--alphabetize',
    ],
    {
      cwd: packageRoot,
      encoding: 'utf8',
    },
  );
  if (generated.status !== 0) {
    throw new Error(generated.stderr || generated.stdout);
  }
  await assertSame(
    trackedYaml,
    temporaryYaml,
    'OpenAPI YAML is stale; run pnpm openapi:generate',
  );
  await assertSame(
    trackedTypes,
    temporaryTypes,
    'Generated client types are stale; run pnpm openapi:generate',
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
~~~

- [ ] **Step 5: Generate artifacts and verify the contract**

Run:

~~~powershell
pnpm --filter @yunqi/domain build
pnpm --filter @yunqi/calendar-adapter-tyme4ts build
pnpm --filter @yunqi/service build
pnpm --filter @yunqi/service openapi:generate
pnpm --filter @yunqi/service openapi:lint
pnpm --filter @yunqi/service openapi:check
pnpm --filter @yunqi/service test -- tests/openapi-contract.test.ts
~~~

Expected: Redocly reports a valid OpenAPI 3.1 document, drift check exits 0, and actual responses validate.

- [ ] **Step 6: Commit generated and validation artifacts**

~~~powershell
git add packages/yunqi-service/package.json packages/yunqi-service/redocly.yaml packages/yunqi-service/scripts packages/yunqi-service/openapi/yunqi-service.openapi.yaml packages/yunqi-service/src/contracts/generated-client.ts packages/yunqi-service/tests/openapi-contract.test.ts pnpm-lock.yaml
git commit -m "feat(yunqi-service): generate validated OpenAPI contract"
~~~

### Task 6: Browser-safe client, Axios/Fetch transports, and query options

**Files:**
- Create: packages/yunqi-service/src/contracts/yunqi-types.ts
- Create: packages/yunqi-service/src/contracts/yunqi-api.ts
- Create: packages/yunqi-service/src/contracts/index.ts
- Create: packages/yunqi-service/tests/contracts.test.ts
- Create: packages/yunqi-service/tests/contracts.typecheck.ts

**Interfaces:**
- Consumes: generated components and paths from generated-client.ts
- Produces: createFetchTransport, createAxiosTransport, createYunQiClient
- Produces: yunqiClient.getYear, getCurrent, calculate
- Produces: yunqiQueryOptions.year and yunqiQueryOptions.current

- [ ] **Step 1: Write failing runtime and type contract tests**

Create tests/contracts.test.ts:

~~~ts
import { describe, expect, it, vi } from 'vitest';
import {
  createAxiosTransport,
  createYunQiClient,
  yunqiQueryOptions,
} from '../src/contracts/yunqi-api.js';

describe('browser YunQi client', () => {
  it('exposes getYear with a transport-neutral contract', async () => {
    const request = vi.fn().mockResolvedValue({
      code: 'SUCCESS',
      message: '',
      data: { year: 2024 },
    });
    const client = createYunQiClient({ request });

    await expect(client.getYear(2024)).resolves.toMatchObject({ year: 2024 });
    expect(request).toHaveBeenCalledWith({
      method: 'GET',
      path: '/api/v1/yunqi/year/2024',
    });
  });

  it('adapts an Axios-compatible instance', async () => {
    const axios = {
      request: vi.fn().mockResolvedValue({
        data: { code: 'SUCCESS', message: '', data: { year: 2024 } },
      }),
    };
    const transport = createAxiosTransport(axios);
    await transport.request({
      method: 'GET',
      path: '/api/v1/yunqi/year/2024',
    });
    expect(axios.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/api/v1/yunqi/year/2024',
      data: undefined,
    });
  });

  it('returns TanStack Query-compatible options', () => {
    const client = createYunQiClient({
      request: vi.fn().mockResolvedValue({
        code: 'SUCCESS',
        message: '',
        data: { year: 2024 },
      }),
    });
    const options = yunqiQueryOptions.year(2024, client);
    expect(options.queryKey).toEqual(['yunqi', 'year', 2024]);
    expect(options.queryFn).toBeTypeOf('function');
  });
});
~~~

Create tests/contracts.typecheck.ts with assignments proving getYear returns Promise<YunQiYearDto>, calculate accepts only CalculateRequest, query keys are readonly tuples, and an Axios-like structural instance works without importing axios:

~~~ts
import {
  createAxiosTransport,
  createYunQiClient,
  yunqiQueryOptions,
  type AxiosLike,
} from '../src/contracts/yunqi-api.js';
import type {
  CalculateRequest,
  YunQiYearDto,
} from '../src/contracts/yunqi-types.js';

declare const axios: AxiosLike;
const client = createYunQiClient(createAxiosTransport(axios));
const annual: Promise<YunQiYearDto> = client.getYear(2024);
const request: CalculateRequest = { dateTime: '2024-05-20T21:00:00' };
void client.calculate(request);
const key: readonly ['yunqi', 'year', number] =
  yunqiQueryOptions.year(2024, client).queryKey;
void { annual, key };

// @ts-expect-error calculate requires dateTime.
void client.calculate({});
// @ts-expect-error getYear requires a number.
void client.getYear('2024');
~~~

- [ ] **Step 2: Run tests and confirm RED**

Run:

~~~powershell
pnpm --filter @yunqi/service test -- tests/contracts.test.ts
pnpm --filter @yunqi/service test:typecheck
~~~

Expected: FAIL because the browser contract files do not exist.

- [ ] **Step 3: Create generated-type aliases**

Create contracts/yunqi-types.ts:

~~~ts
import type { components, paths } from './generated-client.js';

export type ApiErrorResponse = components['schemas']['ErrorResponse'];
export type CalculateRequest = components['schemas']['CalculateRequest'];
export type YunQiYearDto = components['schemas']['YunQiYearDto'];
export type YunQiCalculationDto =
  components['schemas']['YunQiCalculationDto'];
export type YearSuccessResponse =
  components['schemas']['YearSuccessResponse'];
export type CalculationSuccessResponse =
  components['schemas']['CalculationSuccessResponse'];
export type YunQiPaths = paths;
~~~

If generated names differ, fix schema IDs rather than hand-editing generated-client.ts or weakening these aliases.

- [ ] **Step 4: Implement the typed transports and client**

Create contracts/yunqi-api.ts with these public interfaces:

~~~ts
import type {
  ApiErrorResponse,
  CalculateRequest,
  CalculationSuccessResponse,
  YearSuccessResponse,
  YunQiCalculationDto,
  YunQiYearDto,
} from './yunqi-types.js';

export interface TransportRequest {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
}

export interface YunQiTransport {
  request<T>(request: TransportRequest): Promise<T>;
}

export interface AxiosLike {
  request<T>(config: {
    method: 'GET' | 'POST';
    url: string;
    data?: unknown;
  }): Promise<{ data: T }>;
}

export class YunQiApiError extends Error {
  constructor(
    readonly status: number,
    readonly response: ApiErrorResponse,
  ) {
    super(response.message);
    this.name = 'YunQiApiError';
  }
}
~~~

Complete the rest of contracts/yunqi-api.ts:

~~~ts
export interface YunQiClient {
  getYear(year: number): Promise<YunQiYearDto>;
  getCurrent(): Promise<YunQiCalculationDto>;
  calculate(request: CalculateRequest): Promise<YunQiCalculationDto>;
}

export interface FetchTransportOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export function createFetchTransport(
  options: FetchTransportOptions,
): YunQiTransport {
  const fetchImpl =
    options.fetchImpl ??
    ((input: RequestInfo | URL, init?: RequestInit) =>
      globalThis.fetch(input, init));
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  return {
    async request<T>(request: TransportRequest): Promise<T> {
      const response = await fetchImpl(baseUrl + request.path, {
        method: request.method,
        headers: {
          accept: 'application/json',
          ...(request.body === undefined
            ? {}
            : { 'content-type': 'application/json' }),
        },
        ...(request.body === undefined
          ? {}
          : { body: JSON.stringify(request.body) }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new YunQiApiError(
          response.status,
          payload as ApiErrorResponse,
        );
      }
      return payload as T;
    },
  };
}

export function createAxiosTransport(axios: AxiosLike): YunQiTransport {
  return {
    async request<T>(request: TransportRequest): Promise<T> {
      const response = await axios.request<T>({
        method: request.method,
        url: request.path,
        data: request.body,
      });
      return response.data;
    },
  };
}

export function createYunQiClient(
  transport: YunQiTransport,
): YunQiClient {
  return {
    async getYear(year) {
      const response = await transport.request<YearSuccessResponse>({
        method: 'GET',
        path: '/api/v1/yunqi/year/' + encodeURIComponent(String(year)),
      });
      return response.data;
    },
    async getCurrent() {
      const response =
        await transport.request<CalculationSuccessResponse>({
          method: 'GET',
          path: '/api/v1/yunqi/current',
        });
      return response.data;
    },
    async calculate(request) {
      const response =
        await transport.request<CalculationSuccessResponse>({
          method: 'POST',
          path: '/api/v1/yunqi/calculate',
          body: request,
        });
      return response.data;
    },
  };
}

export const yunqiClient = createYunQiClient(
  createFetchTransport({ baseUrl: '' }),
);

export const yunqiQueryOptions = {
  year(year: number, client: YunQiClient = yunqiClient) {
    return {
      queryKey: ['yunqi', 'year', year] as const,
      queryFn: () => client.getYear(year),
    };
  },
  current(client: YunQiClient = yunqiClient) {
    return {
      queryKey: ['yunqi', 'current'] as const,
      queryFn: () => client.getCurrent(),
    };
  },
};
~~~

Create contracts/index.ts:

~~~ts
export {
  YunQiApiError,
  createAxiosTransport,
  createFetchTransport,
  createYunQiClient,
  yunqiClient,
  yunqiQueryOptions,
} from './yunqi-api.js';
export type {
  AxiosLike,
  FetchTransportOptions,
  TransportRequest,
  YunQiClient,
  YunQiTransport,
} from './yunqi-api.js';
export type {
  ApiErrorResponse,
  CalculateRequest,
  CalculationSuccessResponse,
  YearSuccessResponse,
  YunQiCalculationDto,
  YunQiPaths,
  YunQiYearDto,
} from './yunqi-types.js';
export type {
  components as GeneratedComponents,
  paths as GeneratedPaths,
} from './generated-client.js';
~~~

- [ ] **Step 5: Verify browser isolation and inference**

Run:

~~~powershell
pnpm --filter @yunqi/service test -- tests/contracts.test.ts
pnpm --filter @yunqi/service test:typecheck
pnpm --filter @yunqi/service build
rg -n "fastify|node:" packages/yunqi-service/dist/contracts
~~~

Expected: tests and build pass; rg exits 1 because it finds no server or Node-only import in emitted contract JavaScript. Treat that no-match result as success.

- [ ] **Step 6: Commit the browser contract**

~~~powershell
git add packages/yunqi-service/src/contracts/index.ts packages/yunqi-service/src/contracts/yunqi-types.ts packages/yunqi-service/src/contracts/yunqi-api.ts packages/yunqi-service/tests/contracts.test.ts packages/yunqi-service/tests/contracts.typecheck.ts
git commit -m "feat(yunqi-service): add browser-safe typed client"
~~~

### Task 7: Production startup, root CI gates, coverage, and handoff documentation

**Files:**
- Create: packages/yunqi-service/src/server-config.ts
- Create: packages/yunqi-service/src/server.ts
- Create: packages/yunqi-service/tests/startup.test.ts
- Create: packages/yunqi-service/README.md
- Modify: packages/yunqi-service/src/index.ts
- Modify: package.json
- Modify: packages/yunqi-service/package.json

**Interfaces:**
- Consumes: buildApp, tyme4tsCalendarProvider, Date.now
- Produces: executable server entry with HOST and PORT
- Produces: root test, typecheck, build, test:coverage, openapi validation, and schema validation gates

- [ ] **Step 1: Write the failing startup smoke test**

Create tests/startup.test.ts:

~~~ts
import { expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { readServerConfig } from '../src/server-config.js';
import { fixedCalendarProvider } from './helpers/fixed-calendar-provider.js';

it('validates process server configuration', () => {
  expect(readServerConfig({})).toEqual({
    host: '0.0.0.0',
    port: 3000,
  });
  expect(readServerConfig({ HOST: '127.0.0.1', PORT: '0' })).toEqual({
    host: '127.0.0.1',
    port: 0,
  });
  expect(() => readServerConfig({ PORT: '3000.5' })).toThrow(RangeError);
  expect(() => readServerConfig({ PORT: '65536' })).toThrow(RangeError);
});

it('listens on and closes an ephemeral port', async () => {
  const app = await buildApp({
    provider: fixedCalendarProvider,
    now: () => 1_716_210_000_000,
    logger: false,
  });
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  expect(address).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  const response = await fetch(address + '/health');
  expect(response.status).toBe(200);
  await app.close();
});
~~~

- [ ] **Step 2: Run startup test and confirm current gap**

Run: pnpm --filter @yunqi/service test -- tests/startup.test.ts

Expected: FAIL because src/server-config.ts does not exist.

- [ ] **Step 3: Add the real process entry**

Create src/server-config.ts:

~~~ts
export interface ServerConfig {
  host: string;
  port: number;
}

export function readServerConfig(
  env: NodeJS.ProcessEnv,
): ServerConfig {
  const portText = env.PORT ?? '3000';
  if (!/^\d+$/.test(portText)) {
    throw new RangeError('PORT 必须是 0 到 65535 的整数');
  }
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError('PORT 必须是 0 到 65535 的整数');
  }
  return {
    host: env.HOST?.trim() || '0.0.0.0',
    port,
  };
}
~~~

Create src/server.ts:

~~~ts
import { tyme4tsCalendarProvider } from '@yunqi/calendar-adapter-tyme4ts';
import { buildApp } from './app.js';
import { readServerConfig } from './server-config.js';

const config = readServerConfig(process.env);

const app = await buildApp({
  provider: tyme4tsCalendarProvider,
  now: Date.now,
  logger: true,
});

await app.listen({
  host: config.host,
  port: config.port,
});
~~~

Add package script start: node dist/server.js. Extend src/index.ts without exporting server.ts:

~~~ts
export { buildApp } from './app.js';
export type { BuildAppOptions } from './app.js';
export { HOSPITAL_TIME_ZONE, parseApiDateTime } from './services/date-time.js';
export { readServerConfig } from './server-config.js';
export type { ServerConfig } from './server-config.js';
~~~

- [ ] **Step 4: Wire root acceptance scripts**

Update root package.json scripts to the following semantics:

~~~json
{
  "build": "pnpm --filter @yunqi/domain build && pnpm --filter @yunqi/calendar-adapter-tyme4ts build && pnpm --filter @yunqi/service build",
  "test": "pnpm build && pnpm --filter @yunqi/domain test && pnpm --filter @yunqi/calendar-adapter-tyme4ts test && pnpm --filter @yunqi/service test && pnpm --filter @yunqi/service openapi:lint && pnpm --filter @yunqi/service openapi:check",
  "typecheck": "pnpm build && pnpm --filter @yunqi/domain typecheck && pnpm --filter @yunqi/domain test:typecheck && pnpm --filter @yunqi/calendar-adapter-tyme4ts typecheck && pnpm --filter @yunqi/calendar-adapter-tyme4ts test:typecheck && pnpm --filter @yunqi/service typecheck && pnpm --filter @yunqi/service test:typecheck",
  "test:coverage": "pnpm build && pnpm --filter @yunqi/domain test:coverage && pnpm --filter @yunqi/service test:coverage",
  "openapi:generate": "pnpm build && pnpm --filter @yunqi/service openapi:generate",
  "openapi:validate": "pnpm --filter @yunqi/service openapi:lint && pnpm --filter @yunqi/service openapi:check",
  "schema:validate": "pnpm --filter @yunqi/service test -- tests/openapi-contract.test.ts"
}
~~~

This preserves pnpm as package manager while making npm test, npm run typecheck, npm run build, and npm run test:coverage execute the required gates.

- [ ] **Step 5: Document service usage and boundaries**

Create packages/yunqi-service/README.md with:

- install/build/test/start commands;
- all four endpoints and the success/error envelopes;
- year range 1901-2099;
- local Asia/Shanghai, Z, and offset calculate examples;
- explicit warning that ambiguous/nonexistent local wall times require an offset;
- Swagger UI and YAML locations;
- browser contract imports and yunqiClient.getYear(2024);
- Axios adapter and TanStack Query option examples;
- medical safety and Domain isolation statements;
- generation command and do-not-edit warning for generated-client.ts.

Do not add claims about diagnosis, clinical decision support, prediction, or formal expert rule freeze.

Use this concrete structure and examples:

~~~markdown
# @yunqi/service

Fastify 5 service-contract package for the accepted @yunqi/domain facts.
It exposes time boundaries and versioned rule mappings only.

## Commands

From the repository root:

    pnpm build
    pnpm test
    pnpm typecheck
    pnpm --filter @yunqi/service start
    pnpm openapi:generate

Swagger UI is served at /docs/. The checked-in contract is
openapi/yunqi-service.openapi.yaml.

## Endpoints

- GET /health
- GET /api/v1/yunqi/year/:year, where year is 1901-2099
- GET /api/v1/yunqi/current
- POST /api/v1/yunqi/calculate

Success responses use:

    { "code": "SUCCESS", "message": "", "data": {} }

Errors use:

    { "code": "INVALID_ARGUMENT", "message": "...", "details": {} }

## Date-time input

The calculate endpoint accepts hospital-local Asia/Shanghai time:

    { "dateTime": "2024-05-20T21:00:00" }

It also accepts RFC 3339 absolute time:

    { "dateTime": "2024-05-20T13:00:00Z" }
    { "dateTime": "2024-05-20T21:00:00+08:00" }

Nonexistent or ambiguous local wall times are rejected; send an explicit
offset to identify the intended instant. The service converts all accepted
input into an absolute YunQiInstant before calling Domain.

## Browser contract

    import {
      createAxiosTransport,
      createYunQiClient,
      yunqiClient,
      yunqiQueryOptions,
    } from '@yunqi/service/contracts';

    const annual = await yunqiClient.getYear(2024);
    const yearOptions = yunqiQueryOptions.year(2024);
    const axiosClient = createYunQiClient(createAxiosTransport(axios));

generated-client.ts is generated from OpenAPI. Do not edit it by hand; run
pnpm openapi:generate.

## Safety boundary

The package does not produce diagnosis, disease judgment, prescriptions,
treatment advice, dosage, prognosis, or individual prediction. It does not
change or duplicate YunQi rules; @yunqi/domain remains the only calculation
layer.
~~~

- [ ] **Step 6: Run focused startup and full service gates**

Run:

~~~powershell
pnpm --filter @yunqi/service test -- tests/startup.test.ts
pnpm --filter @yunqi/service test
pnpm --filter @yunqi/service typecheck
pnpm --filter @yunqi/service test:typecheck
pnpm --filter @yunqi/service build
pnpm --filter @yunqi/service test:coverage
pnpm --filter @yunqi/service openapi:lint
pnpm --filter @yunqi/service openapi:check
~~~

Expected: all pass; coverage meets configured thresholds; server listens on an ephemeral port.

- [ ] **Step 7: Commit startup and CI integration**

~~~powershell
git add package.json pnpm-lock.yaml packages/yunqi-service/package.json packages/yunqi-service/src/server-config.ts packages/yunqi-service/src/server.ts packages/yunqi-service/src/index.ts packages/yunqi-service/tests/startup.test.ts packages/yunqi-service/README.md
git commit -m "feat(yunqi-service): integrate startup and CI gates"
~~~

### Task 8: Requirement-by-requirement completion audit

**Files:**
- Verify only; modify the smallest relevant Phase 2-A file if a gate exposes a gap.

**Interfaces:**
- Consumes: the prompt, approved design, generated artifacts, tests, and command output
- Produces: evidence that every Definition of Done item is achieved

- [ ] **Step 1: Run the exact root acceptance commands**

Run separately so each result is independently attributable:

~~~powershell
npm test
npm run typecheck
npm run build
npm run test:coverage
npm run openapi:validate
npm run schema:validate
~~~

Expected: every command exits 0. Do not summarize a partial subset as CI green.

- [ ] **Step 2: Verify real runtime and public routes**

Build and start the service on an ephemeral or explicitly free port, request:

~~~text
GET /health
GET /api/v1/yunqi/year/2024
GET /api/v1/yunqi/current
POST /api/v1/yunqi/calculate with 2024-05-20T21:00:00
GET /docs/
GET /docs/yaml
~~~

Expected: all success endpoints return the documented envelope; docs endpoints are reachable; stop the server cleanly.

- [ ] **Step 3: Audit prompt artifacts and safety boundaries**

Run:

~~~powershell
Test-Path packages/yunqi-service/openapi/yunqi-service.openapi.yaml
Test-Path packages/yunqi-service/src/contracts/yunqi-api.ts
Test-Path packages/yunqi-service/src/contracts/yunqi-types.ts
Test-Path packages/yunqi-service/src/contracts/generated-client.ts
rg -n "诊断|疾病判断|治疗建议|个体预测|处方|方剂|中药|剂量|用药|预后" packages/yunqi-service/src packages/yunqi-service/openapi
git diff 54872c1..HEAD -- packages/yunqi-domain
git status --short --untracked-files=all
~~~

Expected:

- all Test-Path calls print True;
- prohibited-term matches occur only in deliberate safety tests or documentation warnings, never response schemas/examples or route output;
- the Domain diff is empty;
- no dist, coverage, or temporary generation output is tracked;
- the three original untracked user files remain untouched unless the user separately asks to commit them.

- [ ] **Step 4: Review the OpenAPI and client evidence**

Confirm manually and through tests:

- OpenAPI version is 3.1.0;
- all four paths, component schemas, examples, version metadata, and 400/503/500 responses exist;
- representative Fastify responses validate against OpenAPI;
- generated-client.ts is current and machine-generated;
- yunqiClient.getYear(2024), Fetch, Axios-compatible transport, and query options compile;
- every route response is produced from a mapper-created DTO.

- [ ] **Step 5: Request final code review**

Invoke superpowers:requesting-code-review against the full implementation diff. Address any P0-P2 correctness, contract, safety, or test-coverage issue; rerun the affected focused test and all root gates afterward.

- [ ] **Step 6: Record final evidence**

Create docs/superpowers/verification/2026-07-16-yunqi-service-phase2a.md containing:

- commit range and files delivered;
- exact command results and coverage totals;
- runtime endpoint smoke results;
- OpenAPI/client drift results;
- proof that packages/yunqi-domain is unchanged;
- any intentionally retained limitations, especially year range and ambiguous local-time rejection.

Commit only the verification document and any necessary final fixes:

~~~powershell
git add docs/superpowers/verification/2026-07-16-yunqi-service-phase2a.md
git commit -m "docs(yunqi-service): record Phase 2-A verification"
~~~
