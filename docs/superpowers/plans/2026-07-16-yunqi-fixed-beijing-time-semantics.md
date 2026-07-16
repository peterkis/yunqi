# YunQi Phase 2-A.1 Fixed Beijing Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Use
> red-green-refactor for every behavioral change and keep each package's file
> ownership separate while parallel work is active.

**Goal:** Replace the mixed IANA/instant-only time semantics with the approved
fixed Beijing Standard Time UTC+08:00 model, make `YunQiCalendarTime` the
authoritative dated-calculation input, preserve Phase 1 rule behavior and
tyme4ts solar-term epochs, and publish the revised OpenAPI 1.1.0 contract.

**Architecture:** Domain owns immutable fixed-offset calendar models and the
only dated-calculation implementation. The tyme4ts adapter remains a
solar-term provider returning `YunQiInstant`. Service owns strict lexical
parsing, normalization, output formatting, runtime-clock composition, and API
mapping through `packages/yunqi-service/src/modules/time-normalizer`.

**Tech Stack:** Node.js 22, pnpm 10.32.1, TypeScript 7.0.2 strict ESM, Vitest
4.1.10, Fastify 5.10.0, TypeBox, OpenAPI 3.1, Redocly, Ajv, OpenAPI
TypeScript, tyme4ts 1.5.2.

**Normative references:**

- `docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md`
- `docs/superpowers/specs/2026-07-16-yunqi-calendar-time-semantics-design.md`
- `AGENTS.md`

## Global constraints

- Work on the current `main` branch as approved.
- Do not create `apps/api` or migrate repository layout.
- Do not stage or modify
  `codex/prompts/Phase2-A.1_yunqi_calendar_time_semantic_fix_prompt.md`.
- Preserve all Phase 1 rule tables, term order, interval ownership, and
  tyme4ts solar-term epoch values.
- Domain source, tests, and fixtures must contain no `Date`, `Date.parse`,
  Temporal, Intl calendar conversion, IANA identifiers, or tzdb dependency.
- `YunQiInstant.epochMilliseconds` is transport, ordering, persistence, audit,
  compatibility, and consistency data. Calendar fields are authoritative for
  year and six-step boundary decisions.
- `CalendarProvider` provides solar-term instants only. It must not decide
  YunQi year, six-step ownership, interval openness, or any rule mapping.
- All Service business-time parsing, normalization, and formatting must pass
  through `src/modules/time-normalizer`.
- Controllers, routes, DTO/schema code, mappers, and serializers must not
  construct `Date`, call `Date.parse()`/`toISOString()`, or use
  Temporal/Intl/IANA conversion for YunQi business time.
- `Date.now` is allowed only as the runtime epoch source in `server.ts`.
- API paths and request property `{ dateTime }` remain unchanged.
- OpenAPI dialect remains `3.1.0`; document release becomes `1.1.0`; path
  version remains `/api/v1`; rule version becomes `YQ-MVP-RULES-1.0.0`.
- Domain, adapter, and Service private package versions become `1.1.0`.
- Every logical group must pass its focused tests before the next group is
  treated as green.

## Target public contracts

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
  readonly calendarTimeStandard: CalendarTimeStandard;
  readonly instant: YunQiInstant;
}

export function calculateYunQiByCalendarTime(
  input: YunQiCalendarTime,
  provider: CalendarProvider,
): YunQiCalendarResult;
```

The compatibility flow is fixed:

```text
calculateYunQi(YunQiInstant)
  -> createYunQiCalendarTimeFromInstant()
  -> calculateYunQiByCalendarTime()
  -> compatibility result with the original YunQiInstant input
