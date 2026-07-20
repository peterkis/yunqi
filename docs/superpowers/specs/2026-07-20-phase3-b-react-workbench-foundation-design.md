# Phase3-B React Workbench Foundation Design

**Status:** Approved architecture, implementation-ready  
**Date:** 2026-07-20  
**Base:** Phase3-A API Contract Freeze  
**Application:** `apps/yunqi-workbench`

## 1. Purpose

Phase3-B creates a runnable browser Workbench foundation that consumes the
frozen YunQi API contract. It establishes the application shell, providers,
query data layer, time-safe presentation, tests, and CI governance needed by
later Phase3 business features.

This phase does not implement a YunQi calculation page, inquiry workflow,
expert review, rule management, diagnosis, syndrome differentiation, or
treatment guidance.

## 2. Frozen inputs

| Item | Value |
|---|---|
| API path | `/api/v1` |
| Contract ID | `YQ-API-CONTRACT-1.0.0` |
| OpenAPI document | `1.2.0` |
| Rule version | `YQ-MVP-RULES-1.0.0` |
| Contracts package | `@yunqi/contracts@1.0.0` |
| Client package | `@yunqi/client@1.0.0` |
| Runtime | Node.js `>=22` |
| React | `19.2.7` |
| Vite | `8.1.5` |
| TanStack Query | `5.101.2` |

The Workbench must not change any frozen API path, request, response, schema,
rule, Domain result, or tyme4ts epoch.

## 3. Technology decision

The application is a React 19 TypeScript single-page application built by
Vite 8. It uses TanStack Query v5 for server state, Vitest and Testing
Library for behavior tests, and jsdom for the test browser environment.

It does not use Next.js, SSR, React Server Components, Server Actions, route
handlers, React Router, TanStack Router, Axios, or a UI component framework.

Vite SPA was chosen because Phase3-B needs a browser application boundary,
not a server application boundary. A headless UI package was rejected because
it would not provide a runnable Workbench entry, provider tree, browser build,
or application shell.

## 4. Dependency architecture

The only YunQi dependency path available to React is:

```text
apps/yunqi-workbench
  ├── @yunqi/client
  │     └── @yunqi/contracts
  └── @tanstack/react-query
```

The Workbench may import public DTOs directly from `@yunqi/contracts` and
client behavior from `@yunqi/client`. It must never import
`@yunqi/service`, `@yunqi/domain`, a calendar adapter, or an internal
generated OpenAPI file.

React source must not:

- declare or copy a YunQi DTO;
- call `fetch` or Axios;
- construct request paths;
- calculate YunQi facts;
- map API wire objects into a competing domain model.

## 5. Application structure

```text
apps/yunqi-workbench/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── vite.config.ts
├── vitest.config.ts
└── src/
    ├── main.tsx
    ├── app/
    │   ├── App.tsx
    │   └── routes.ts
    ├── components/
    │   ├── feedback/
    │   │   └── AsyncState.tsx
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   └── Navigation.tsx
    │   └── time/
    │       └── YunQiTimeDisplay.tsx
    ├── features/
    │   └── yunqi/
    │       ├── api/
    │       │   └── query-options.ts
    │       └── hooks/
    │           ├── useCurrentYunQiQuery.ts
    │           └── useYunQiYearQuery.ts
    ├── lib/
    │   └── runtime-config.ts
    ├── providers/
    │   ├── AppProviders.tsx
    │   ├── ErrorBoundaryProvider.tsx
    │   ├── QueryProvider.tsx
    │   ├── ThemeProvider.tsx
    │   └── YunQiClientProvider.tsx
    ├── styles/
    │   └── global.css
    └── test/
        ├── contract.typecheck.ts
        ├── setup.ts
        └── test-utils.tsx
```

Tests live beside the unit they specify using `*.test.ts` and
`*.test.tsx`. A `features/yunqi/types` directory is not created until a
concrete UI-only type is required. If it is introduced later, it may contain
view state but never copied DTOs.

`app/routes.ts` is navigation metadata only. It does not resolve URLs or
introduce a router abstraction.

## 6. Provider composition

`main.tsx` mounts one provider entry:

```text
AppProviders
  └── ErrorBoundaryProvider
      └── ThemeProvider
          └── QueryProvider
              └── YunQiClientProvider
                  └── App
```

### 6.1 ErrorBoundaryProvider

The React Error Boundary catches rendering and lifecycle failures and renders
a safe recovery surface. It never renders a stack trace, backend exception,
raw response body, or medical interpretation.

React Error Boundaries do not catch rejected query promises by default.
Therefore asynchronous API failures remain Query state and are rendered by
`AsyncState` with a generic message and optional retry action. This distinction
prevents false assumptions about React error propagation.

### 6.2 ThemeProvider

The theme context provides `light` and `dark` values plus an explicit toggle.
The initial value is `light`. It sets a `data-theme` attribute on the
application wrapper and does not consult local time, system time, or browser
timezone. Persistence and operating-system preference detection are deferred.

### 6.3 QueryProvider

`QueryProvider.tsx` exports:

```ts
createWorkbenchQueryClient(options?)
QueryProvider
```

The client is created outside React render. Production defaults are:

```text
staleTime: 300000 milliseconds
retry: false
refetchOnWindowFocus: false
```

The factory owns an explicit `QueryCache`. An optional `onQueryError`
callback enables future telemetry without exposing errors to UI. Tests inject
a fresh QueryClient so cache state cannot leak between cases.

### 6.4 YunQiClientProvider

The context owns one `YunQiClient` instance. The default instance is created
through `createYunQiClient(createFetchTransport(...))` in provider
infrastructure, never in a feature component.

