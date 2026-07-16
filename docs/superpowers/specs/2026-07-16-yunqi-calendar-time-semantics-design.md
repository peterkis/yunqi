# YunQi Fixed Beijing Time Semantics Design

## Status and authority

This design defines the approved Phase 2-A.1 time-semantic revision for the
YunQi repository. It supersedes Phase 2-A statements that describe
`Asia/Shanghai` as an IANA time zone or that treat `YunQiInstant` as the only
domain time meaning.

The user approved the design on 2026-07-16 with these controlling decisions:

- YunQi business time is fixed Beijing Standard Time, UTC+08:00.
- Historical IANA `Asia/Shanghai` rules and 1986-1991 daylight-saving time do
  not participate in YunQi calculations.
- `YunQiCalendarTime` is the authoritative dated-calculation model.
- `calculateYunQiByCalendarTime()` is the authoritative calculation entry.
- `calculateYunQi(YunQiInstant)` remains only as a compatibility wrapper.
- Phase 1 rules and tyme4ts solar-term results remain authoritative.
- `CalendarProvider` continues to return `YunQiInstant`.
- The normalizer is implemented under
  `packages/yunqi-service/src/modules/time-normalizer`; this phase does not
  create `apps/api` or migrate the repository architecture.

If an older document conflicts with this specification, this specification
controls Phase 2-A.1 implementation.

## Problem statement and root cause

The current system combines two different interpretations under the same
`Asia/Shanghai` name:

- Domain and the tyme4ts adapter use fixed UTC+08:00 arithmetic.
- Service local-time parsing uses IANA `Asia/Shanghai`, including historical
  daylight-saving transitions.

The Service then collapses all parsed input directly into
`YunQiInstant(epochMilliseconds)`, discarding the local calendar fields before
the Domain call. Domain reconstructs Beijing fields from the instant and
performs year and six-step selection using epoch comparisons.

This is semantically lossy and is observably incorrect for historical DST
years. For example, the real 1991 小满 boundary is represented by the current
provider as `1991-05-21T21:20:14+08:00`. IANA parsing interprets the suffix-free
input `1991-05-21T21:20:14` with the historical `+09:00` offset, one hour before
the provider boundary, while explicit `+08:00` reaches the exact boundary.
Those two forms can therefore select different six-step results.

The revision fixes the source of the mismatch: every accepted input is
normalized to one fixed UTC+08:00 business-time model before calculation.

## Goals

Phase 2-A.1 must:

1. make fixed Beijing Standard Time UTC+08:00 an explicit domain semantic;
2. retain an absolute instant for transport, audit, ordering, and compatibility;
3. preserve all Phase 1 rule tables and tyme4ts solar-term values;
4. make one calculation path authoritative;
5. produce identical results in different server/default-time-zone
   environments;
6. update the API time DTO without changing paths or request envelope shape;
7. document the time model as a project-wide architectural constraint; and
8. prevent the retired IANA/DST interpretation from flowing back into Domain.

## Non-goals

This phase does not:

- create `apps/api`;
- reorganize health, YunQi routes, schemas, or mappers into a new application
  architecture;
- add database persistence;
- add UI behavior;
- change solar-term algorithms;
- change five-movement, six-qi, host/guest, or boundary rules;
- restore historical civil-government DST adjustments; or
- make Domain depend on an external calendar or time library.

It does freeze the downstream persistence and React display contracts even
though database and UI implementation remain outside Phase 2-A.1.

## Normative time semantics

The project-wide business-time standard is:

```text
Name: Beijing Standard Time
Offset: UTC+08:00
Calendar time standard literal: BeijingStandardTime+08:00
Instant offset literal: +08:00
```

The string `Asia/Shanghai` is not a business-time identifier in the revised
system. It may appear only in migration documentation or negative tests that
prove the retired behavior is not used.

Historical daylight-saving time from 1986 through 1991 is deliberately
excluded:

> YunQi calculations use fixed Beijing Standard Time UTC+08:00. Historical
> social daylight-saving adjustments do not participate in solar-term or
> six-step interpretation. This policy keeps traditional calendar results
> continuous, consistent, and reproducible.

## Architecture

