# Phase3-C3 YunQi Annual Analysis Verification

- Date: 2026-07-21
- Branch: `codex/phase3-c3-annual-analysis`
- Explicit implementation base commit:
  `7e9a0904882ccddeb79f9b9f533fb2b65d422dd7`
- Final verified code HEAD before this record update:
  `9b60a52b6fa3af78e5e93c4d8ba5e7bf60144605`
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- Rule version: `YQ-MVP-RULES-1.0.0`
- Node.js: `v22.14.0`
- pnpm: `10.32.1`

## Scope verified

Phase3-C3 adds approved client-side routes and a read-only annual analysis
presentation to the existing Workbench:

```text
/yunqi/current
  -> current query options
  -> current-status ViewModel
  -> current presentation

/yunqi/year/:year
  -> route year validator
  -> annual query options
  -> YunQi client and frozen contract DTO
  -> neutral annual ViewModel
  -> year summary + six-stage selector + one detail region
```

The selected year is URL-owned. The selected annual stage remains local-only
presentation state and does not alter the URL. `/yunqi/year` is an entry page
and performs no annual request. Invalid or out-of-range route parameters are
rejected before the annual query component mounts.

The annual mapper uses the same API facts as the current mapper while omitting
the current-only `completed` / `current` / `upcoming` status projection. Annual
components display no such status language. Explanation and traceability are
separate panels. Business time is displayed from the canonical API
`localTime` and labeled `北京时间 UTC+08`; it is not reconstructed from epoch,
browser locale, `Date`, Temporal, Intl or an IANA timezone.

The only new runtime dependency is the approved and exactly pinned
`react-router-dom@7.18.1`. No chart library, second React application, database
table, inquiry feature, API field, runtime response fixture or mock fallback
was introduced.

## TDD corrections and focused acceptance

Browser verification identified exact-copy deviations that existing tests had
not enforced. Tests were changed first and observed failing before the minimum
production correction:

- invalid format now says `年份格式错误，请选择四位年份`;
- out-of-range now says `年份范围应为 1901–2099`;
- annual pending now says `正在加载 {year} 年年度五运六气数据`;
- annual empty now says `该年度暂无可展示数据`.

The root redirect assertion also proved flaky only under multi-file/full-suite
load: the redirect was correct, and isolated runs passed, but the default
one-second Testing Library wait could expire. Its assertion timeout was
stabilized at five seconds. The final focused and repository suites below were
then rerun and passed.

