# Phase3-C2 YunQi Annual Timeline Verification

- Date: 2026-07-21
- Branch: `codex/phase3-c2-yunqi-annual-timeline`
- Explicit base commit: `97829c525e7f5d7bd054ccb0fa2057c7050272c0`
- Implementation verification HEAD:
  `c42c0e27f0258f18ead18c4db86ecf89cf2f546e`
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- Rule version: `YQ-MVP-RULES-1.0.0`
- Node.js: `v22.14.0`
- pnpm: `10.32.1`

## Scope verified

Phase3-C2 adds a desktop annual six-stage overview to the existing read-only
`/current` presentation:

```text
YunQiCalculationDto
  -> pure presentation mapper
  -> SixQiTimelineViewModel
       |-> CurrentStepCard
       |-> AnnualStageRail
       `-> SixQiTimeline details
```

`AnnualStageRail` consumes the canonical six-element timeline model directly.
No Rail-specific data model was added. The mapper preserves API `step.index`
and maps the categorical `completed` / `current` / `upcoming` status once.
Components do not add one, recalculate boundaries, derive duration ratios, or
name transition solar terms.

The desktop Rail has six equal categorical columns. Selecting a stage ensures
its existing disclosure is expanded, preserves other expanded details, keeps
focus on the Rail control, and positions the detail with the default
unanimated scroll behavior. At `46rem` and below the Rail is hidden and the
existing vertical details remain the only navigation surface.

The change does not modify Domain, the tyme4ts adapter, Service, Contracts,
Client, OpenAPI, frozen API paths, wire fields, Contract ID, or Rule version.

## TDD and focused acceptance

Failing tests were observed before implementing:

- stage status mapping and direct API indexes;
- canonical compact `localTime` projection;
- the new Annual Rail facade and accessibility contract;
- Rail-to-detail expansion, positioning, focus and multi-open behavior;
- page-level integration;
- governance mutations for duplicate Rail models and component renumbering.

Focused commands completed with exit code 0:

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
pnpm test:workbench-governance
pnpm test:time-governance
```

| Area | Result |
|---|---:|
| Workbench tests | 19 files, 44 tests passed |
| Workbench governance | 93 tests passed |
| Time governance | 8 tests passed |
| Vite production build | 97 modules transformed |
| JavaScript bundle | 241.56 kB, 75.72 kB gzip |
| CSS bundle | 14.47 kB, 3.55 kB gzip |

Workbench coverage:

| Metric | Result | Threshold |
|---|---:|---:|
| Statements | 99.28% (139/140) | 90% |
| Branches | 89.74% (70/78) | 85% |
| Functions | 100% (69/69) | 90% |
| Lines | 99.27% (137/138) | 90% |

Independent review fixes were verified before delivery:

- each `SixQiTimeline` instance derives a unique `useId()` prefix;
- instance-owned article refs replace global DOM lookup for positioning;
- a two-instance test proves unique ARIA targets and correct-instance scroll;
- automatic current-step changes open the new current detail without scroll;
- governance checks the Rail `steps` prop against the imported canonical
  `SixQiTimelineViewModel` and scopes ordinal-arithmetic rejection to the Rail;
- mutation tests reject direct, callback-position and aliased renumbering while
  allowing unrelated pagination index arithmetic.

## Real API browser verification

The production Workbench build was served through a temporary same-origin
static proxy to the real Fastify service. No runtime fixture, mock response or
fallback data participated.

Desktop viewport `1440x1000`:

- document client width and scroll width were both 1425; there was no
  horizontal overflow;
- the Rail rendered as six columns with computed widths of approximately
  168 px each;
- all six direct API step numbers, status labels and compact canonical times
  were visible;
- the third stage exposed `aria-current="step"` and was expanded;
- selecting stage one expanded its detail while the third detail remained
  open;
- focus remained on the selected Rail control and computed scroll behavior
  was `auto`;
- the equal-width/non-duration disclaimer was visible.

Breakpoint-adjacent viewport `737x900`:

- the Rail remained visible above the approved `46rem` cutoff;
- the document client width and scroll width were both 722;
- the Rail occupied the available 374 px as six equal 62 px columns;
- surrounding panels collapsed without creating document-level overflow.

Mobile viewport `390x844`:

- document client width and scroll width were both 375; there was no
  horizontal overflow;
- the desktop Rail computed to `display: none`;
- all six vertical timeline articles remained present;
- the vertical details exposed two completed, one current and three upcoming
  status labels.

Browser console warning and error arrays were empty in both viewports. The
viewport override was reset, the browser tab was released, and both temporary
servers were stopped after inspection.

## Complete repository acceptance

The complete command matrix completed with exit code 0:

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
pnpm test:workbench-governance
pnpm test:time-governance
pnpm test:time-purity
pnpm contracts:check
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm openapi:validate
git diff --check
git diff --check 97829c525e7f5d7bd054ccb0fa2057c7050272c0..HEAD
```

Selected repository results:

| Area | Result |
|---|---:|
| Domain tests | 132 passed |
| tyme4ts adapter tests | 37 passed |
| Client tests | 8 passed |
| Service tests | 136 passed |
| Workbench tests | 44 passed |
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
| `@yunqi/workbench` | 99.28% | 89.74% | 100% | 99.27% |

OpenAPI validation retained exactly the three approved non-blocking warnings:

1. the local development server URL;
2. `/health` has no `4XX` response;
3. `YearParams` is unused.

No warning was added.

## Frozen-boundary evidence

The explicit base-to-HEAD path inspection contains only Workbench source,
Workbench governance tests/scripts, README, design, implementation plan and
this verification artifact. The following package paths had no diff:

```text
packages/yunqi-domain
packages/calendar-adapters/tyme4ts
packages/yunqi-service
packages/yunqi-contracts
packages/yunqi-client
```

Therefore Phase3-C2 remains a presentation-only visualization change and
preserves the frozen API and rule boundaries.