```text
API input
  -> Business Time Normalizer
  -> YunQiCalendarTime (fixed UTC+08:00)
  -> calculateYunQiByCalendarTime()
  -> Domain result
  -> Mapper
  -> API DTO
```

Solar-term dependency flow remains:

```text
tyme4ts
  -> Tyme4tsAdapter
  -> CalendarProvider
  -> YunQiInstant
  -> yunqi-domain
```

Dependency direction remains:

```text
yunqi-service
  -> yunqi-domain
```

The inverse dependency is forbidden.

## Domain time models

Domain defines the following immutable public models:

```ts
export type BeijingStandardOffset = '+08:00';

export type CalendarTimeStandard =
  'BeijingStandardTime+08:00';

export interface YunQiInstant {
  readonly epochMilliseconds: number;
  readonly offset: BeijingStandardOffset;
}

export interface BeijingLocalDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export interface YunQiCalendarTime {
  readonly localDateTime: BeijingLocalDateTime;
  readonly calendarTimeStandard:
    CalendarTimeStandard;
  readonly instant: YunQiInstant;
}
```

The public `YunQiInstant` name is retained, but its normative definition is
`BeijingStandardTime+08:00 Absolute Representation`. It is not a civil
timezone instant, is not a civil time-zone model, and is not the authoritative
calendar meaning. It is the fixed Beijing Standard Time model's absolute
transport and audit representation.
`epochMilliseconds` exists only for:

- ordering;
- transport;
- persistence;
- audit;
- compatibility; and
- consistency checks.

It must not become the sole source for YunQi year or six-step boundary
selection. In particular, consumers must not reinterpret
`epochMilliseconds` through UTC, an IANA zone, the server local zone, or DST
and then use that reinterpretation as YunQi calendar semantics.

规范声明：

> `epochMilliseconds` 仅作为固定北京时间模型下的绝对表示，用于排序、传输、
> 持久化、审计与兼容，不作为五运六气边界判断的唯一依据。

The old `timezone: 'Asia/Shanghai'` property is removed. Domain production
code, Domain tests, and Domain fixtures must not use:

- `Date`;
- `new Date()`;
- `Date.parse()`;
- `Temporal`;
- `Intl.DateTimeFormat()`;
- IANA time-zone names; or
- a time-zone database.

Domain performs Gregorian conversion with deterministic integer arithmetic.

## Domain factories and invariants

Domain exposes:

```ts
createYunQiInstant(
  epochMilliseconds: number,
): YunQiInstant

createYunQiCalendarTime(
  localDateTime: BeijingLocalDateTime,
): YunQiCalendarTime

createYunQiCalendarTimeFromInstant(
  instant: YunQiInstant,
): YunQiCalendarTime

assertYunQiInstant(
  value: unknown,
  context?: string,
): asserts value is YunQiInstant

assertYunQiCalendarTime(
  value: unknown,
  context?: string,
): asserts value is YunQiCalendarTime
```

No normal public constructor accepts an arbitrary
`{ localDateTime, instant }` pair. This prevents consumers from manufacturing
an inconsistent aggregate.

### Factory validation: always enabled

Factory validation is mandatory and cannot be disabled. It verifies:

- safe-integer epoch milliseconds;
- exact `offset: '+08:00'`;
- finite integer local fields;
- Gregorian month and day validity, including leap years;
- hour `0..23`;
- minute and second `0..59`;
- millisecond `0..999`;
- exact local-field-to-instant consistency under fixed UTC+08:00;
- exact instant-to-local-field round trip; and
- immutability of the aggregate and nested objects.

### Deep assertion: caller-configurable invocation

`assertYunQiCalendarTime()` always performs deep validation when invoked,
including a complete fixed-offset round trip. Whether a production composition
invokes this redundant diagnostic assertion is configurable by the caller.

Domain does not read `process.env`, configuration files, or runtime mode.
Tests, CI, development, and debugging invoke the deep assertion explicitly.
Production values created by Domain factories remain valid because factory
validation is always enabled.

Calculation entry points still perform mandatory lightweight structural checks
needed for safe operation. No configuration can change calculation semantics.

## Authoritative calculation path

Domain adds:

```ts
export interface YunQiCalendarResult
  extends YunQiYearResult {
  readonly input: YunQiCalendarTime;
  readonly currentStep: SixQiStep;
}

export function calculateYunQiByCalendarTime(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): YunQiCalendarResult
```