Focused commands completed with exit code 0:

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
pnpm test:workbench-governance
pnpm test:time-governance
```

| Area | Result |
|---|---:|
| Workbench tests | 25 files, 77 tests passed |
| Workbench governance | 194 tests passed |
| Time governance | 8 tests passed |
| Vite production build | 122 modules transformed |
| JavaScript bundle | 289.65 kB, 91.60 kB gzip |
| CSS bundle | 17.61 kB, 3.94 kB gzip |

Workbench coverage exceeds every required threshold:

| Metric | Result | Threshold |
|---|---:|---:|
| Statements | 99.48% (193/194) | 90% |
| Branches | 93.13% (95/102) | 85% |
| Functions | 100% (96/96) | 90% |
| Lines | 99.47% (191/192) | 90% |

## Real API browser verification

The production Workbench build was served through a temporary, uncommitted
same-origin static proxy to the real Fastify service. The proxy forwarded
`/api/**` and provided SPA fallback only. It did not intercept responses or
provide fixtures, mocks or fallback facts. Temporary read-only instrumentation
reported viewport and document widths. The proxy file was deleted and both
verified server PIDs were stopped after the inspection; ports 3000 and 4173
had no remaining listeners.

Route and state evidence:

- `/` replaced itself with `/yunqi/current`;
- `/yunqi/current` loaded the real current response, opened the current stage
  by default and retained the C2 multiple-disclosure behavior;
- `/yunqi/year` made no annual request;
- `/yunqi/year/abc` displayed `年份格式错误，请选择四位年份`, and
  `/yunqi/year/2100` displayed `年份范围应为 1901–2099`; neither route made an
  API request;
- `/yunqi/year/2026` loaded the real annual response;
- selecting 2027 changed the URL, displayed the year-specific pending state
  without retained 2026 facts, then loaded the real 2027 response;
- browser Back restored the 2026 URL and annual result;
- the annual presentation exposed six native radios, one checked stage and
  one detail region; changing the checked radio changed that single detail;
- no annual stage displayed current/completed/upcoming language.

Viewport evidence:

| Requested viewport | `innerWidth` x `innerHeight` | `clientWidth` | `scrollWidth` | Result |
|---|---:|---:|---:|---|
| Desktop | 1440 x 1000 | 1425 | 1425 | no horizontal overflow |
| Breakpoint-adjacent | 737 x 900 | 722 | 722 | no horizontal overflow; 6 radios, 1 checked detail |
| Mobile | 390 x 844 | 375 | 375 | no horizontal overflow; 6 radios, 1 checked detail |

The in-app browser confirmed the real DOM focus/checked state and detail
change. Its backend could not synthesize Arrow/Space keyboard presses, so this
record does not claim a browser-generated Arrow/Space event. A native-radio
component test confirms that ArrowRight moves focus, selection and the single
detail from the first stage to `二之气`. Space activation remains the browser's
native radio behavior; the available IAB and JSDOM backends could not directly
synthesize and observe that default action. The focused component test and
final 77-test Workbench suite passed.

Console warning and error arrays were empty at all three viewports. Fastify
logs contained only the expected valid current and annual requests; no annual
request appeared for the entry or invalid-year routes.

## Post-browser final review corrections

Independent final review found that the shared application shell still used
the current-route phrase `当前视图 · 只读` while rendering annual routes. The
global status was changed to the route-neutral `临床教学工作台 · 只读`, and the
annual AppShell test now requires that neutral text and rejects `当前视图`.
This copy-only correction was covered by the focused AppShell/AppRoutes tests
and the final Workbench and repository suites; the earlier real-API browser
session is not misrepresented as having observed the later correction.

The same review found two simple ordinal-governance bypasses through aliased
callback positions and static bracket access. Annual `stages`/`steps` mapping
is now limited to a one-identifier inline arrow callback, and static `.map`,
`['map']`, and bracket receivers are all recognized. Mutation tests cover
position aliases, bracket access, function `arguments[1]`, and rest
parameters. The final governance suite contains 194 passing tests and reports
zero production violations. The reviewer found no remaining Critical or
Important issue at the final code HEAD.

## Complete repository acceptance

Every required command completed with exit code 0 after the final production
and test changes:

```text
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm test:time-governance
pnpm test:time-purity
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm openapi:validate
git diff --check
```

Selected final test results:

| Area | Result |
|---|---:|
| Domain tests | 10 files, 132 tests passed |
| tyme4ts adapter tests | 3 files, 37 tests passed |
| Client tests | 1 file, 8 tests passed |
| Service tests | 13 files, 136 tests passed |
| Workbench tests | 25 files, 77 tests passed |
| Workbench governance | 194 tests passed |
| Contract governance | 12 tests passed |
| OpenAPI schema contract | 1 file, 4 tests passed |
| Service timezone independence | passed |
| Service production entry smoke | passed |

Repository coverage:

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `@yunqi/domain` | 96.15% | 90.98% | 100% | 96.13% |
| `@yunqi/client` | 100% | 100% | 100% | 100% |
| `@yunqi/service` | 97.43% | 88.70% | 100% | 98.69% |
| `@yunqi/workbench` | 99.48% | 93.13% | 100% | 99.47% |

OpenAPI validation retained exactly the three pre-existing non-blocking
warnings:

1. `servers[0].url` is the local development URL
   (`no-server-example.com`);
2. `/health` has no `4XX` response (`operation-4xx-response`);
3. `YearParams` is unused (`no-unused-components`).

No new OpenAPI warning was added.

## Frozen-boundary and scope evidence

The following command returned no paths against the explicit implementation
base:

```text
git diff --name-status \
  7e9a0904882ccddeb79f9b9f533fb2b65d422dd7 -- \
  packages/yunqi-domain \
  packages/calendar-adapters/tyme4ts \
  packages/yunqi-service \
  packages/yunqi-contracts \
  packages/yunqi-client
```

This includes zero diff under `packages/yunqi-service/openapi`. The complete
base diff contains only the existing Workbench application, its package and
lockfile update for Router 7.18.1, Workbench governance scripts/tests, and
documentation. The dependency diff adds Router only; targeted searches found
no database/inquiry/migration path, API schema or OpenAPI change, runtime
fixture/mock response, direct component fetch/Axios usage, or chart dependency.

Therefore Phase3-C3 remains inside the approved routing and presentation
scope, preserves the frozen Contract ID and Domain rules, and maintains the
fixed-Beijing-time and medical-safety boundaries.
