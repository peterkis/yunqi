# @yunqi/workbench

Phase3-C1 React Workbench for TCM YunQi Lab. It contains the first real,
read-only `/current` YunQi view while remaining a presentation host and
frozen-contract consumer. It is not a rule engine, router, diagnosis system,
or treatment system.

## Architecture boundary

The only YunQi dependency path is:

```text
@yunqi/workbench
  └── @yunqi/client
        └── @yunqi/contracts
```

`AppProviders` composes the render error, theme, QueryClient, and YunQiClient
providers. Provider infrastructure owns client and transport creation.
Feature query hooks consume the injected client. The current result follows:

```text
/current
  -> useCurrentYunQiQuery
  -> YunQiCalculationDto
  -> pure presentation mapper
  -> CurrentYunQiViewModel
  -> presentational components
```

Only `src/features/yunqi/presentation/**` may receive frozen DTOs for
presentation mapping. Production components receive ViewModels and must not
import DTO types, call `fetch`, Axios, or YunQi client methods, or construct
`/api/v1/yunqi/**` paths.

DTOs come from `@yunqi/contracts`. The Workbench must not depend on or import
Service, Domain, calendar adapters, or internal generated OpenAPI modules.
Axios and React Router imports are also forbidden throughout Workbench source,
including when listed only as development dependencies. The runtime allowlist
applies to dependencies, optional dependencies, and peer dependencies.
Phase3-C1 deliberately has no router, year selector, calculation form,
runtime fixture, inquiry workflow, or backend contract change.

Relative imports must stay inside `apps/yunqi-workbench`. Imports that escape
to repository implementation packages, absolute local paths, and `file:`
imports are forbidden. Use the public `@yunqi/contracts` and `@yunqi/client`
package entrypoints.

Component responsibility is path-based: `src/components/**`, `src/app/**`,
and `src/features/**/components/**` are presentation code regardless of
whether a file uses `.ts`, `.tsx`, `.js`, or `.jsx`. Hooks, query API modules,
and Provider infrastructure retain their separate ownership boundaries.
Components must not runtime-import or runtime re-export `@yunqi/client`, or
obtain `getCurrent`/`getYear`/`calculate` through optional chaining, a method
reference, bracket access, or destructuring. Pure type-only client imports and
re-exports do not create runtime capability; mixed type/runtime re-exports are
rejected.

Presentation mapper modules may import DTO types from `@yunqi/contracts`, but
must not import React, TanStack Query, or `@yunqi/client`, access client
methods, or perform transport. Enum-to-label maps are exhaustive and neutral;
they do not calculate a relation or add medical/traditional interpretation.

## Current view

The Home shell loads the real current result through `@yunqi/client`.
Successful data renders:

- canonical fixed-Beijing input time;
- YunQi year, stem-branch, year interval, and SuiYun;
- Sitian and Zaiquan;
- the current Six-Qi step;
- the complete six-step timeline;
- API explanations and rule-version traceability.

The current step is highlighted and expanded initially. Every step uses an
independent accessible disclosure, so users may compare multiple expanded
steps. Structured Qi, element, and direction labels are displayed alongside
the unchanged API `traditionalLabel`. Loading, failure/retry, and empty states
are sanitized shared components; production never falls back to mock data.

## Fixed Beijing time

The DTO mapper copies only canonical `localTime` and
`BeijingStandardTime+08:00` into `YunQiTimeViewModel`. Render that local time
and display `北京时间 UTC+08`. Do not parse or reinterpret it with `Date`,
Temporal, Intl, locale/ISO formatters, IANA timezones, or browser local time.
`epochMilliseconds` is neither copied into the ViewModel nor used as a display
source.

## Local commands

Run from the repository root:

```text
pnpm --filter @yunqi/workbench dev
pnpm --filter @yunqi/workbench build
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm test:workbench-governance
```

## Runtime API base URL

By default, the client sends same-origin requests. For a separately hosted
service, create `apps/yunqi-workbench/.env.local`:

```dotenv
VITE_YUNQI_API_BASE_URL=http://127.0.0.1:3000
```

This value is the service origin/base URL. Do not append or duplicate
`/api/v1/yunqi/**`; `@yunqi/client` owns those frozen paths. Restart the Vite
dev server after changing the environment file.