`calculateYunQiByCalendarTime()` is the only implementation of dated YunQi
calculation.

Its flow is:

1. validate the mandatory CalendarTime structure;
2. take the candidate civil year from `input.localDateTime.year`;
3. obtain the relevant 大寒 instant from `CalendarProvider`;
4. convert the provider instant to fixed Beijing CalendarTime;
5. compare canonical local-field tuples to resolve the YunQi year;
6. calculate the unchanged annual facts and provider boundaries;
7. project each boundary instant to fixed Beijing CalendarTime;
8. choose the six-step interval using local calendar tuples with
   left-closed/right-open semantics; and
9. return the original `YunQiCalendarTime` as the authoritative input.

The canonical comparison tuple is:

```text
year, month, day, hour, minute, second, millisecond
```

Instant values remain available for consistency checks, transport, audit,
sorting, and compatibility. They are not the sole time meaning.

### Compatibility wrapper

The existing entry remains:

```ts
export function calculateYunQi(
  input: YunQiInstant,
  provider: CalendarProvider,
): YunQiResult
```

It must contain no independent year or step calculation. Its required flow is:

```text
YunQiInstant
  -> createYunQiCalendarTimeFromInstant()
  -> calculateYunQiByCalendarTime()
  -> compatibility result adapter
```

The returned compatibility result retains the original `YunQiInstant` input
type and object identity. This preserves current Domain consumers while keeping
one calculation implementation.

The public `resolveYunQiYear(YunQiInstant)` and
`getCurrentStep(YunQiInstant)` compatibility surfaces may remain, but they must
delegate through the CalendarTime calculation path and must not contain a
second boundary algorithm.

`calculateYearYunQi()` remains unchanged apart from the `YunQiInstant` field
shape migration.

## CalendarProvider and adapter

The provider contract remains:

```ts
export interface CalendarProvider {
  getSolarTermInstant(
    year: number,
    term: SolarTerm,
  ): YunQiInstant;
}
```

No CalendarTime-returning provider is introduced in this phase.

`CalendarProvider` supplies solar-term instants only. It must not decide:

- the YunQi year;
- the current six-qi step;
- whether an input owns a boundary;
- left-closed/right-open interval semantics; or
- any five-movement, six-qi, or host/guest rule.

Those decisions remain exclusively in Domain. A provider result is not the
final business-time interpretation; Domain first projects it into fixed
Beijing CalendarTime and then applies the unchanged YunQi rules.

tyme4ts remains an external solar-term calculator, not a time-semantic manager.
The adapter:

- asks tyme4ts for the authoritative solar-term calendar fields;
- interprets those fields as fixed UTC+08:00;
- converts them deterministically to epoch milliseconds;
- returns `{ epochMilliseconds, offset: '+08:00' }`; and
- never exposes tyme4ts types to Domain.

Existing exact solar-term epochs, including the 2024 大寒 epoch
`1705759642000`, must not change.

## Service module location and responsibilities

The logical Business Time Normalizer is implemented at:

```text
packages/yunqi-service/src/modules/time-normalizer/
  parser.ts
  normalizer.ts
  formatter.ts
  index.ts
```

`apps/api` must not be created.

### `parser.ts`

Responsibilities:

- recognize the approved lexical formats;
- extract numeric calendar fields and the explicit form kind;
- reject malformed syntax and unsupported precision; and
- perform no YunQi calculation.

### `normalizer.ts`

Responsibilities:

- interpret suffix-free input as fixed UTC+08:00;
- normalize `+08:00` input directly;
- normalize `Z` input to its equivalent fixed UTC+08:00 local fields;
- create Domain `YunQiCalendarTime`; and
- avoid server/default-time-zone behavior.

### `formatter.ts`

Responsibilities:

- format fixed Beijing local fields as canonical `localTime`;
- preserve millisecond precision; and
- provide the stable shape consumed by API mappers.

### `index.ts`

Responsibilities:

- expose only the stable normalizer and formatter API;
- hide parser internals; and
- export only types required by Service composition.

The module must not:

- calculate YunQi;
- calculate solar terms;
- access rule tables;
- access a database;
- call tyme4ts;
- use IANA zones;
- use the server local time zone; or
- use `Date.parse()`.

