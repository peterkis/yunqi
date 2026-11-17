# @yunqi/workbench

React Workbench for TCM YunQi Lab.

> **UI refactor (2026-11-17).** The visual and interaction design is defined
> only by [docs/design](../../docs/design/README.md): a 400px outpatient side
> panel with three segments (当下运气 / 先天对照 / 体质量表), drill-down pages
> and a collapsed pill. The pre-refactor page layouts, styles and screenshots
> are demos and must not be reused as a design reference or acceptance
> baseline. `PanelShell` now provides this shared frame. View interiors migrate
> in C3–C6; their existing data flow, time and medical boundaries stay in force.

The 2026-11-16 doctor-feedback release adds progressive disclosure, sourced classical excerpts, birth/current comparison,
and constitution self-assessment to the existing annual and specified-time
analysis. All calculations remain behind the versioned API. React does not
infer calendar boundaries, create patient records, diagnose, predict diseases,
prescribe, or provide treatment decisions.

## Routes and state ownership

The Workbench uses declarative React Router routes:

| Route | Navigation | Request behavior |
|---|---|---|
| `/` | Entry redirect | Replaces the URL with `/yunqi/current` |
| `/yunqi/current` | 当下运气 segment | Calls the composite learning-current endpoint; refreshes current context every minute |
| `/yunqi/birth` | 先天对照 segment | Submit-only comparison; optional known birth time |
| `/yunqi/constitution` | 体质量表 segment | GET questionnaire/current context; assessment POST only after complete explicit submission |
| `/yunqi/year` | 年度分析 drill-down; return to `/yunqi/current` | Makes no annual request |
| `/yunqi/year/:year` | 年度分析 drill-down; return to `/yunqi/current` | Calls the annual endpoint only after strict URL validation |
| `/yunqi/calculate` | 指定时点 drill-down; return to `/yunqi/current` | Makes one calculate request only after an explicit valid submit |
| `/yunqi/inquiry` | 问诊规划 drill-down; return to `/yunqi/current` | Makes no YunQi, Patient, or Inquiry request; absent from segments |
| any other path | Not-found drill-down; return to `/yunqi/current` | Makes no YunQi request |

`src/app/routes.ts` owns segment labels, route titles and deterministic return
targets. Returning works even when a drill-down was opened directly. Changing
segments focuses the content region and resets its scroll; changes within the
annual area retain the year control's focus and browser-history behavior.
Annual and specified-time routes retain their existing interiors; C3/C6 add
their new entry points.

The browser frame docks a 400px panel on the right, with a 52px header, segment
navigation (or drill-down heading), one scrolling content region, an optional
action slot and a 36px teaching disclaimer footer. Narrower viewports fit the
panel to their width. Existing view breakpoints respond to the panel container
width. This is browser layout only; it does not control a host window.

Collapse produces a 400 × 64 button. Enter, Space or a click expands it;
collapse focuses the pill and expansion returns focus to the collapse trigger.
The mounted route retains its draft and scroll. Collapse state remains in page
memory, outside the URL and browser storage, and resets on reload.
The pill receives only an already loaded ViewModel: current context for the
current/questionnaire views, the response's current snapshot for birth
comparison, and the selected annual summary for annual/specified-time results.
Idle, edited, loading or failed results show a neutral placeholder instead of
fetching another summary or reusing a different route's snapshot.

Annual parameters must be exact four-digit years in the inclusive `1900–2100`
range. Malformed and out-of-range routes render a validation message without
mounting the annual query owner or calling the API.

The active API Contract is `YQ-API-CONTRACT-1.2.0`; the rule result identifies
`YQ-MVP-RULES-1.1.0`. For `GUEST_GENERATES_HOST`, the direction label remains
`客生主`, while the API-provided traditional description is `客生主，相得`.
The Workbench renders these separate fields without deriving a rule relation.

