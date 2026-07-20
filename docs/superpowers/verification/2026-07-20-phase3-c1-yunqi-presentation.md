# Phase3-C1 YunQi Presentation Verification

- Date: 2026-07-20
- Branch: `codex/phase3-c1-yunqi-presentation`
- Explicit base commit: `d02c746a1e678c594e0fcb0b847ed2f135f2d568`
- Implementation verification HEAD:
  `9430901a0e4d375cf332b871ac75e6940b05d875`
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- Rule version: `YQ-MVP-RULES-1.0.0`
- Node.js: `v22.14.0`
- pnpm: `10.32.1`

## Scope verified

Phase3-C1 completes the first real read-only Workbench slice:

```text
/current
  -> TanStack Query hook
  -> YunQiCalculationDto
  -> pure presentation mapper
  -> CurrentYunQiViewModel
  -> presentational components
```

The implementation includes the current-time summary, annual frame, current
six-qi step, full six-step disclosure timeline, API theory explanations,
rule-version traceability, shared presentation primitives, asynchronous
states, responsive layout, and light/dark themes.

It does not add a router, form, year selector, runtime mock, database or
inquiry feature. It does not change Domain rules, tyme4ts epochs, Service,
Contracts, Client, the frozen OpenAPI document, or the API wire shape.

## TDD and focused acceptance

The mapper, shared primitives, feedback states, timeline behavior, current
page, `/current` integration, and governance mutations were each introduced
with a failing test before their implementation.

All focused commands completed with exit code 0:

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
pnpm test:workbench-governance
pnpm test:time-governance
```

Results:

| Area | Result |
|---|---:|
| Workbench tests | 18 files, 38 tests passed |
| Workbench governance | 59 tests passed |
| Time governance | 8 tests passed |
| Vite production build | 95 modules transformed |
| JavaScript bundle | 239.37 kB, 75.05 kB gzip |
| CSS bundle | 12.32 kB, 3.20 kB gzip |

Workbench coverage:

| Metric | Result | Threshold |
|---|---:|---:|
| Statements | 99.12% (113/114) | 90% |
| Branches | 87.30% (55/63) | 85% |
| Functions | 100% (61/61) | 90% |
| Lines | 99.10% (111/112) | 90% |

## Presentation and governance evidence

- `YunQiCalculationDto` is consumed only by the pure mapper.
- Feature components consume ViewModels and do not import DTO types.
- The time ViewModel contains canonical `localTime`, the fixed calendar-time
  standard, and the display label `北京时间 UTC+08`; it does not expose
  `epochMilliseconds`.
- Current-step ownership comes from `currentStep.index`; the UI does not
  recalculate boundary membership.
- Six timeline items remain a readonly six-element tuple.
- Relationship codes are exhaustively mapped to neutral Chinese labels.
- API `traditionalLabel`, explanations, local times, and rule version are
  preserved for display without new medical or traditional-theory claims.
- Component responsibility paths reject DTO, client, fetch, and direct API
  access. Presentation mapper paths reject React, Query, and Client
  dependencies.
- Existing time governance rejects `Date`, Temporal, Intl, IANA timezone, and
  epoch-based display reinterpretation in Workbench production source.

## Browser inspection against the real API

The built Workbench was served at `http://127.0.0.1:4173` through a temporary
static proxy to the real Fastify service at `http://127.0.0.1:3000`.
No runtime mock or fallback data participated.

The live `/current` response rendered:

- canonical fixed-Beijing input time;
- the 2026 `丙午` annual frame;
- sui-yun, si-tian, and zai-quan facts;
- the current `三之气`;
- all six timeline nodes and structured host/guest relation details;
- API explanations and rule-version traceability.

Desktop viewport `1440x1000`:

- document and client widths were both 1425, with no horizontal overflow;
- the current third step was expanded by default;
- opening the first step left both first and third details expanded;
- disclosure buttons exposed matching `aria-expanded` and `aria-controls`;
- the theme toggle changed `data-theme` from `light` to `dark` and changed its
  accessible label to `切换至浅色主题`.

Mobile viewport `390x844`:

- document and client widths were both 375, with no horizontal overflow;
- the shell and summary switched to the intended single-column layout;
- navigation, canonical time, and primary YunQi content remained readable.

Browser console warning and error arrays were empty in both viewports.
The viewport was reset, the tab was closed, and both temporary servers were
stopped after inspection.

## Complete repository acceptance

The full command matrix completed with exit code 0:

```text
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm test:time-governance
pnpm test:time-purity
pnpm test:workbench-governance
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm openapi:validate
git diff --check
```

Selected repository results:

| Area | Result |
|---|---:|
| Domain tests | 132 passed |
| tyme4ts adapter tests | 37 passed |
| Client tests | 8 passed |
| Service tests | 136 passed |
| Workbench tests | 38 passed |
| Contract governance | 12 passed |
| OpenAPI schema contract | 4 passed |
| Service timezone independence | passed |
| Service production entry smoke | passed |

Repository coverage:

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `@yunqi/domain` | 96.15% | 90.98% | 100% | 96.13% |
| `@yunqi/client` | 100% | 100% | 100% | 100% |
| `@yunqi/service` | 97.43% | 88.70% | 100% | 98.69% |
| `@yunqi/workbench` | 99.12% | 87.30% | 100% | 99.10% |

OpenAPI validation retained exactly the three approved non-blocking warnings:

1. the local development server URL;
2. `/health` has no `4XX` response;
3. `YearParams` is unused.

No warning was added.

## Frozen-boundary evidence

Both explicit-baseline commands completed with exit code 0 and no diff:

```text
git diff --exit-code main...HEAD -- packages/yunqi-domain packages/calendar-adapters/tyme4ts packages/yunqi-service packages/yunqi-contracts packages/yunqi-client
git diff --exit-code main...HEAD -- packages/yunqi-service/openapi/yunqi-service.openapi.yaml
```

Therefore the Phase3-C1 change is confined to Workbench presentation,
governance, README, design, implementation-plan, and verification artifacts.
