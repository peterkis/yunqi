# @yunqi/workbench

Phase3-C3 React Workbench for TCM YunQi Lab. It is a read-only presentation
host for the frozen YunQi API Contract. It shows the current YunQi state and
an arbitrary-year analysis without calculating rules, inferring calendar
boundaries, diagnosing, prescribing, or providing treatment decisions.

## Routes and state ownership

The Workbench uses declarative React Router routes:

| Route | Meaning | Request behavior |
|---|---|---|
| `/` | Entry redirect | Replaces the URL with `/yunqi/current` |
| `/yunqi/current` | Current YunQi state and six-stage timeline | Calls the current-query endpoint |
| `/yunqi/year` | Annual-analysis entry and year selector | Makes no annual request |
| `/yunqi/year/:year` | Annual structure for one validated year | Calls the annual endpoint only after strict URL validation |
| any other path | Workbench not-found page | Makes no YunQi request |

Annual parameters must be exact four-digit years in the inclusive `1901–2099`
range. Malformed and out-of-range routes render a validation message without
mounting the annual query owner or calling the API.

The URL is the only owner of the selected year. Browser history therefore
restores both the year URL and its query result; no React state mirrors the
year, and `/yunqi/year` never invents a default from `Date`, `/current`, the
browser clock, server time, or a timezone API. The selected Six-Qi stage is
local state owned only by the annual master-detail page. It is deliberately
not persisted in the URL or Contract and resets to the first returned stage
when a different annual result is rendered.

## Architecture boundary

The annual data flow is:

```text
Router
  -> Year parameter validator
  -> useYunQiYearQuery
  -> @yunqi/client
  -> @yunqi/contracts YunQiYearDto
  -> pure presentation mapper
  -> AnnualYunQiViewModel
  -> presentational components
```

The current route follows the equivalent current-query flow:

```text
Router
  -> useCurrentYunQiQuery
  -> @yunqi/client
  -> @yunqi/contracts YunQiCalculationDto
  -> pure presentation mapper
  -> CurrentYunQiViewModel
  -> presentational components
```

`AppProviders` composes the render error, theme, QueryClient, and YunQiClient
providers. Provider infrastructure owns client and transport creation;
feature query hooks consume the injected client. Components receive
ViewModels only: they do not import DTOs, call `fetch`, Axios, or YunQi client
methods, or construct `/api/v1/yunqi/**` paths.

Only `src/features/yunqi/presentation/**` may consume frozen DTO types for
presentation mapping. These pure mappers cannot depend on React, TanStack
Query, React Router, or `@yunqi/client`, and they cannot perform transport or
business calculation. DTOs come only from `@yunqi/contracts`; the Workbench
does not depend on Service, Domain, calendar adapters, or generated OpenAPI
implementation modules.

Relative imports must remain inside `apps/yunqi-workbench`. Imports that
escape to repository implementations, absolute local paths, and `file:`
imports are forbidden. Component responsibility is path-based for
`src/components/**`, `src/app/**`, and
`src/features/**/components/**`, regardless of file extension.

## Router dependency boundary

`react-router-dom` is frozen to the exact runtime version `7.18.1`. It is the
only approved routing package and is used only for URL matching, navigation,
history restoration, and page selection. Router and Page modules must not
call YunQi client methods, while presentation mappers must not import Router.
No routing package may be introduced through `devDependencies`, optional
dependencies, peer dependencies, dynamic imports, or local implementation
paths to bypass these rules.

## Neutral and current-status stage models

The shared `SixQiStageViewModel` contains only Contract facts: the API step
index and name, canonical start/end times, host Qi, guest Qi, and structured
guest-host relation. `SixQiStageTuple` preserves exactly six returned stages,
and every index is copied directly from the DTO rather than recreated from
array position.

`AnnualYunQiViewModel` uses that neutral tuple and contains no input time,
current step, status, or epoch-derived display value. Its native radio group
selects one stage for the single detail region; annual copy does not classify
stages as current, completed, or upcoming.

`CurrentYunQiViewModel` enriches the same neutral stage facts with the
status-enhanced `CurrentSixQiStageViewModel`. This preserves the existing
current-page current/completed/upcoming timeline, disclosure behavior, and
desktop annual rail without leaking current-time semantics into annual
analysis.

## Explanation and traceability

Rule explanation and traceability are separate responsibilities:

- `RuleExplanationPanel` renders API `explanations` verbatim, with a neutral
  empty state. It does not expand theory, infer causality, or add medical
  meaning.
- `TraceabilityPanel` renders metadata only: rule version, frozen Contract ID,
  source label, and `北京时间 UTC+08`. It contains no theoretical explanation.

## Fixed Beijing time

Presentation mappers copy only canonical `localTime` and
`BeijingStandardTime+08:00` into `YunQiTimeViewModel`. Components render that
string directly and label it `北京时间 UTC+08`.

Do not parse or reinterpret business time with `Date`, Temporal, Intl,
locale/ISO formatters, IANA timezones, browser local time, or
`epochMilliseconds`. Epoch milliseconds are not copied into presentation
ViewModels and are not a display source.

## Local commands

Run from the repository root:

```text
pnpm --filter @yunqi/workbench dev
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
pnpm test:workbench-governance
pnpm test:time-governance
```

The full repository gates additionally include frozen Contract drift checks,
time purity, all package tests/typechecks/coverage, schema validation, and
OpenAPI validation.

## Runtime API base URL

By default, the client sends same-origin requests. For a separately hosted
service, create `apps/yunqi-workbench/.env.local`:

```dotenv
VITE_YUNQI_API_BASE_URL=http://127.0.0.1:3000
```

This value is the service origin/base URL. Do not append or duplicate
`/api/v1/yunqi/**`; `@yunqi/client` owns those frozen paths. Restart the Vite
development server after changing the environment file.