All API time conversion must pass through this module. Controllers, DTO
mappers, serializers, and route handlers must not:

- construct a `Date` object for YunQi business time;
- call `Date.parse()`;
- call `toISOString()` as a YunQi calendar conversion;
- use Temporal or Intl for YunQi business-time interpretation; or
- reconstruct local calendar fields independently.

Mappers may call the normalizer's approved formatter/conversion API. They must
not contain a second implementation. A static Service-layer gate covers
controllers, routes, mappers, serializers, and DTO/schema production code.

The approved implementation removes the Service dependency on
`@js-temporal/polyfill`. The normalizer uses strict lexical parsing and
deterministic Gregorian/fixed-offset arithmetic, not `Date`, Temporal, Intl, or
tzdb behavior.

The existing `src/services/date-time.ts` must not remain as a second parser. It
is removed, or retained only as a temporary re-export with no implementation.

## Input normalization contract

The accepted forms are exactly:

```text
YYYY-MM-DDTHH:mm:ss
YYYY-MM-DDTHH:mm:ss.SSS
YYYY-MM-DDTHH:mm:ss+08:00
YYYY-MM-DDTHH:mm:ss.SSS+08:00
YYYY-MM-DDTHH:mm:ssZ
YYYY-MM-DDTHH:mm:ss.SSSZ
```

Other numeric offsets are rejected in Phase 2-A.1. Fractional seconds, when
present, contain exactly three digits.

The following representative variants are explicitly rejected:

```text
2026-01-01T12:00:00+0800
2026-01-01 12:00:00
2026/01/01 12:00:00
```

The parser must not silently broaden the contract to basic ISO offsets, a
space-separated date and time, slash-separated dates, locale formats, or
implementation-defined input.

These inputs must produce an identical CalendarTime:

```text
2026-01-01T12:00:00
2026-01-01T12:00:00+08:00
2026-01-01T04:00:00Z
```

Normalization rules:

- suffix-free fields are already Beijing Standard Time fields;
- `+08:00` fields are already Beijing Standard Time fields;
- `Z` fields identify a UTC instant and are projected forward eight hours into
  Beijing Standard Time;
- invalid Gregorian dates are rejected;
- no DST gap or overlap exists in this fixed-offset business model; and
- formerly ambiguous/nonexistent IANA `Asia/Shanghai` examples from 1986-1991
  are valid when their Gregorian fields are otherwise valid.

`POST /api/v1/yunqi/calculate` keeps the request shape:

```json
{
  "dateTime": "2026-01-01T12:00:00"
}
```

`GET /api/v1/yunqi/current` uses an isolated runtime clock. The process may
obtain current epoch milliseconds from `Date.now` or an injected equivalent,
but that is the clock's only responsibility. The epoch is immediately passed
through the approved fixed-offset normalization path:

```text
runtime clock
  -> epochMilliseconds
  -> YunQiInstant
  -> YunQiCalendarTime
  -> calculateYunQiByCalendarTime()
```

No runtime time zone, `Date` calendar fields, IANA projection, or DST
adjustment may participate. The current route must not retain a parallel
calculation path.

## API time DTO

Every public calculation time value uses:

```ts
export interface YunQiCalendarTimeDto {
  readonly localTime: string;
  readonly epochMilliseconds: number;
  readonly offset: '+08:00';
  readonly calendarTimeStandard:
    'BeijingStandardTime+08:00';
}
```

Example:

```json
{
  "localTime": "2026-06-19T12:00:00+08:00",
  "epochMilliseconds": 1781841600000,
  "offset": "+08:00",
  "calendarTimeStandard": "BeijingStandardTime+08:00"
}
```

Canonical `localTime` formatting is:

- zero milliseconds: `YYYY-MM-DDTHH:mm:ss+08:00`;
- non-zero milliseconds: `YYYY-MM-DDTHH:mm:ss.SSS+08:00`.

The DTO replaces `YunQiInstantDto` at all API locations:

- calculation `input`;
- annual interval `start` and `end`; and
- every six-step `start` and `end`.

Annual and step boundaries still originate as provider `YunQiInstant` values.
The mapper converts them to CalendarTime and then to the DTO. Controllers never
perform calendar conversion or return Domain objects directly.

