# Phase3-A API Contract Freeze Verification

- Date: 2026-07-17
- Base commit: `f19199f`
- Implementation commit: `8acae42`
- Branch: `main`
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- OpenAPI document version: `1.2.0`
- Rule version: `YQ-MVP-RULES-1.0.0`

## Scope verified

- `@yunqi/contracts` `1.0.0` owns the generated-type-derived public DTO
  facade and exact contract baseline.
- `@yunqi/client` `1.0.0` owns the framework-independent transport and query
  helpers.
- `@yunqi/service` `2.0.0` remains the runtime schema source and no longer
  exports `@yunqi/service/contracts`.
- The three `/api/v1/yunqi/**` operations retain their existing paths,
  methods, status codes, request body, and JSON wire fields.
- `YunQiCalendarTimeDto` is replaced by the single OpenAPI component
  `YunQiTimeDto`; calculation output continues to use `input`.
- No React application, database schema, or inquiry feature was added.

## Verification commands

All commands completed successfully from `D:\Projects\YunQi`:

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

`pnpm contracts:check` was repeated after implementation commit `8acae42`,
so the registry and baseline were present in actual Git history. The gate
successfully validated:

- registry IDs are append-only across full Git history;
- every registered baseline exists and has the matching embedded Contract ID;
- unregistered baseline files are rejected;
- every historical baseline still matches its first registered canonical
  content;
- tracked OpenAPI YAML and generated TypeScript are current;
- package dependency direction is valid.

## Test and coverage evidence

Runtime and governance test results:

| Area | Result |
|---|---:|
| `@yunqi/domain` | 132 passed |
| tyme4ts adapter | 37 passed |
| `@yunqi/client` | 8 passed |
| `@yunqi/service` | 136 passed |
| Contract governance | 12 passed |
| Time governance | 7 passed |
| OpenAPI schema contract | 4 passed |

Coverage:

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `@yunqi/domain` | 96.15% | 90.98% | 100% | 96.13% |
| `@yunqi/client` | 100% | 100% | 100% | 100% |
| `@yunqi/service` | 97.43% | 88.70% | 100% | 98.69% |

The client exceeds its required 90/85/90/90 thresholds.

OpenAPI validation passed with exactly the three pre-existing non-blocking
Redocly warnings:

1. localhost development server URL;
2. `/health` has no `4XX` response;
3. `YearParams` is unused.

No warning was added.

## Change-boundary evidence

- `git diff --exit-code -- packages/yunqi-domain
  packages/calendar-adapters/tyme4ts` returned no diff.
- Domain and tyme4ts adapter tests remain fully green; Phase1 rules and
  provider epochs were not modified.
- The OpenAPI YAML diff contains only:
  - document version `1.1.0` to `1.2.0`;
  - component rename and references from `YunQiCalendarTimeDto` to
    `YunQiTimeDto`;
  - root `x-yunqi-contract-id`.
- Search across package sources and manifests found no remaining
  `@yunqi/service/contracts` runtime or type entry.

## Remote enforcement follow-up

The checked-in workflow defines the required `quality-gates` job with full
Git history and the approved command order. Remote enforcement must be
performed only after this verification record reaches GitHub:

1. push `main`;
2. wait for `quality-gates` to pass on the pushed commit;
3. require `quality-gates` for `main`;
4. require pull requests and include administrators;
5. disable force pushes and branch deletion;
6. read the protection configuration back from GitHub.

The task completion report is the authoritative evidence for this remote
state; this record does not claim branch protection before it has been
confirmed.
