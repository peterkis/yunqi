# YunQi Service Phase 2-A Design

## Status and authority

This design implements `codex/prompts/Phase2-A_yunqi-service_Fastify_OpenAPI_JSONSchema_React_Contract_Prompt.md` on top of the accepted Phase 1 packages. The user approved the design on 2026-07-16 with one explicit revision: `POST /api/v1/yunqi/calculate` accepts both hospital-local date-time strings interpreted in `Asia/Shanghai` and RFC 3339 strings carrying `Z` or an explicit offset.

If this document and the earlier generic API note disagree, this versioned Phase 2-A design controls the Phase 2-A implementation. Existing domain rules, rule versions, and Phase 1 time-boundary semantics remain authoritative for calculation.

## Goal and scope

Create an independent `packages/yunqi-service` package that exposes the accepted YunQi domain capability through a stable, versioned HTTP and browser-consumable contract. Phase 2-A includes:

- Fastify 5 application and process entry point;
- complete request, response, and error JSON Schemas;
- OpenAPI 3.1 generation, checked-in YAML, validation, and Swagger UI;
- explicit Domain-to-API mappers;
- browser-safe generated types and a small typed client contract;
- API, boundary, schema, OpenAPI, client, and startup tests;
- root build, typecheck, test, and coverage gates.

It does not include a React page, persistence, authentication, intake workflows, diagnosis, treatment advice, individual prediction, or any new YunQi rule.

## Selected approach

Use runtime-schema-first contract generation:

1. Reusable TypeBox JSON Schemas are the source of truth for HTTP shapes.
2. Fastify attaches those full schemas to every route for runtime validation and response serialization.
3. `@fastify/swagger` derives OpenAPI 3.1 from the registered schemas and routes.
4. A deterministic generation script writes `openapi/yunqi-service.openapi.yaml`.
5. OpenAPI-generated path/component types feed the browser contract, while an ergonomic wrapper exposes the public YunQi client.

This minimizes drift between runtime validation, serialized responses, OpenAPI, and TypeScript. OpenAPI-first was rejected because it would require translating or duplicating schemas for Fastify. Independently hand-maintained DTO types, schemas, and client types were rejected because their drift risk conflicts with the contract-stability goal.

## Package and dependency boundaries

The new package has the following shape:

```text
packages/yunqi-service/
  src/
    app.ts
    server.ts
    routes/
    schemas/
    mappers/
    plugins/
    services/
    contracts/
      yunqi-api.ts
      yunqi-types.ts
      generated-client.ts
  openapi/
    yunqi-service.openapi.yaml
  scripts/
  tests/
  package.json
  tsconfig.json
  tsconfig.test.json
  vitest.config.ts
```

Dependency direction is one-way:

```text
React or other HTTP consumer
  -> browser-safe @yunqi/service contract subpath
  -> HTTP JSON
  -> @yunqi/service
  -> @yunqi/domain and @yunqi/calendar-adapter-tyme4ts
```

`@yunqi/domain` is not changed and never imports Fastify, TypeBox, OpenAPI, HTTP, or React types. The service may compose the approved calendar adapter because date parsing and real solar-term lookup are application-boundary responsibilities. Browser contract exports must not import server modules or Node-only dependencies.

## Application composition

`buildApp(options)` creates but does not listen on a Fastify instance. Its options include:

- `provider`: a `CalendarProvider`, defaulted only by the production composition;
- `now`: an injectable function returning the current absolute epoch time for deterministic `/current` tests;
- optional Fastify logger configuration.

`server.ts` supplies `tyme4tsCalendarProvider`, the system clock, host and port configuration, starts listening, and reports startup failures without embedding route logic.

Swagger must be registered before routes so every route is discoverable. Swagger UI is exposed under `/docs`; its JSON and YAML endpoints remain available for development and verification.

## HTTP response envelope

Every successful route, including health, uses:

```ts
interface SuccessResponse<T> {
  code: 'SUCCESS';
  message: '';
  data: T;
}
```

Every error uses:

```ts
interface ErrorResponse {
  code:
    | 'INVALID_ARGUMENT'
    | 'CALENDAR_PROVIDER_UNAVAILABLE'
    | 'INTERNAL_ERROR';
  message: string;
  details: Record<string, unknown>;
}
```

Error details may contain safe field-level validation information but never raw stack traces, internal exception objects, dependency messages, diagnosis, treatment advice, or prediction content.

## Stable API DTOs

Domain objects are never sent directly. Mappers allocate fresh API DTO objects with a stable nested shape:

```ts
interface YunQiInstantDto {
  epochMilliseconds: number;
  timezone: 'Asia/Shanghai';
}

interface YunQiYearDto {
  ruleVersion: string;
  year: number;
  stemBranch: {
    ganzhi: string;
    stem: HeavenlyStem;
    branch: EarthlyBranch;
  };
  interval: {
    start: YunQiInstantDto;
    end: YunQiInstantDto;
  };
  suiYun: SuiYunDto;
  sixQi: {
    sitian: Qi;
    zaiquan: Qi;
    steps: SixQiStepDto[];
  };
  explanations: string[];
}

interface YunQiCalculationDto extends YunQiYearDto {
  input: YunQiInstantDto;
  currentStep: SixQiStepDto;
}
```

`SixQiStepDto` preserves index, name, exact start/end instants, host Qi, guest Qi, and the complete structured host/guest relation. `ruleVersion` preserves the exact domain value, currently `V1.0-2026.7.7-implementation.1`; the mapper must not shorten it to the illustrative `V1.0` from the prompt. Arrays and nested values are copied rather than passed through by reference.

## Route contracts

### `GET /health`

Returns HTTP 200 with the success envelope and `{ status: 'ok', apiVersion: 'v1' }`. It does not call the provider and is suitable for process liveness checks.

### `GET /api/v1/yunqi/year/:year`

The path parameter is coerced and validated as an integer in the inclusive supported range 1901-2099. A valid request calls `calculateYearYunQi` with the injected provider and returns `YunQiYearDto`.

Non-integers and out-of-range years return HTTP 400 `INVALID_ARGUMENT`. The public range is deliberately limited to the range for which the real adapter already has boundary/property evidence; widening it requires new adapter evidence and a contract version decision.

### `GET /api/v1/yunqi/current`

The route reads the injected absolute clock, converts it to the domain instant, calls `calculateYunQi`, and returns `YunQiCalculationDto`. It accepts no client time input. Tests inject a fixed clock.

### `POST /api/v1/yunqi/calculate`

The body is a closed object:

```json
{
  "dateTime": "2024-05-20T21:00:00"
}
```

`dateTime` supports exactly two input families:

1. Hospital-local ISO date-time without a zone suffix, such as `2024-05-20T21:00:00` or `2024-05-20T21:00:00.123`. It is interpreted in the hospital default IANA time zone `Asia/Shanghai`.
2. RFC 3339 date-time carrying `Z` or a numeric offset, such as `2024-05-20T13:00:00Z` or `2024-05-20T21:00:00+08:00`.

Parsing is strict: invalid calendar fields, malformed offsets, unsupported precision, trailing text, and non-string values are rejected. A hospital-local wall time that is nonexistent or ambiguous under the zone database is rejected with `INVALID_ARGUMENT` and must be resubmitted with an explicit RFC 3339 offset. This prevents silent instant selection around historical offset transitions.

The service parses either form, resolves it to a unique `epochMilliseconds`, constructs the existing `YunQiInstant`, and only then calls Domain. Domain never parses a string, resolves a local time zone, or chooses an offset. Its existing `timezone: 'Asia/Shanghai'` field remains a domain label on the already-normalized instant; no new zone behavior is added to Domain.

## Error classification

The service wraps provider access so provider exceptions remain distinguishable from domain/input `RangeError` values:

- Fastify/JSON Schema validation failure -> HTTP 400 `INVALID_ARGUMENT`;
- local/RFC 3339 parsing failure -> HTTP 400 `INVALID_ARGUMENT`;
- Domain `RangeError` after normalized input -> HTTP 400 `INVALID_ARGUMENT`;
- injected provider failure, including provider-thrown `RangeError` -> HTTP 503 `CALENDAR_PROVIDER_UNAVAILABLE`;
- any other unexpected exception -> HTTP 500 `INTERNAL_ERROR`.

The 503 and 500 responses use safe generic messages. The original error is available only to server logging.

## JSON Schema and OpenAPI

Fastify 5 full JSON Schemas define params, body, every success response, and 400/503/500 errors. Objects default to `additionalProperties: false`; required properties, integer bounds, string patterns, enums, array sizes, and literal values are explicit.

The generated document must:

- declare OpenAPI `3.1.0` and API version metadata;
- include all four paths and operations;
- expose reusable component schemas;
- include successful and error examples;
- document 400, 503, and 500 responses where applicable;
- be accepted by an OpenAPI 3.1 validator;
- validate representative live Fastify responses against the referenced response schemas;
- be generated deterministically so CI can fail on YAML drift.

## React/browser contract

The package exposes a browser-safe contract subpath containing:

- `generated-client.ts`: machine-generated OpenAPI path and component types; never hand edited;
- `yunqi-types.ts`: stable ergonomic aliases for request, response, DTO, and error types derived from generated components;
- `yunqi-api.ts`: `createYunQiClient` and an optional default client facade with `getYear`, `getCurrent`, and `calculate` methods.

The client uses a small typed transport interface. A Fetch adapter is provided, and an Axios adapter accepts an Axios-compatible instance without coupling server modules to Axios. The public usage remains:

```ts
const result = await yunqiClient.getYear(2024);
```

TanStack Query compatibility is supplied through typed option factories containing stable query keys and promise-returning `queryFn` callbacks. This does not require building a React component or making React a server runtime dependency.

## Testing strategy

Implementation follows red-green-refactor. Required evidence includes:

1. API tests for health, a normal year, non-integer year, out-of-range year, local hospital time, `Z`, explicit offset, invalid date-time, and deterministic current time.
2. Boundary tests proving equivalent local, `Z`, and `+08:00` inputs resolve to the same instant, plus rejection of ambiguous/nonexistent local times when present in zone data.
3. Provider-failure tests proving provider exceptions become 503 while ordinary Domain `RangeError` becomes 400.
4. Mapper tests proving the nested DTO facts are correct, the exact rule version is preserved, arrays are copied, and no route returns the original Domain object.
5. Contract tests validating real responses against the generated OpenAPI response schemas and validating reusable JSON Schemas.
6. OpenAPI tests for version, metadata, paths, schemas, examples, error responses, validator acceptance, generated YAML freshness, and client-generation freshness.
7. Browser contract type tests for Fetch, Axios-compatible transport, TanStack Query option shapes, and automatic success/error inference.
8. A listen-on-ephemeral-port startup test and a close test.
9. Safety assertions rejecting prohibited diagnostic, disease-judgment, treatment, and individual-prediction fields or content.

## Repository and CI integration

`pnpm-workspace.yaml` registers `packages/yunqi-service`. Root scripts retain pnpm as the repository package manager while making the prompt's commands work:

```text
npm test
npm run typecheck
npm run build
npm run test:coverage
```

The root gates build dependencies in order, test all three packages, typecheck source and tests, run service coverage, validate schemas and OpenAPI, verify generated artifacts are current, and leave the worktree free of tracked build output.

## Definition of done

Phase 2-A is complete only when:

- `packages/yunqi-service` is independently buildable and testable;
- the real server can listen and close successfully;
- all four endpoints implement the versioned envelope and documented schemas;
- local `Asia/Shanghai` and RFC 3339 date-time inputs normalize to absolute instants before Domain calls;
- Domain core files and dependency boundary remain unchanged;
- every response passes through an explicit mapper;
- checked-in OpenAPI 3.1 YAML is valid and current;
- generated browser contracts compile and expose the required client usage;
- required API, contract, boundary, provider, startup, and safety tests pass;
- all four root acceptance commands pass.
