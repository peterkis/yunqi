# Phase3-B Task 6 Report

## Outcome

Established the Workbench YunQi query layer for current and year queries.
Feature hooks obtain the injected `YunQiClient` from context and adapt only the
public `@yunqi/client` `yunqiQueryOptions` through TanStack Query.

## TDD evidence

### RED

Command:

```text
pnpm --filter @yunqi/workbench test -- src/features/yunqi/hooks/yunqi-queries.test.tsx
```

Observed exit code `1`. Vitest failed before collecting tests because
`./useYunQiYearQuery` did not exist:

```text
Test Files  1 failed (1)
Tests       no tests
Error: Failed to resolve import "./useYunQiYearQuery"
```

No query option or hook production module existed at this point.

### GREEN

The same focused command passed after the minimal implementation:

```text
Test Files  1 passed (1)
Tests       2 passed (2)
```

The tests prove both methods execute through the injected structural client,
including `getCurrent()` and `getYear(2026)`, and return the identical resolved
DTO objects.

## Changes

- Added injected current/year TanStack query option factories.
- Added current/year hooks using `useYunQiClient` and `useQuery`.
- Added `createTestWrapper(client)`, which creates a fresh Workbench
  `QueryClient` for each invocation and composes the two required providers.
- Added public-package-only contract type assertions for
  `YunQiTimeDto`, `YunQiCalculationDto`, `YUNQI_API_CONTRACT_ID`, and
  `YunQiClient`.
- Added `@ts-expect-error` guards proving `timezone` and `calendarTime` are not
  public contract fields.

## Verification

```text
pnpm --filter @yunqi/workbench test -- src/features/yunqi/hooks/yunqi-queries.test.tsx
  PASS: 1 file, 2 tests

pnpm --filter @yunqi/workbench test:typecheck
  PASS

pnpm --filter @yunqi/workbench typecheck
  PASS

pnpm --filter @yunqi/workbench test
  PASS: 12 files, 21 tests

pnpm --filter @yunqi/workbench build
  PASS: TypeScript and Vite production build

pnpm --filter @yunqi/workbench test:coverage
  PASS: 12 files, 21 tests
  statements 98.18%, branches 85.29%, functions 100%, lines 98.18%

git diff --check
  PASS
```

## Boundary self-review

- No direct `fetch`, Axios, or API URL was added.
- No YunQi DTO was declared, copied, or extended.
- No import from Service, Domain, calendar adapter, or generated OpenAPI
  internals was added.
- Query hooks use only `useYunQiClient`, the local query option factories, and
  TanStack `useQuery`.
- Query option factories delegate to public `yunqiQueryOptions`; they do not
  invoke transport or client methods themselves.
- No frozen contract, time semantics, rule, service, or Domain file changed.

## Residual risk

The query layer intentionally covers only the existing current/year read
operations. Error-state presentation, calculation mutation UI, authentication,
and business pages remain outside Task 6.