The URL is the only owner of the selected year. Browser history therefore
restores both the year URL and its query result; no React state mirrors the
year, and `/yunqi/year` never invents a default from `Date`, `/current`, the
browser clock, server time, or a timezone API. The selected Six-Qi stage is
local state owned only by the annual master-detail page. It is deliberately
not persisted in the URL or Contract and resets to the first returned stage
when a different annual result is rendered.

The specified-time route owns only local form state and the mutation lifecycle.
It starts empty, makes no request on mount, treats the input as a Beijing
standard wall-clock value, and hides a successful result as soon as the input
changes. Its six-stage result uses neutral selected-time language rather than
the current-page completed/current/upcoming semantics.

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
  -> useLearningCurrentQuery
  -> @yunqi/client.getLearningCurrent()
  -> @yunqi/contracts YunQiLearningDto
  -> mapLearning / mapCurrentYunQi
  -> LearningViewModel / CurrentYunQiViewModel
  -> presentational components
```

The specified-time data flow is:

```text
Router
  -> TimeAnalysisView
  -> useCalculateYunQiMutation
  -> @yunqi/client.calculate()
  -> @yunqi/contracts YunQiCalculationDto
  -> mapTimeAnalysisYunQi
  -> TimeAnalysisYunQiViewModel
  -> presentational components