`VITE_YUNQI_API_BASE_URL` is read in `lib/runtime-config.ts`; an absent value
means same-origin requests. The context exposes only:

```ts
useYunQiClient(): YunQiClient
```

Tests and future hosts may inject an alternative `YunQiClient`. Token, tenant,
and authentication headers are explicitly deferred.

## 7. Query data flow

The only supported feature flow is:

```text
component
  -> feature hook
  -> query option factory
  -> YunQiClient from context
  -> @yunqi/client
  -> @yunqi/contracts
```

`features/yunqi/api/query-options.ts` adapts the existing
`yunqiQueryOptions` export to an injected `YunQiClient`. Hooks call TanStack
Query's `useQuery`; components do not receive a client and do not invoke
client methods.

Phase3-B provides current and year query hooks because those query options
already exist in the frozen client. It does not add a calculation form or
mutation UI.

## 8. Feedback states

`AsyncState<T>` is a reusable presentation boundary with four observable
states:

- loading: accessible progress status;
- error: sanitized message and optional retry action;
- empty: explicit no-data message;
- success: renders the supplied data renderer.

The component receives already-derived query state. It does not import
TanStack Query, the API client, or YunQi DTOs.

## 9. Workbench shell

The runnable root renders:

- product header and Phase3-B foundation status;
- accessible navigation landmark;
- active Home entry;
- disabled placeholders for YunQi and inquiry workspaces;
- main content describing the frozen contract and infrastructure readiness;
- theme control.

No placeholder performs navigation or renders a business result.

The visual direction is a restrained clinical-editorial instrument:

- warm paper and ink surfaces rather than a generic white dashboard;
- cinnabar used as a controlled accent;
- serif-led Chinese typography with a clean sans-serif support face;
- fine ruled borders and subtle grid texture;
- high contrast, visible focus, reduced-motion support, and responsive
  single-column behavior.

Motion is limited to a short shell entrance and control transitions. The
interface avoids decorative gradients, glass cards, diagnosis-like alerts,
and gamified medical language.

## 10. Fixed Beijing time presentation

`YunQiTimeDisplay` accepts only:

```ts
value: YunQiTimeDto
```

It reads `value.localTime` and renders a string-only human form alongside:

```text
北京时间 UTC+08
```

The canonical `localTime` remains the `<time dateTime>` value. Human display
formatting may replace the literal `T` separator and omit the already-declared
`+08:00` suffix; it must not parse or reinterpret the value.

All Workbench source is forbidden from using:

- `Date`, `Date.parse`, or `new Date`;
- Temporal;
- Intl or locale formatters;
- `toISOString`;
- IANA timezone names, including `Asia/Shanghai`;
- browser local timezone.

`epochMilliseconds` is not a display source.

## 11. Testing design

### 11.1 Component behavior

Testing Library covers:

- App shell renders header, navigation, placeholders, and main content;
- QueryProvider supplies a usable QueryClient;
- YunQiClientProvider supplies the injected client;
- ErrorBoundaryProvider renders a sanitized fallback and recovers;
- ThemeProvider toggles the declared theme;
- AsyncState renders loading, error, empty, and success states;
- YunQiTimeDisplay renders `localTime` without epoch conversion.

### 11.2 Query integration

Hook tests inject a structural `YunQiClient`, call the current/year hooks,
and prove the returned data comes through `@yunqi/client` query options.
Retries are disabled and each test owns its QueryClient.

### 11.3 Contract and dependency governance

Type tests prove Workbench DTO values use `YunQiTimeDto` and
`YunQiCalculationDto` from `@yunqi/contracts`.

Repository governance scans Workbench manifests and source to reject:

- Service, Domain, or calendar-adapter dependencies/imports;
- Axios;
- direct `fetch`;
- direct API path strings in components;
- DTO declarations using frozen public DTO names;
- direct client calls from component directories.

The existing time-governance scanner discovers the React manifest and scans
all Workbench source.

### 11.4 Coverage

Workbench runtime coverage thresholds are:

```text
lines: 90
statements: 90
functions: 90
branches: 85
```

Generated artifacts and type-only tests are excluded from runtime coverage.

## 12. Workspace and CI integration

The root workspace includes `apps/*`. Root `build`, `test`, `typecheck`, and
`test:coverage` invoke `@yunqi/workbench`.

The root package declares:

```json
{
  "engines": {
    "node": ">=22"
  }
}
```

The existing GitHub Actions job remains named `quality-gates`, keeps Node 22,
and retains its approved command order. Because the root commands include the
Workbench, the existing gates enforce its:

- frozen contract check;
- time governance;
- test suite;
- type check;
- coverage;
- dependency purity.

No API Contract ID or OpenAPI baseline changes in this phase.

## 13. Completion evidence

Phase3-B is complete only when all of the following are demonstrated:

1. `pnpm --filter @yunqi/workbench dev` starts the Vite application.
2. `pnpm --filter @yunqi/workbench build` produces a browser build.
3. App shell, providers, query hooks, feedback states, and time display tests
   pass.
4. Workbench type tests consume only public contracts.
5. Dependency and time governance mutation tests prove forbidden patterns
   fail.
6. Root build, test, typecheck, coverage, contract, schema, and OpenAPI gates
   pass.
7. Browser inspection confirms responsive layout, theme behavior, and no
   runtime console errors.
8. Domain, adapter, service wire contract, API path, Contract ID, and rule
   version remain unchanged.

The Workbench is a contract consumer and presentation host. It is not a rule
engine or medical decision system.
