# YQ-API-CONTRACT-1.0.0

- Status: Frozen
- Effective date: 2026-07-17
- API path version: `/api/v1`
- OpenAPI dialect: `3.1.0`
- OpenAPI document version: `1.2.0`
- Rule version: `YQ-MVP-RULES-1.0.0`
- Architecture decision:
  `docs/architecture/ADR-002-yunqi-contract-freeze.md`
- Machine baseline:
  `packages/yunqi-contracts/contract/YQ-API-CONTRACT-1.0.0.freeze.json`
- Contract ID registry:
  `packages/yunqi-contracts/contract/registry.json`

## Contract scope

This ID freezes exactly:

```text
GET  /api/v1/yunqi/year/{year}
GET  /api/v1/yunqi/current
POST /api/v1/yunqi/calculate
```

`GET /health` remains part of the generated OpenAPI document and its drift
checks, but it is outside this business Contract ID.

## Common envelopes

Success:

```ts
interface YearSuccessResponse {
  readonly code: 'SUCCESS';
  readonly message: '';
  readonly data: YunQiYearDto;
}

interface CalculationSuccessResponse {
  readonly code: 'SUCCESS';
  readonly message: '';
  readonly data: YunQiCalculationDto;
}
```

Error:

```ts
interface ApiErrorResponse {
  readonly code:
    | 'INVALID_ARGUMENT'
    | 'CALENDAR_PROVIDER_UNAVAILABLE'
    | 'INTERNAL_ERROR';
  readonly message: string;
  readonly details: Readonly<Record<string, unknown>>;
}
```

All three business operations expose `400`, `500`, and `503` error responses.
Successful annual and calculation responses use status `200`.

## Request

```ts
interface CalculateRequest {
  readonly dateTime: string;
}
```

The exact validation pattern is:

```text
^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|\+08:00)?$
```

The service normalizer remains responsible for Gregorian validity and fixed
Beijing interpretation under ADR-001.

## Time DTO

OpenAPI defines one time component:

```ts
interface YunQiTimeDto {
  readonly localTime: string;
  readonly epochMilliseconds: number;
  readonly offset: '+08:00';
  readonly calendarTimeStandard: 'BeijingStandardTime+08:00';
}
```

Constraints:

- `localTime` is canonical fixed Beijing time ending in `+08:00`;
- `epochMilliseconds` is a safe integer absolute representation for transport,
  ordering, persistence, audit, compatibility, and consistency validation;
- `offset` is exactly `+08:00`;
- `calendarTimeStandard` is exactly
  `BeijingStandardTime+08:00`;
- no `timezone` field exists.

TypeScript semantic aliases:

```ts
type YunQiCalculationInputTimeDto = YunQiTimeDto;
type YunQiBoundaryTimeDto = YunQiTimeDto;
```

These aliases are not separate OpenAPI schemas.

## Stable DTO facade

The public facade exports:

```text
StemBranchDto
SuiYunDto
HostGuestRelationDto
SixQiStepDto
SixQiDto
YunQiIntervalDto
YunQiYearDto
YunQiCalculationDto
CalculateRequest
YearSuccessResponse
CalculationSuccessResponse
ApiErrorResponse
YunQiTimeDto
YunQiCalculationInputTimeDto
YunQiBoundaryTimeDto
```

`SixQiStepDto.start` and `SixQiStepDto.end` use
`YunQiBoundaryTimeDto`.

`SixQiDto.steps` is a readonly six-element tuple in the TypeScript facade. The
wire schema enforces `minItems: 6` and `maxItems: 6`.

The calculation shape is:

```ts
interface YunQiCalculationDto extends YunQiYearDto {
  readonly input: YunQiCalculationInputTimeDto;
  readonly currentStep: SixQiStepDto;
}
```

`input` means the canonical fixed-Beijing input actually used for this YunQi
calculation. Frontend display uses:

```ts
result.input.localTime
```

The contract does not contain `result.calendarTime` or
`result.input.timezone`.

## Versioned response model

`YunQiYearDto` freezes:

```text
ruleVersion
year
stemBranch
interval
suiYun
sixQi
explanations
```

`YunQiCalculationDto` adds:

```text
input
currentStep
```

The accepted wire values, enums, bounds, required fields, and
`additionalProperties: false` settings are defined by the machine freeze
baseline and generated OpenAPI document.

## Freeze governance

The machine projection freezes:

- path, method, operationId, parameters, request body;
- response statuses and schema references;
- every reachable business DTO;
- schema names, types, formats, enums, constants, required fields;
- numeric, string, and array validation constraints;
- item structure and `additionalProperties`;
- OpenAPI dialect, document version, and Contract ID.

It intentionally excludes descriptions, examples, tags, server URLs, JSON
property order, and `/health`.

If any included value changes:

1. choose a new Contract ID;
2. evaluate package SemVer compatibility;
3. update this record and create a new machine baseline;
4. update generated artifacts, tests, migration notes, and consumers.

`contracts:freeze` refuses to overwrite
`YQ-API-CONTRACT-1.0.0.freeze.json` when the current projection differs while
the Contract ID remains `YQ-API-CONTRACT-1.0.0`. It also refuses a tampered
embedded ID or a missing baseline for an ID already present in the append-only
registry. Both `contracts:check` and `contracts:freeze` compare the current
registry with every historical registry revision in the full Git history,
require every historical ID to remain registered, validate every registered
baseline, reject unregistered freeze files, and compare historical baselines
with their first registered canonical content.