```

---

### Task 1: Lock the Domain time-model contract with failing tests

**Files:**

- Create:
  `packages/yunqi-domain/tests/calendar-time.test.ts`
- Modify:
  `packages/yunqi-domain/tests/calendar.test.ts`
- Modify:
  `packages/yunqi-domain/tests/public-api.test.ts`
- Modify:
  `packages/yunqi-domain/tests/public-entry.test.ts`
- Create:
  `packages/yunqi-domain/scripts/check-time-purity.mjs`
- Modify:
  `packages/yunqi-domain/package.json`

- [ ] **Step 1: Add model-shape and conversion tests**

Write tests that require:

- `createYunQiInstant(epoch)` to return the frozen shape
  `{ epochMilliseconds, offset: '+08:00' }`;
- `createYunQiCalendarTime(localFields)` to derive the correct instant;
- `createYunQiCalendarTimeFromInstant(instant)` to derive canonical Beijing
  fields;
- the three equivalent values
  `2026-01-01T12:00:00`, `2026-01-01T12:00:00+08:00`, and
  `2026-01-01T04:00:00Z` to correspond to epoch `1767240000000`;
- millisecond-preserving round trips;
- leap-year success and invalid Gregorian dates;
- invalid field ranges and unsafe epoch rejection;
- exact literals `+08:00` and `BeijingStandardTime+08:00`;
- frozen aggregate, local fields, and instant;
- `assertYunQiCalendarTime()` rejection of forged, mutable, or inconsistent
  aggregates;
- formatting without `.000` and with exactly `.SSS` for non-zero
  milliseconds.

Update public API/type tests to require all approved types, factories,
assertions, constants, and the new authoritative calculation entry.

- [ ] **Step 2: Add the Domain purity gate**

Create `scripts/check-time-purity.mjs` to recursively scan `src` and `tests`
(including helpers/fixtures) and fail on:

- `Date`, `new Date`, or `Date.parse`;
- `Temporal`;
- `Intl.DateTimeFormat`;
- `Asia/Shanghai` or another IANA time-zone identifier;
- imports of time-zone database packages.

Use TypeScript AST/token inspection and exact string-literal checks rather
than naive substrings, so identifiers such as `BeijingLocalDateTime` are not
false positives. Report each violation with stable relative path, line, and
rule name. The script itself is outside the scanned paths. Negative gate
fixtures, if used, must be created in a temporary directory outside Domain
tests so the real Domain tree never contains forbidden IANA literals.

Add:

```json
"test:time-purity": "node scripts/check-time-purity.mjs"
```

- [ ] **Step 3: Prove red**

Run:

```powershell
pnpm --filter @yunqi/domain exec vitest run tests/calendar-time.test.ts tests/calendar.test.ts tests/public-api.test.ts tests/public-entry.test.ts
pnpm --filter @yunqi/domain test:time-purity
```

Expected: tests fail because the new models/exports do not exist and the
purity gate fails on the old `Asia/Shanghai` Domain label.

- [ ] **Step 4: Record the red evidence**

Capture the failing symbols and purity finding in the implementation
verification document created in Task 9. Do not weaken tests to make the old
model pass.

---

### Task 2: Implement pure fixed-offset Domain factories and invariants

**Files:**

- Modify:
  `packages/yunqi-domain/src/calendar/time.ts`
- Modify:
  `packages/yunqi-domain/src/index.ts`
- Modify:
  `packages/yunqi-domain/README.md`

- [ ] **Step 1: Replace the instant label and add immutable models**

Implement the target interfaces and literal constants. Keep all conversion in
deterministic integer/BigInt Gregorian arithmetic. Do not add a runtime
dependency.

Required factories and assertions:

```ts
createYunQiInstant(epochMilliseconds): YunQiInstant
assertYunQiInstant(value, context?): asserts value is YunQiInstant
createYunQiCalendarTime(localDateTime): YunQiCalendarTime
createYunQiCalendarTimeFromInstant(instant): YunQiCalendarTime
assertYunQiCalendarTime(value, context?):
  asserts value is YunQiCalendarTime