The following are removed from production schemas, generated client types,
examples, and responses:

```json
{
  "timezone": "Asia/Shanghai"
}
```

API paths, HTTP methods, success/error envelopes, and the `/calculate` request
property remain unchanged.

## Version separation

The version fields have distinct meanings:

```text
OpenAPI specification dialect:
  openapi: 3.1.0

OpenAPI contract document release:
  info.version: 1.1.0

API path version:
  /api/v1 (unchanged)

Rule version:
  YQ-MVP-RULES-1.0.0
```

`info.version: 1.1.0` does not create `/api/v1.1` and must not be described as
the path version.

The rule-version literal is normalized to `YQ-MVP-RULES-1.0.0`. No rule table,
mapping, calculation, or boundary behavior changes with that metadata update.

The Domain and Service packages move to version `1.1.0`. The tyme4ts adapter
also moves to `1.1.0` because its public `YunQiInstant` result shape changes.
All remain private workspace packages in this repository.

## Error behavior

Existing error precedence remains:

- request schema or malformed JSON -> 400 `INVALID_ARGUMENT`;
- time lexical/normalization failure -> 400 `INVALID_ARGUMENT`;
- expected Domain invalid input -> 400 `INVALID_ARGUMENT`;
- provider failure -> 503 `CALENDAR_PROVIDER_UNAVAILABLE`;
- unexpected internal failure -> sanitized 500 `INTERNAL_ERROR`.

The normalizer must not leak parser internals, input stack traces, or provider
messages.

## Single-direction migration rule

Phase 2-A.1 allows:

```text
legacy API input
  -> Business Time Normalizer
  -> YunQiCalendarTime
  -> new authoritative Domain path
```

It forbids:

```text
new Domain model
  -> IANA Asia/Shanghai compatibility behavior
  -> legacy time semantics
```

The compatibility `calculateYunQi(YunQiInstant)` wrapper is an API adapter into
the new core. It is not permission to reintroduce instant-only or IANA-based
calculation.

No new production model may contain `timezone: 'Asia/Shanghai'`.

## Documentation and governance

The architecture decision is registered as:

```text
docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md
```

That ADR records:

- the normative fixed UTC+08:00 definition;
- the distinction from IANA `Asia/Shanghai`;
- the historical-DST exclusion;
- the dual time model and invariants;
- Service, Adapter, and Domain responsibilities;
- the one-way migration rule;
- database guidance; and
- frontend display guidance.

The persistence contract is normative and frozen:

```text
calendar_time_local varchar
epoch_ms bigint
offset char(6)
calendar_time_standard varchar
```

- `calendar_time_local` stores canonical fixed-Beijing display/audit meaning;
- `epoch_ms` is the absolute transport/audit representation;
- `offset` is constrained to `+08:00`;
- `calendar_time_standard` is constrained to
  `BeijingStandardTime+08:00`; and
- `timestamp with time zone` or `timestamptz` may be only a derived query aid,
  never the sole or authoritative calendar field.

The React/Next display contract is normative and frozen:

- display `北京时间 UTC+08`;
- render canonical `localTime` or use a formatter that operates only on
  canonical fixed-Beijing fields/strings;
- forbid `new Date(result.epochMilliseconds)`;
- forbid Date, Temporal, Intl, IANA, browser-local, ISO, or locale
  reinterpretation of YunQi business time; and
- reserve frontend `epochMilliseconds` for ordering, cache keys, audit, and
  compatibility.

`AGENTS.md` contains the mandatory project constraint:

> 本项目五运六气计算统一采用固定北京时间 UTC+08:00。禁止使用 IANA
> `Asia/Shanghai` 历史时区规则、服务器本地时区或 DST 调整作为业务计算依据。
> 同一输入必须在不同运行环境得到完全一致结果。

The Domain, adapter, and Service READMEs are updated to match the architecture
document.

## Testing strategy

Implementation follows red-green-refactor. Regression tests must fail for the
current semantic gap before production changes are written.

### Domain model tests

Verify:

- valid fixed-offset CalendarTime creation;
- instant-to-local and local-to-instant round trips;
- leap years and invalid Gregorian dates;
- field ranges;
- millisecond precision;
- unsafe epoch rejection;
- exact offset and standard literals;
- aggregate and nested immutability;
- factory rejection of invalid local fields and invalid instants; and
- deep assertion rejection of forged or inconsistent aggregates.

