# @yunqi/workbench

Phase3-B React Workbench foundation for TCM YunQi Lab. It is a presentation
host and frozen-contract consumer, not a rule engine, router, business page,
diagnosis system, or treatment system.

## Architecture boundary

The only YunQi dependency path is:

```text
@yunqi/workbench
  └── @yunqi/client
        └── @yunqi/contracts
```

`AppProviders` composes the render error, theme, QueryClient, and YunQiClient
providers. Provider infrastructure owns client and transport creation.
Feature query hooks consume the injected client. Components receive query
state and public DTOs; they do not call `fetch`, Axios, or YunQi client
methods, and do not construct `/api/v1/yunqi/**` paths.

DTOs come from `@yunqi/contracts`. The Workbench must not depend on or import
Service, Domain, calendar adapters, or internal generated OpenAPI modules.
Axios and React Router imports are also forbidden throughout Workbench source,
including when listed only as development dependencies. The runtime allowlist
applies to dependencies, optional dependencies, and peer dependencies.
Phase3-B deliberately has no router or business pages.

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

## Fixed Beijing time

Render the API-provided canonical `localTime` and display
`北京时间 UTC+08`. Do not parse or reinterpret it with `Date`, Temporal, Intl,
locale/ISO formatters, IANA timezones, or browser local time.
`epochMilliseconds` is not a display source.

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