formatYunQiInstant(instant): string
formatYunQiCalendarTime(value): string
getBeijingCivilYear(instant): number
```

Factory validation is always enabled. `assertYunQiCalendarTime()` performs the
full round trip and immutability check whenever called.

- [ ] **Step 2: Add canonical tuple comparison for Domain use**

Expose an internal calendar-module helper that compares:

```text
year, month, day, hour, minute, second, millisecond
```

It must return negative/zero/positive without consulting
`epochMilliseconds`. Do not export it from the package root unless a public
consumer requires it.

- [ ] **Step 3: Keep instant formatting compatibility**

`formatYunQiInstant()` must continue to emit fixed Beijing local time. Preserve
the existing whole-second explanation output for second-precision boundaries,
while the CalendarTime formatter preserves non-zero milliseconds.

- [ ] **Step 4: Run focused green checks**

Run:

```powershell
pnpm --filter @yunqi/domain exec vitest run tests/calendar-time.test.ts tests/calendar.test.ts tests/public-api.test.ts tests/public-entry.test.ts
pnpm --filter @yunqi/domain test:time-purity
pnpm --filter @yunqi/domain typecheck
pnpm --filter @yunqi/domain test:typecheck
```

Expected: all new model tests and the purity gate pass.

---

### Task 3: Make CalendarTime the only Domain calculation implementation

**Files:**

- Modify:
  `packages/yunqi-domain/tests/services.test.ts`
- Modify:
  `packages/yunqi-domain/tests/year-and-suiyun.test.ts`
- Modify:
  `packages/yunqi-domain/tests/public-api.test.ts`
- Modify:
  `packages/yunqi-domain/src/calendar/yunqi-year-resolver.ts`
- Modify:
  `packages/yunqi-domain/src/services/calculate-yunqi.ts`
- Modify:
  `packages/yunqi-domain/src/services/get-current-step.ts`
- Modify:
  `packages/yunqi-domain/src/types.ts`
- Modify:
  `packages/yunqi-domain/src/index.ts`

- [ ] **Step 1: Write failing authoritative-entry tests**

Require:

- `calculateYunQiByCalendarTime()` to return
  `YunQiCalendarResult.input` as the original CalendarTime;
- candidate year selection to start from
  `input.localDateTime.year`;
- provider 大寒 and all step boundaries to be converted to CalendarTime;
- year and step selection to compare local-field tuples using `[start, end)`;
- 2024 大寒:
  - `22:07:21+08:00` -> 2023 / 终之气;
  - `22:07:22+08:00` -> 2024 / 初之气;
  - `22:07:23+08:00` -> 2024 / 初之气;
- millisecond before/exact/after ownership;
- the compatibility entry to return identical annual facts, boundaries, year,
  and step while retaining the original instant object as `result.input`;
- `resolveYunQiYear(YunQiInstant)` and `getCurrentStep(YunQiInstant)` to
  delegate into the new calendar path;
- invalid provider outputs to retain existing RangeError behavior.

- [ ] **Step 2: Prove red**

Run:

```powershell
pnpm --filter @yunqi/domain exec vitest run tests/services.test.ts tests/year-and-suiyun.test.ts tests/public-api.test.ts
```

Expected: the authoritative entry/result type is absent and old
epoch-comparison assertions fail.

- [ ] **Step 3: Implement one calculation core**

Add `YunQiCalendarResult` alongside the compatibility `YunQiResult`.
Implement:

```text
validate CalendarTime
  -> resolve year from local calendar tuple
  -> calculate unchanged annual facts
  -> convert each boundary instant to CalendarTime
  -> select [start, end) by local tuple
  -> return CalendarTime input