### Domain purity gate

A deterministic static gate scans Domain source, tests, and fixtures and fails
on:

- `Date`;
- `new Date`;
- `Date.parse`;
- `Temporal`;
- `Intl.DateTimeFormat`; or
- IANA time-zone identifiers.

The gate is part of normal repository verification rather than an optional
manual audit.

### Service time-boundary purity gate

A deterministic static gate scans production controllers, routes, DTO/schema
code, mappers, serializers, and time-normalizer call sites. It fails when
YunQi business-time conversion is implemented outside the normalizer,
including construction of `Date` objects, `Date.parse()`, `toISOString()`,
Temporal, Intl time-zone conversion, or IANA identifiers.

The runtime clock composition may reference `Date.now` only as an epoch source.
That allowed clock reference is narrowly excluded from the conversion ban and
must feed immediately into `YunQiInstant` and `YunQiCalendarTime`.

### Downstream governance gate

A root Node.js gate verifies the normative ADR/AGENTS/Domain naming text and
discovers future React/Next workspaces from package dependencies. Across each
frontend workspace's source it rejects Date, Temporal, Intl, IANA,
browser-local, ISO, or locale reinterpretation, including conversion hidden
behind a helper that does not mention the DTO field name. Canonical
`localTime` rendering and pure fixed-Beijing string formatting remain allowed.

### Calculation-entry tests

Verify:

- `calculateYunQiByCalendarTime()` performs the dated calculation;
- `calculateYunQi()` delegates through CalendarTime;
- the compatibility result retains the original instant identity;
- both entries return identical rule, year, step, and boundary facts; and
- no second year/step algorithm remains in the compatibility wrapper.

### Boundary tests

Keep existing `-1 ms`, exact, and `+1 ms` real-provider coverage.

Add the explicit specification cases:

```text
2024-01-20T22:07:21+08:00 -> 2023 / 终之气
2024-01-20T22:07:22+08:00 -> 2024 / 初之气
2024-01-20T22:07:23+08:00 -> 2024 / 初之气
```

Run equivalent suffix-free and `Z` forms through the Service normalizer.

### Historical-DST regression tests

For real 1991 小满 and 大暑 boundaries, verify that suffix-free, `+08:00`, and
`Z` inputs produce:

1. the same `localTime`;
2. the same `epochMilliseconds`;
3. the same `offset`;
4. the same `calendarTimeStandard`;
5. the same YunQi year; and
6. the same six-step result.

This prevents a coincidentally equal final result from hiding an incorrect
intermediate time model.

The old IANA gap/overlap rejection tests are replaced with tests showing those
valid Gregorian wall times are accepted under fixed UTC+08:00.

### Environment-independence tests

A controller starts separate Node processes with:

```text
TZ=UTC
TZ=Asia/Shanghai
```

Each process imports the built Service, Domain, and real adapter and emits a
deterministic snapshot covering:

- the effective process environment;
- local, `+08:00`, and `Z` normalization;
- the complete CalendarTime object;
- real 2024 大寒;
- before/exact/after year and step selection;
- the 1991 regressions; and
- the API DTO.

The controller compares the business snapshots byte-for-byte. The effective
process-zone metadata may differ and is excluded from the equality payload.
Both child processes must exit zero.

Changing `process.env.TZ` inside one already-running test process is not
sufficient evidence.

### Service and contract tests

Verify:

- unchanged paths and request shapes;
- updated CalendarTime DTO at every response time field;
- no `timezone: 'Asia/Shanghai'` in production responses;
- OpenAPI `3.1.0`;
- contract document release `1.1.0`;
- unchanged `/api/v1` paths;
- rule version `YQ-MVP-RULES-1.0.0`;
- regenerated browser client types;
- DTO mapper copies and does not leak Domain objects;
- generated YAML and TypeScript client have zero drift; and
- existing error and medical-safety boundaries remain green.

## Verification gates

Completion requires fresh successful runs of:

```text
pnpm install --frozen-lockfile
npm test
npm run typecheck
npm run build
npm run test:coverage
npm run openapi:validate
npm run schema:validate
npm run test:time-governance
```