```

The mutation owner is the only Workbench layer that calls the injected Client.
The pure mapper copies the API canonical input time, maps the exact six-stage
tuple, and selects the stage by the API currentStep index. The result displays
the canonical API time, annual summary, a non-interactive equal-width stage
rail, selected-stage detail, API explanations, and traceability.

`AppProviders` composes the render error, theme, QueryClient, and YunQiClient
providers. Provider infrastructure owns client and transport creation;
feature query hooks consume the injected client. Components receive
ViewModels only: they do not import DTOs, call `fetch`, Axios, or YunQi client
methods, or construct `/api/v1/yunqi/**` paths.

Feature `presentation/**` modules consume frozen DTO types for presentation
mapping; current owners are `yunqi/presentation` and `constitution/presentation`. These pure mappers cannot depend on React, TanStack
Query, React Router, or `@yunqi/client`, and they cannot perform transport or
business calculation. DTOs come only from `@yunqi/contracts`; the Workbench
does not depend on Service, Domain, calendar adapters, or generated OpenAPI
implementation modules.

Relative imports must remain inside `apps/yunqi-workbench`. Imports that
escape to repository implementations, absolute local paths, and `file:`
imports are forbidden. Component responsibility is path-based for
`src/components/**`, `src/app/**`, and
`src/features/**/components/**` and `src/features/**/pages/**`, regardless of
file extension.

## Inquiry entry boundary

`/yunqi/inquiry` is an accessible entry, not an implemented inquiry workflow.
Its three semantic `article` cards describe only planned boundaries:

- patient context;
- authorized history viewing and teaching review;
- a future confirmed professional structured-record flow.

Every card is marked `规划中` and contains no link, button, focusable pseudo
control, form, or click behavior. The route mounts no query hook and creates no
patient, inquiry, observation, permission, or audit value. Forbidden child
paths such as `/yunqi/inquiry/patient`, `/yunqi/inquiry/history`, and
`/yunqi/inquiry/new` resolve to the existing not-found page without a client
request.

The five interfaces under `src/features/inquiry/models` are internal,
type-only Context Model boundaries. They are not API DTOs, contracts, database
entities, clinical facts, authorization enforcement, or an invitation to add
generic metadata. Production inquiry pages and components must not import or
instantiate them, and the inquiry feature must not expose a root barrel.

Phase3-C4 does not include patient search or selection, inquiry creation,
observation forms, persistence, permission or audit enforcement, AI analysis,
YunQi correlation, runtime mocks, local storage, a database, child inquiry
routes, or Patient/Inquiry/Observation APIs and query abstractions. A future
real workflow must first be validated with experts, then flow through Service,
OpenAPI, `@yunqi/contracts`, and `@yunqi/client` before React consumes it.

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

The specified-time form accepts only local wall-clock strings in
YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss form and appends +08:00 by pure
string normalization. It does not use a browser time zone or a JavaScript time
API. A valid minute-precision example is
2026-05-20T13:30:00+08:00 on the wire.

The specified-time page has six observable states: idle, invalid-input,
pending, success, dirty-after-success, and error. Errors are sanitized and
retryable; no raw response, stack, patient data, diagnosis, treatment,
prescription, medication, risk, or recommendation copy is rendered.

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

Governed production imports must stay in `src` or use approved public packages.
Runtime imports/re-exports of test, spec, fixture, or skipped output directories
are rejected even through a barrel. Source file links and directory junctions
are rejected, and the HTML module entry remains `/src/main.tsx`. Test helpers
remain usable from tests, but cannot become production dependencies.

Capability acquisition must be statically reviewable: module specifiers must
be literals; indirect require, module-loader factories, dynamic code generation,
and computed global time access are rejected. AST binding checks distinguish
global-object aliases from locally shadowed names. These checks enforce project
source conventions and are not a sandbox for arbitrary hostile JavaScript.

The shared annual summary displays the versioned implementation baseline's
pending expert freeze/validation status. While `rules/RULE_FREEZE_NOTE.md`
remains pending, production copy cannot claim frozen rules. API Contract
freeze is a separate status and does not establish clinical validation.

## Runtime API base URL

Run `pnpm build` from the repository root, then run Service and Workbench in
separate terminals:

```text
pnpm --filter @yunqi/service start
pnpm --filter @yunqi/workbench dev
```

Keep `VITE_YUNQI_API_BASE_URL` unset or empty for this local setup. Vite proxies
`/api/v1/yunqi/` and `/api/v1/constitution/` to
`http://127.0.0.1:3000` without rewriting paths. The browser
sends GET and POST requests to the Workbench origin.

To target a different Service port, create `apps/yunqi-workbench/.env.local`:

```dotenv
YUNQI_DEV_API_TARGET=http://127.0.0.1:3001
```

Restart Vite after changing it. Remove a previous `VITE_YUNQI_API_BASE_URL`
override pointing directly at the local Service, because that bypasses the
same-origin proxy. The proxy target is server-only and is not exposed as a
browser `VITE_` variable. Run `pnpm test:dev-proxy` from the root to verify real
GET, POST and error responses through the development server.

Production hosting must provide its own same-origin API reverse proxy.
`YUNQI_DEV_API_TARGET` does not configure a production proxy. A nonempty
`VITE_YUNQI_API_BASE_URL` is supported for separate origins only when the API
host provides CORS and POST preflight support; Service has no default CORS.
Do not append `/api/v1/yunqi/**` to either origin; the Client owns those paths.


## Birth comparison and constitution assessment

Birth entry uses a public-calendar date and optional known Beijing standard
time. Date-only input never invents an exact birth time in the UI. If the
service returns several boundary-day candidates, every candidate and its
canonical interval is shown beside the current context. Editing or clearing
input immediately removes the old result. These are traditional time
backgrounds, not a constitution diagnosis or an individual disease forecast.

The questionnaire uses the complete service-provided GB/T 46939-2025 version.
The UI does not score, reverse-score, choose thresholds, or use YunQi facts to
change the assessment. Applicable questions have no default answers; the
target layout is one question per screen as specified in the design system.
A sex change clears answers and results. Partial
submission returns focus to the first incomplete group without sending a
scoring request. The nine returned scores and statuses remain separate so
mixed constitutions are not reduced to a single maximum-score label.

Birth inputs, questionnaire answers and results remain in page memory only;
they are not placed in a URL, localStorage, sessionStorage or a patient record.
Sensitive mutations use `gcTime: 0`; leaving their page drops the observer and
releases the cached mutation. Current YunQi queries carry no individual data.

Learning relations and classical excerpts are mapped into display-specific
ViewModels. Their source URLs remain reviewable. Excerpts and modern reading
notes are explicitly separated. The five-movement card visibly labels its
teaching segmentation as pending expert confirmation; the underlying core
rule freeze status is unchanged.