```

Implement `calculateYunQi()` only as the approved adapter into this core.
There must be no duplicated year or step loop in the wrapper.

- [ ] **Step 4: Run Domain regression and coverage**

Run:

```powershell
pnpm --filter @yunqi/domain test
pnpm --filter @yunqi/domain typecheck
pnpm --filter @yunqi/domain test:typecheck
pnpm --filter @yunqi/domain test:coverage
pnpm --filter @yunqi/domain test:time-purity
```

Expected: all existing Phase 1 results remain green and coverage remains above
the existing baseline. Do not invent a new Domain numeric coverage threshold
in this phase; the package currently has no configured threshold.

---

### Task 4: Migrate the tyme4ts adapter without changing solar-term epochs

**Files:**

- Modify:
  `packages/calendar-adapters/tyme4ts/tests/provider.test.ts`
- Modify:
  `packages/calendar-adapters/tyme4ts/tests/solar-term-boundary.test.ts`
- Modify:
  `packages/calendar-adapters/tyme4ts/tests/property.test.ts`
- Modify:
  `packages/calendar-adapters/tyme4ts/src/provider.ts`
- Modify as required:
  `packages/calendar-adapters/tyme4ts/src/date-time-input.ts`
- Modify:
  `packages/calendar-adapters/tyme4ts/package.json`
- Modify:
  `packages/calendar-adapters/tyme4ts/README.md`

- [ ] **Step 1: Update adapter expectations first**

Change expected provider values from `timezone: 'Asia/Shanghai'` to
`offset: '+08:00'`. Add explicit assertions that:

- 2024 大寒 remains epoch `1705759642000`;
- all seven real 2024/2025 boundaries retain their current epochs;
- 1991 小满 remains epoch `674832014000`;
- 1991 大暑 remains epoch `680256668000`;
- both 1991 outputs are represented with fixed `+08:00`;
- provider tests assert only solar-term production, never YunQi year or step
  ownership.

- [ ] **Step 2: Prove red against the old shape**

Run:

```powershell
pnpm --filter @yunqi/calendar-adapter-tyme4ts exec vitest run tests/provider.test.ts tests/solar-term-boundary.test.ts
```

Expected: shape assertions fail on the old `timezone` property.

- [ ] **Step 3: Make the minimum adapter change**

Continue to treat tyme4ts as the authoritative solar-term calculator. Pass its
returned fixed-Beijing fields to `createYunQiCalendarTime()` and return only
`.instant`. This removes the provider's duplicate `Date`/fixed-offset
conversion while preserving the exact epochs and provider contract.

External `string | Date` support in this adapter may remain because the
Date/Temporal prohibition applies to Domain and Service business-time
conversion, not this external adapter boundary. Do not route Service API input
through this helper.

- [ ] **Step 4: Run the full adapter suite**

Run:

```powershell
pnpm --filter @yunqi/domain build
pnpm --filter @yunqi/calendar-adapter-tyme4ts test
pnpm --filter @yunqi/calendar-adapter-tyme4ts typecheck
pnpm --filter @yunqi/calendar-adapter-tyme4ts test:typecheck
```

Expected: all exact-boundary and property tests pass with unchanged epochs.

---

### Task 5: Build the strict Service Business Time Normalizer

**Files:**

- Create:
  `packages/yunqi-service/src/modules/time-normalizer/parser.ts`
- Create:
  `packages/yunqi-service/src/modules/time-normalizer/normalizer.ts`
- Create:
  `packages/yunqi-service/src/modules/time-normalizer/formatter.ts`
- Create:
  `packages/yunqi-service/src/modules/time-normalizer/index.ts`
- Move/replace:
  `packages/yunqi-service/tests/date-time.test.ts`
  ->
  `packages/yunqi-service/tests/time-normalizer.test.ts`
- Modify:
  `packages/yunqi-service/src/services/date-time.ts`
- Modify:
  `packages/yunqi-service/src/index.ts`
- Modify:
  `packages/yunqi-service/package.json`

- [ ] **Step 1: Write the normalizer tests before implementation**

Require exact acceptance of:

```text
YYYY-MM-DDTHH:mm:ss
YYYY-MM-DDTHH:mm:ss.SSS
YYYY-MM-DDTHH:mm:ss+08:00
YYYY-MM-DDTHH:mm:ss.SSS+08:00
YYYY-MM-DDTHH:mm:ssZ
YYYY-MM-DDTHH:mm:ss.SSSZ
```

Require exact rejection of:

```text
2026-01-01T12:00:00+0800
2026-01-01 12:00:00
2026/01/01 12:00:00
2026-01-01T12:00:00+07:00
2026-01-01T12:00:00.1
2026-01-01T12:00:00.12
2026-01-01T12:00:00.1234
```

Also require:

- the three approved 2026 inputs to produce identical complete
  `YunQiCalendarTime`;
- milliseconds to be preserved;
- invalid Gregorian fields to be rejected;
- 1986-1991 IANA gap/overlap wall times to be accepted as ordinary fixed
  `+08:00` fields;
- errors to remain `InvalidArgumentError`;
- no server/default time-zone participation;
- canonical formatting with optional `.SSS`.

- [ ] **Step 2: Prove red**

Run:

```powershell
pnpm --filter @yunqi/service exec vitest run tests/time-normalizer.test.ts
```

Expected: the new module does not exist and the old parser accepts/rejects the
wrong formats and historical times.

- [ ] **Step 3: Implement the parser as a discriminated lexical model**

`parser.ts` must extract integer fields and one of:

```ts
type ParsedTimeKind = 'beijing-local' | 'beijing-offset' | 'utc';
```

It performs no YunQi, provider, database, Date, Temporal, or Intl work.

- [ ] **Step 4: Implement deterministic normalization**

`normalizer.ts` must:

- pass local and `+08:00` fields to
  `createYunQiCalendarTime()`;
- normalize `Z` fields to the equivalent fixed Beijing calendar value using
  Domain factories and deterministic fixed-offset arithmetic;
- expose epoch-source normalization for `/current`;
- return only `YunQiCalendarTime`;
- never call tyme4ts.

`formatter.ts` must format from structured calendar fields only.

The stable module surface is:

```ts
normalizeApiDateTime(input: string): YunQiCalendarTime
normalizeEpochMilliseconds(epochMilliseconds: number): YunQiCalendarTime
normalizeYunQiInstant(instant: YunQiInstant): YunQiCalendarTime
formatYunQiCalendarTime(value: YunQiCalendarTime): {
  localTime: string;
  epochMilliseconds: number;
  offset: '+08:00';
  calendarTimeStandard: 'BeijingStandardTime+08:00';
}
```

- [ ] **Step 5: Remove the IANA/Temporal implementation**

Remove `@js-temporal/polyfill` from Service dependencies. Either delete
`src/services/date-time.ts` or retain it only as a compatibility re-export with
no parsing logic. Remove `HOSPITAL_TIME_ZONE = 'Asia/Shanghai'` from public
exports.

- [ ] **Step 6: Run focused green checks**

Run:

```powershell
pnpm install
pnpm --filter @yunqi/domain build
pnpm --filter @yunqi/service exec vitest run tests/time-normalizer.test.ts
pnpm --filter @yunqi/service typecheck
```

Expected: the lockfile no longer contains the Temporal dependency and all
normalizer tests pass.

---

### Task 6: Route every Service calculation and mapping through CalendarTime

**Files:**

- Modify:
  `packages/yunqi-service/tests/api.test.ts`
- Modify:
  `packages/yunqi-service/tests/boundary.test.ts`
- Modify:
  `packages/yunqi-service/tests/mapper.test.ts`
- Modify:
  `packages/yunqi-service/tests/contracts.test.ts`
- Modify:
  `packages/yunqi-service/tests/contracts.typecheck.ts`
- Modify:
  `packages/yunqi-service/src/services/yunqi-service.ts`
- Modify:
  `packages/yunqi-service/src/routes/yunqi.ts`
- Modify:
  `packages/yunqi-service/src/mappers/yunqi-mapper.ts`
- Modify:
  `packages/yunqi-service/src/schemas/yunqi.ts`
- Modify:
  `packages/yunqi-service/src/schemas/index.ts`
- Modify:
  `packages/yunqi-service/src/contracts/yunqi-types.ts`

- [ ] **Step 1: Write failing orchestration and DTO tests**

Require:

- `/calculate` to normalize into `YunQiCalendarTime` before the Domain call;
- `/current` to follow
  `epoch -> YunQiCalendarTime -> calculateYunQiByCalendarTime()`;
- preflight year validation to use `input.localDateTime.year`, not Temporal or
  runtime projection;
- the 2024 大寒 before/exact/after examples to keep Phase 1 ownership;
- every public time value (`input`, annual interval, and every step boundary)
  to use:

```json
{
  "localTime": "2026-06-19T12:00:00+08:00",
  "epochMilliseconds": 1781841600000,
  "offset": "+08:00",
  "calendarTimeStandard": "BeijingStandardTime+08:00"
}
```

- no production response to contain `timezone`;
- mappers to copy values and never leak/freeze/share Domain objects;
- mapper formatting to go through the time-normalizer API.

- [ ] **Step 2: Prove red**

Run:

```powershell
pnpm --filter @yunqi/service exec vitest run tests/api.test.ts tests/boundary.test.ts tests/mapper.test.ts tests/contracts.test.ts
pnpm --filter @yunqi/service test:typecheck
```

Expected: old instant DTO and old orchestration cause failures.

- [ ] **Step 3: Implement CalendarTime orchestration**

Change `calculateAtDto()` to accept `YunQiCalendarTime` and call
`calculateYunQiByCalendarTime()`. Replace `currentInstant()` with a
CalendarTime-producing clock composition. Keep provider protection and error
precedence unchanged.

- [ ] **Step 4: Replace the API time schema**

Rename `YunQiInstantDtoSchema`/types to `YunQiCalendarTimeDtoSchema`/types and
replace all references. Tighten `CalculateRequest.dateTime.pattern` to the
exact approved lexical forms; schema and normalizer must agree.

- [ ] **Step 5: Update the mapper**

For provider boundary instants:

```text
YunQiInstant
  -> time-normalizer
  -> YunQiCalendarTime
  -> YunQiCalendarTimeDto