It also requires:

- Domain time-purity gate;
- two-process timezone-independence gate;
- real production-entry smoke;
- checked-in OpenAPI/client drift check;
- `git diff --check`;
- inspection that no generated `dist`, coverage, or temporary artifact is
  tracked; and
- an independent final code and contract review.

## Expected file scope

Likely Domain changes:

```text
packages/yunqi-domain/src/calendar/time.ts
packages/yunqi-domain/src/calendar/yunqi-year-resolver.ts
packages/yunqi-domain/src/services/calculate-yunqi.ts
packages/yunqi-domain/src/services/get-current-step.ts
packages/yunqi-domain/src/types.ts
packages/yunqi-domain/src/index.ts
packages/yunqi-domain/src/rules/phase1-rules.ts
packages/yunqi-domain/tests/**
packages/yunqi-domain/scripts/check-time-purity.mjs
packages/yunqi-domain/package.json
packages/yunqi-domain/README.md
```

Likely adapter changes:

```text
packages/calendar-adapters/tyme4ts/src/**
packages/calendar-adapters/tyme4ts/tests/**
packages/calendar-adapters/tyme4ts/package.json
packages/calendar-adapters/tyme4ts/README.md
```

Likely Service changes:

```text
packages/yunqi-service/src/modules/time-normalizer/**
packages/yunqi-service/src/services/date-time.ts
packages/yunqi-service/src/services/yunqi-service.ts
packages/yunqi-service/src/routes/yunqi.ts
packages/yunqi-service/src/schemas/**
packages/yunqi-service/src/mappers/**
packages/yunqi-service/src/contracts/generated-client.ts
packages/yunqi-service/openapi/yunqi-service.openapi.yaml
packages/yunqi-service/tests/**
packages/yunqi-service/scripts/**
packages/yunqi-service/package.json
packages/yunqi-service/README.md
```

Already registered before production-code implementation:

```text
AGENTS.md
docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md
docs/superpowers/specs/2026-07-16-yunqi-calendar-time-semantics-design.md
```

Implementation verification and root wiring:

```text
docs/superpowers/verification/2026-07-16-yunqi-calendar-time-semantics.md
package.json
pnpm-lock.yaml
```

The implementation phase audits the three registered governance artifacts and
changes them only if a later explicitly approved correction requires it.

The exact implementation diff may be narrower. No unrelated route, module, or
repository-layout migration is authorized.

## Definition of done

Phase 2-A.1 is complete only when:

- fixed Beijing Standard Time UTC+08:00 is explicit in Domain;
- `YunQiCalendarTime` is the authoritative dated-calculation model;
- `calculateYunQiByCalendarTime()` is the only dated calculation
  implementation;
- the instant entry is a compatibility wrapper;
- Domain source, tests, and fixtures are independent of Date, Temporal, Intl,
  IANA, and tzdb;
- the provider contract remains unchanged apart from the approved
  `YunQiInstant` field shape;
- `YunQiInstant.epochMilliseconds` remains transport/audit data and is not the
  sole calendar comparison source;
- CalendarProvider supplies solar-term instants and owns no YunQi year,
  six-step, or interval-boundary semantics;
- Phase 1 rules and tyme4ts solar-term epochs are unchanged;
- 2024 大寒 before/exact/after behavior is unchanged;
- 1991 local, `+08:00`, and `Z` inputs produce identical intermediate models
  and results;
- `TZ=UTC` and `TZ=Asia/Shanghai` processes produce identical business
  snapshots;
- API paths and request shape remain unchanged;
- controllers, routes, mappers, serializers, and DTO/schema code perform no
  independent Date/Temporal/IANA conversion;
- persistence uses the frozen four-field minimum tuple and no database
  time-zone field is authoritative;
- React/Next renders canonical `localTime` without runtime time-zone
  reinterpretation;
- the runtime clock is isolated to producing epoch milliseconds before
  immediate CalendarTime normalization;
- every public time DTO uses the new fixed Beijing shape;
- OpenAPI and generated client are current with zero drift;
- `docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md` and
  `AGENTS.md` contain the project-wide rule;
- all root acceptance gates pass; and
- an independent review reports no unresolved critical or important finding.
