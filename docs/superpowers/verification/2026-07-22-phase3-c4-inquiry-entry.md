# Phase3-C4 Inquiry Entry Verification

- Date: 2026-07-22
- Branch: `codex/phase3-c4-inquiry-entry`
- Explicit implementation base commit:
  `0e23c9914592865be58df418eaaef358802f4f58`
- Final verified code HEAD before this record:
  `618e8e836242734aa05bd653afe4688ecf3d86e6`
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- Rule version: `YQ-MVP-RULES-1.0.0`
- Node.js: `v22.14.0`
- pnpm: `10.32.1`

## Scope verified

Phase3-C4 adds one read-only Workbench entry:

```text
/yunqi/inquiry
  -> InquiryEntryPage
  -> three semantic planning cards
  -> zero business query or persistence
```

The entry is accessible, but no inquiry workflow is implemented. The page
contains the approved fixed heading, safety explanation, future-capability
panel, and three `规划中` cards for patient context, history, and a future
structured record. The cards contain no link, button, form, click handler,
focusable pseudo-control, patient instance, mock fact, or service state.

The five approved Workbench-only Context Models are readonly type boundaries.
They are not API DTOs, OpenAPI schemas, service entities, authorization
enforcement, audit persistence, or medical facts. The feature has no root
barrel, and production inquiry pages/components neither import nor instantiate
the models.

No patient search or selection, inquiry creation, observation form, storage,
permission enforcement, audit persistence, AI analysis, YunQi correlation,
inquiry child route, API, client method, query hook, runtime mock, localStorage,
database, or production dependency was added.

## TDD and governance evidence

The implementation was developed through observed RED/GREEN cycles:

- model type tests first failed on missing Context Model modules and then
  passed with the exact five readonly interfaces;
- route/navigation tests first proved `/yunqi/inquiry` was NotFound and its
  navigation disabled, then passed after the minimum route and page change;
- 12 initial governance mutations first passed unexpectedly, demonstrating
  the missing controls, then failed after AST governance was implemented;
- fixture-exclusion tests first exposed over-broad inquiry copy scanning and
  then passed after `.fixture.*` and `fixtures/` were excluded.

Final Workbench governance contains 213 passing tests. It enforces:

- Page responsibility alongside existing component responsibility;
- no direct DTO, client, fetch, client-method, or API-path capability in Pages;
- exact interface names, members, readonly/optional flags and primitive types;
- a five-entry type-only internal model index and no feature-root export;
- no Context Model imports in production inquiry Pages or components;
- medical-decision keyword checks only in statically visible JSX text and
  visible attributes, excluding identifiers, comments, tests, fixtures and
  documentation.

## Workbench acceptance

All focused commands completed with exit code 0:

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
| Workbench tests | 26 files, 83 tests passed |
| Workbench governance | 213 tests passed |
| Time governance | 8 tests passed |
| Vite production build | 124 modules transformed |
| JavaScript bundle | 291.03 kB, 92.16 kB gzip |
| CSS bundle | 18.66 kB, 4.07 kB gzip |

Workbench coverage exceeds every required threshold:

| Metric | Result | Threshold |
|---|---:|---:|
| Statements | 99.48% (195/196) | 90% |
| Branches | 92.15% (94/102) | 85% |
| Functions | 100% (98/98) | 90% |
| Lines | 99.48% (193/194) | 90% |

One initial full Workbench run produced seven unrelated five-second timeouts
across existing bootstrap, current, timeline and annual tests. The same failed
set then passed 22/22, and the unchanged exact full command passed 83/83. No
timeout or production code was changed; the evidence is consistent with a
transient Windows parallel-load event rather than a logic regression.

## Production browser verification

The production Vite build was served locally with `vite preview`. The in-app
browser inspected `/yunqi/inquiry` at all required viewports:

| Requested viewport | `innerWidth` x `innerHeight` | `clientWidth` | `scrollWidth` | Grid | Result |
|---|---:|---:|---:|---:|---|
| Desktop | 1440 x 1000 | 1425 | 1425 | 3 columns | no horizontal overflow |
| Medium | 737 x 900 | 722 | 722 | 2 columns | no horizontal overflow |
| Mobile | 390 x 844 | 375 | 375 | 1 column | no horizontal overflow |

At every viewport the page contained exactly three `article` elements, zero
focusable elements inside the capability grid, a visible main region, and
`aria-current="page"` on the inquiry navigation link. The document-order
focusable list contained only the theme button followed by the three existing
navigation links; no capability card added an interactive stop. The browser
backend did not synthesize an observable Tab focus move, so this record does
not claim a browser-generated Tab event. DOM focusability evidence and the
passing component tests cover the intended order without inventing an event.

Each forbidden route retained its URL, rendered `页面未找到`, and recorded no
API resource:

```text
/yunqi/inquiry/patient
/yunqi/inquiry/history
/yunqi/inquiry/new
```

The production inquiry route and the three forbidden routes recorded no
`/api/` resource, and the browser console contained zero warning or error.
The preview process was stopped and the temporary viewport override reset.

## Complete repository acceptance

Every required command completed with exit code 0:

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

Selected final results:

| Area | Result |
|---|---:|
| Domain tests | 10 files, 132 tests passed |
| tyme4ts adapter tests | 3 files, 37 tests passed |
| Client tests | 1 file, 8 tests passed |
| Service tests | 13 files, 136 tests passed |
| Workbench tests | 26 files, 83 tests passed |
| Workbench governance | 213 tests passed |
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
| `@yunqi/workbench` | 99.48% | 92.15% | 100% | 99.48% |

OpenAPI validation retained exactly the three approved pre-existing warnings:

1. local development server URL (`no-server-example.com`);
2. `/health` has no `4XX` response (`operation-4xx-response`);
3. `YearParams` is unused (`no-unused-components`).

No warning was added.

## Frozen-boundary evidence

The following path set had zero diff against the explicit implementation
base:

```text
packages/yunqi-domain
packages/calendar-adapters/tyme4ts
packages/yunqi-service
packages/yunqi-contracts
packages/yunqi-client
packages/yunqi-service/openapi
package.json
pnpm-lock.yaml
```

Therefore Phase3-C4 remains inside the approved Workbench-entry and governance
scope, preserves the frozen Contract and Domain rules, and does not represent
planned inquiry capabilities as implemented clinical functionality.