```

For calculation input, map the existing authoritative CalendarTime directly.
No mapper-local Gregorian or offset algorithm is allowed.

- [ ] **Step 6: Run focused green checks**

Run:

```powershell
pnpm --filter @yunqi/service test
pnpm --filter @yunqi/service typecheck
pnpm --filter @yunqi/service test:typecheck
```

Expected: Service behavior is green before generated contract artifacts are
updated.

---

### Task 7: Publish OpenAPI 1.1.0 and normalize project versions

**Files:**

- Modify:
  `packages/yunqi-domain/src/rules/phase1-rules.ts`
- Modify metadata only:
  `rules/PHASE1_IMPLEMENTATION_RULES_V1.md`
- Modify hard-coded version assertions under:
  `packages/yunqi-domain/tests/**`
- Modify hard-coded version assertions under:
  `packages/yunqi-service/tests/**`
- Modify:
  `packages/yunqi-service/src/plugins/openapi.ts`
- Regenerate:
  `packages/yunqi-service/openapi/yunqi-service.openapi.yaml`
- Regenerate:
  `packages/yunqi-service/src/contracts/generated-client.ts`
- Modify:
  `packages/yunqi-domain/package.json`
- Modify:
  `packages/calendar-adapters/tyme4ts/package.json`
- Modify:
  `packages/yunqi-service/package.json`
- Modify:
  `pnpm-lock.yaml`

- [ ] **Step 1: Write/adjust version and contract assertions**

Require:

- `RULE_VERSION === 'YQ-MVP-RULES-1.0.0'`;
- package versions `1.1.0`;
- `document.openapi === '3.1.0'`;
- `document.info.version === '1.1.0'`;
- paths still start with `/api/v1`, with no `/api/v1.1`;
- generated schema/type name `YunQiCalendarTimeDto`;
- no generated `timezone: "Asia/Shanghai"`;
- exact request regex/examples.

- [ ] **Step 2: Prove red**

Run:

```powershell
pnpm --filter @yunqi/domain exec vitest run tests/public-api.test.ts tests/public-entry.test.ts
pnpm --filter @yunqi/service exec vitest run tests/openapi-contract.test.ts tests/contracts.test.ts
```

Expected: old rule/document/package metadata and old generated schema fail.

- [ ] **Step 3: Update metadata without changing rule logic**

Change only the version literal in the Phase 1 rule module. Do not change any
mapping, boundary term, sequence, or relation table. Align the rule source
document's version metadata only; do not rewrite its rules or historical
evidence.

- [ ] **Step 4: Regenerate deterministic artifacts**

Run:

```powershell
pnpm install
pnpm openapi:generate
pnpm openapi:validate
```

Review generated YAML and TypeScript. They must show the new time DTO and
version metadata only; paths and non-time response structure remain stable.

- [ ] **Step 5: Run contract/type checks**

Run:

```powershell
pnpm schema:validate
pnpm --filter @yunqi/service test:typecheck
pnpm --filter @yunqi/service openapi:check
```

Expected: checked-in artifacts have zero drift.

---

### Task 8: Add historical-DST, process-independence, and Service purity gates

**Files:**

- Create:
  `packages/yunqi-service/tests/historical-dst.test.ts`
- Create:
  `packages/yunqi-service/scripts/timezone-snapshot.mjs`
- Create:
  `packages/yunqi-service/scripts/check-timezone-independence.mjs`
- Create:
  `packages/yunqi-service/scripts/check-time-boundary-purity.mjs`
- Create:
  `packages/yunqi-service/scripts/smoke-production-entry.mjs`
- Modify:
  `packages/yunqi-service/package.json`
- Modify:
  `package.json`

- [ ] **Step 1: Add real 1991 regression tests**

Using the real tyme4ts provider, lock 小满 and 大暑 known boundary values.
For suffix-free local, explicit `+08:00`, and equivalent `Z` input, compare:

1. `localTime`;
2. `epochMilliseconds`;
3. `offset`;
4. `calendarTimeStandard`;
5. YunQi year;
6. six-step result.

Also assert that historical IANA gap/overlap examples are valid under fixed
UTC+08:00.

Use the locked fixtures:

```text
1991 小满
  local:  1991-05-21T21:20:14
  +08:00: 1991-05-21T21:20:14+08:00
  Z:      1991-05-21T13:20:14Z
  epoch:  674832014000
  step:   三之气

1991 大暑
  local:  1991-07-23T16:11:08
  +08:00: 1991-07-23T16:11:08+08:00
  Z:      1991-07-23T08:11:08Z
  epoch:  680256668000
  step:   四之气
```

- [ ] **Step 2: Add a production-build snapshot probe**

`timezone-snapshot.mjs` imports built Domain, adapter, and Service code and
emits JSON covering:

- effective `process.env.TZ` metadata;
- the three equivalent 2026 normalizations;
- complete CalendarTime values;
- real 2024 大寒 epoch;
- 2024 before/exact/after year and step;
- real 1991 小满 and 大暑 regressions;
- `/calculate` and `/current` API DTO snapshots.

Environment metadata is outside the equality payload.

- [ ] **Step 3: Add the two-process controller**

`check-timezone-independence.mjs` must spawn two fresh Node processes with:

```text
TZ=UTC
TZ=Asia/Shanghai
```

Both must exit zero. Parse their JSON, verify the effective environment, and
compare the business payload byte-for-byte.

- [ ] **Step 4: Add the Service purity gate**

Use TypeScript AST/token inspection for handwritten production files under
`packages/yunqi-service/src`. The generated client is governed by OpenAPI
generation/drift checks and may be excluded from handwritten ownership rules.
Fail on:

- `new Date`, `Date.parse`, or `toISOString`;
- Temporal;
- Intl time-zone conversion;
- IANA identifiers;
- a second parser/formatter implementation outside time-normalizer.

Allow only the exact runtime-clock reference `now: Date.now` in `server.ts`;
do not allow any other `Date.*` reference or calendar-field access from that
value.

Also enforce normalizer ownership: outside
`modules/time-normalizer/index.ts` and its private implementation files,
production code must not import parser internals, directly create Domain
CalendarTime/Instant values for API business time, or implement fixed-offset
conversion. Routes, services, and mappers consume only the stable normalizer
surface.

- [ ] **Step 5: Add a real production-entry smoke**

`smoke-production-entry.mjs` must start `node dist/server.js` with:

```text
HOST=127.0.0.1
PORT=0
NODE_ENV=production
```

Parse the actual ephemeral listening address, call `/health` and one real
`POST /api/v1/yunqi/calculate` request through the tyme4ts provider, enforce a
bounded timeout, and terminate the child in `finally`. Importing `buildApp()`
or using the fixed test provider is not a substitute.

- [ ] **Step 6: Wire mandatory scripts**

Add package scripts:

```json
"test:time-purity": "node scripts/check-time-boundary-purity.mjs",
"test:timezone": "node scripts/check-timezone-independence.mjs",
"smoke:production-entry": "node scripts/smoke-production-entry.mjs"
```

Add root scripts and include them in the root `test` gate after the initial
build:

```json
"test:time-purity": "pnpm --filter @yunqi/domain test:time-purity && pnpm --filter @yunqi/service test:time-purity",
"test:timezone": "pnpm --filter @yunqi/service test:timezone",
"smoke:production-entry": "pnpm --filter @yunqi/service smoke:production-entry"
```

- [ ] **Step 7: Run focused gates**

Run:

```powershell
pnpm build
pnpm --filter @yunqi/service exec vitest run tests/historical-dst.test.ts
pnpm test:time-purity
pnpm test:timezone
pnpm smoke:production-entry
```

Expected: historical inputs agree and business snapshots are byte-identical
across both processes; the real production server answers health and
calculation requests.

---

### Task 9: Update package documentation and create verification evidence

**Files:**

- Modify:
  `packages/yunqi-domain/README.md`
- Modify:
  `packages/calendar-adapters/tyme4ts/README.md`
- Modify:
  `packages/yunqi-service/README.md`
- Create:
  `docs/superpowers/verification/2026-07-16-yunqi-calendar-time-semantics.md`

- [ ] **Step 1: Align README responsibilities**

Document:

- fixed Beijing Standard Time UTC+08:00, not IANA history;
- authoritative CalendarTime and compatibility instant entry;
- provider supplies solar terms only;
- Service accepted/rejected exact formats;
- `/current` epoch-source flow;
- public DTO shape;
- OpenAPI document release vs path version;
- historical DST exclusion.

Do not describe tyme4ts as a time semantic manager or claim Phase 1 rule
changes.

- [ ] **Step 2: Create the verification record**

Record:

- baseline/red evidence;
- changed package/public contracts;
- exact 2024 大寒 epoch and before/exact/after results;
- exact 1991 小满/大暑 values and three-form equality;
- two-process TZ comparison;
- purity-gate results;
- OpenAPI/client drift result;
- coverage results;
- complete changed-file list and diff-boundary audit.

- [ ] **Step 3: Audit governance consistency**

Search the implementation and docs for stale production semantics:

```powershell
rg -n "timezone.*Asia/Shanghai|HOSPITAL_TIME_ZONE|CST\+08:00|V1\.0-2026\.7\.7-implementation\.1" packages docs AGENTS.md
```

Expected: no production model, API schema, or current README uses a stale
business identifier. Historical/negative references in ADR/spec/test
descriptions are allowed and must be reviewed manually.

---

### Task 10: Run the full acceptance matrix, review, and commit

**Files:**

- Review every changed file.
- Do not include generated `dist`, `coverage`, temporary snapshots, or the
  untracked prompt.

- [ ] **Step 1: Run installation and all root gates**

Run fresh:

```powershell
pnpm install --frozen-lockfile
npm test
npm run typecheck
npm run build
npm run test:coverage
npm run openapi:validate
npm run schema:validate
npm run test:time-purity
npm run test:timezone
npm run smoke:production-entry
```

Expected: all commands exit zero. Existing Redocly warnings may remain only if
their count/content is unchanged and documented.

- [ ] **Step 2: Run repository hygiene checks**

Run:

```powershell
git diff --check
git status --short
git diff --name-status
git diff --stat
git ls-files | rg "(^|/)(dist|coverage)/|timezone-snapshot.*\.json$"
```

Expected:

- no whitespace errors;
- no tracked build/coverage/temp artifact;
- no unrelated repository-layout change;
- the prompt remains untracked and unstaged.

- [ ] **Step 3: Perform independent reviews**

Request:

1. a Domain/adapter review for model invariants, single calculation core,
   boundary ownership, and Phase 1 epoch preservation;
2. a Service/contract review for parser strictness, DTO completeness,
   mapper/controller purity, version separation, and generated drift;
3. a final severity-ranked review. Resolve every critical or important
   finding before claiming completion.

- [ ] **Step 4: Stage an exact scope**

Stage only the approved implementation, generated contract, README,
verification, plan, root scripts/lockfile, and package metadata. Inspect:

```powershell
git diff --cached --check
git diff --cached --name-status
```

- [ ] **Step 5: Commit**

Use:

```powershell
git commit -m "fix(yunqi): adopt fixed Beijing calendar time"
```

- [ ] **Step 6: Verify the commit**

Run:

```powershell
git show --check --stat --oneline HEAD
git status --short
```

Expected: the implementation commit is clean, and only the intentionally
untracked Phase2-A.1 prompt remains.

## Definition of done

- `YunQiCalendarTime` is the authoritative dated-calculation input.
- `calculateYunQiByCalendarTime()` is the only dated calculation
  implementation.
- `calculateYunQi(YunQiInstant)` is a compatibility wrapper.
- Domain source/tests/fixtures pass the no-Date/no-IANA purity gate.
- CalendarProvider returns only solar-term `YunQiInstant` values and owns no
  YunQi rule decision.
- tyme4ts 2024/1991 solar-term epochs remain authoritative and unchanged.
- Service accepts only the six approved lexical formats and rejects the three
  explicitly forbidden variants plus other offsets.
- `/current` uses only runtime epoch -> CalendarTime -> authoritative Domain
  flow.
- API responses contain complete `YunQiCalendarTimeDto` values and no
  `timezone`.
- OpenAPI is dialect 3.1.0, document release 1.1.0, path `/api/v1`, and rule
  version `YQ-MVP-RULES-1.0.0`.
- Historical 1986-1991 DST does not participate.
- `TZ=UTC` and `TZ=Asia/Shanghai` production-build snapshots are identical.
- All root tests, typechecks, builds, coverage, schema, OpenAPI, purity, and
  drift gates pass.
- No critical or important review finding remains.
