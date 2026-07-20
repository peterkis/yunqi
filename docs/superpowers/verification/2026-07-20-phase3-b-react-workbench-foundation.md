# Phase3-B React Workbench Foundation Verification

- Date: 2026-07-20
- Branch: `codex/phase3-b-react-workbench`
- Explicit base commit: `54dcf99a926b3d88a4bfb7d5416b53608e7f6a22`
- Whole-branch review HEAD:
  `afa96057528c5f5efec055b16aff020ad5d6e02b`
- Final-review fixes verification HEAD: the fresh commit containing this
  record, `fix(workbench): close final governance review`
- Merge base: `54dcf99a926b3d88a4bfb7d5416b53608e7f6a22`
- Contract ID: `YQ-API-CONTRACT-1.0.0`
- OpenAPI document version: `1.2.0`
- Rule version: `YQ-MVP-RULES-1.0.0`
- Node.js: `v22.14.0`
- pnpm: `10.32.1`

## Scope verified

Phase3-B adds a runnable React/Vite Workbench foundation that consumes only
the public `@yunqi/contracts` and `@yunqi/client` boundary. It adds the
provider composition, non-routing shell, query hooks, sanitized feedback and
render-error states, fixed-Beijing-time display, tests, and repository
governance required by the approved design.

It does not add a calculation business page, Router or Next.js runtime,
database schema, inquiry workflow, expert review, rule management, diagnosis,
syndrome differentiation, prescription, or treatment guidance.

## Exact dependency versions

Runtime:

| Dependency | Version |
|---|---:|
| `@tanstack/react-query` | `5.101.2` |
| `@yunqi/client` | `workspace:*` (`1.0.0`) |
| `@yunqi/contracts` | `workspace:*` (`1.0.0`) |
| `react` | `19.2.7` |
| `react-dom` | `19.2.7` |

Development and test toolchain:

| Dependency | Version |
|---|---:|
| `@testing-library/jest-dom` | `6.9.1` |
| `@testing-library/react` | `16.3.2` |
| `@testing-library/user-event` | `14.6.1` |
| `@types/react` | `19.2.17` |
| `@types/react-dom` | `19.2.3` |
| `@vitejs/plugin-react` | `6.0.3` |
| `@vitest/coverage-v8` | `4.1.10` |
| `jsdom` | `29.1.1` |
| `typescript` | `7.0.2` |
| `vite` | `8.1.5` |
| `vitest` | `4.1.10` |

## Focused Workbench acceptance

All focused commands completed successfully:

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench test:typecheck
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
```

Results:

- Vitest: 12 test files and 21 tests passed.
- Production and test TypeScript checks completed with no errors.
- Vite 8.1.5 transformed 75 modules and produced
  `apps/yunqi-workbench/dist/index.html` (398 bytes).
- Production assets were CSS 5.85 kB (1.94 kB gzip) and JavaScript
  220.85 kB (69.35 kB gzip).

Workbench coverage:

| Metric | Result | Threshold |
|---|---:|---:|
| Statements | 98.18% (54/55) | 90% |
| Branches | 85.29% (29/34) | 85% |
| Functions | 100% (27/27) | 90% |
| Lines | 98.18% (54/55) | 90% |

## Final governance review closure

The final review identified three executable governance gaps plus one static
HTML language correction. They were closed with a fresh RED/GREEN cycle on
the final-review fixes tree.

Initial RED command:

```text
node --test tests/yunqi-workbench-governance.test.mjs
```

Exact RED result: exit 1; 53 tests ran, 45 passed, and 8 failed for the
expected missing behavior:

- production static, dynamic, and `require` imports of a devDependency-only
  `runtime-helper` were not rejected;
- an npm alias named `runtime-helper` was not rejected when imported by that
  non-allowlisted package root;
- an `index.html` fixture with `lang="en"` was not rejected;
- component ObjectPattern destructuring of `getCurrent`, `getYear`, and
  `calculate` from a generic `api` receiver was not rejected.

After the checker implementation but before changing the production HTML,
the same command ran 53 tests with 52 passing and one expected failure:
the production checker reported
`apps/yunqi-workbench/index.html: document language must be zh-CN`.

Final GREEN evidence:

```text
pnpm test:workbench-governance
```

Result: exit 0; 53/53 governance tests passed and the production governance
CLI reported zero violations. The checker now extracts static imports and
re-exports, dynamic imports, and `require` calls. In production `src` files,
excluding `*.test.*`, `*.spec.*`, and `src/test/**`, every non-type-only bare
runtime specifier is reduced to its package root and must match exactly one of
the five frozen runtime packages. Development/test source and root tool
configuration remain outside that runtime-source rule, and production
type-only imports/re-exports remain allowed.

Component responsibility paths now reject ObjectPattern destructuring of
`getCurrent`, `getYear`, or `calculate` independently of the right-hand-side
identifier. The ordinary DTO field-access fixture remains accepted.

Workbench document-language evidence is static and executable:

- source `apps/yunqi-workbench/index.html` line 2 is
  `<html lang="zh-CN">`;
- the fresh Vite build emitted the same `<html lang="zh-CN">` in
  `apps/yunqi-workbench/dist/index.html`;
- the wrong-language mutation fails governance while a `zh-CN` fixture and
  fixtures without an index file pass.

The browser interaction inspection below was not repeated for this static
language-attribute-only change.

Fresh final-review command matrix, all with exit code 0:

```text
pnpm test:workbench-governance
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench test:typecheck
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench build
pnpm --filter @yunqi/workbench test:coverage
pnpm test:time-governance
pnpm contracts:check
pnpm schema:validate
pnpm openapi:validate
pnpm test
pnpm typecheck
pnpm test:coverage
```

The exact committed-range whitespace command was rerun after the final fixes
commit:

```text
git diff --check 54dcf99..HEAD
```

Result: exit 0 with no output. This checks the complete Phase3-B committed
range, not only the final working-tree delta.

## Browser inspection

The Vite application was inspected at `http://127.0.0.1:4173`.

Desktop viewport `1440x900`:

- exactly one `header`, `nav`, and `main` rendered;
- `theme-root` began with `data-theme="light"`;
- there were zero anchor links;
- the disabled placeholders rendered as `待五运六气` and `待问诊`;
- `documentWidth=1425` was no greater than viewport width 1440.

After clicking the only button, whose accessible label was
`切换至深色主题`, `data-theme` became `dark`, computed `colorScheme` became
`dark`, and the label changed to `切换至浅色主题`.

Mobile viewport `390x844`:

- document and body width were 375, with no horizontal overflow;
- exactly one `header`, `nav`, and `main` remained;
- there were zero anchor links;
- both placeholders remained `SPAN` elements with `aria-disabled`;
- the shell used its single-column layout and retained the dark theme.

Visual inspection found the warm paper, ink, and restrained cinnabar
editorial treatment readable at desktop width and the dark mobile treatment
clear and restrained.

The browser inventory contained 24 scripts and 1 stylesheet, with no other
resource category. Zero assets or requests matched `/api/v1/yunqi/`, so the
foundation Home screen issued no YunQi business API request. Browser console
warning and error arrays were empty.

After inspection, the viewport was reset, the test tab was closed, the dev
server was stopped, and port 4173 had zero remaining listeners.

## Complete repository acceptance

All required commands completed with exit code 0:

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

Selected exact results:

| Area | Result |
|---|---:|
| Frozen install | 7 workspace projects; lockfile already current |
| Domain tests | 132 passed |
| tyme4ts adapter tests | 37 passed |
| Client tests | 8 passed |
| Service tests | 136 passed |
| Workbench tests | 21 passed |
| Workbench governance | 53 passed |
| Contract governance | 12 passed |
| Time governance | 8 passed |
| OpenAPI schema contract | 4 passed |
| Domain time purity | 27 files passed |
| Service timezone independence | passed |
| Service production entry smoke | passed |

Repository coverage:

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| `@yunqi/domain` | 96.15% | 90.98% | 100% | 96.13% |
| `@yunqi/client` | 100% | 100% | 100% | 100% |
| `@yunqi/service` | 97.43% | 88.70% | 100% | 98.69% |
| `@yunqi/workbench` | 98.18% | 85.29% | 100% | 98.18% |

OpenAPI validation passed with exactly the three existing non-blocking
Redocly warnings:

1. `no-server-example.com` at `#/servers/0/url`: the development server URL
   is localhost.
2. `operation-4xx-response` at `#/paths/~1health/get/responses`: `/health`
   has no `4XX` response.
3. `no-unused-components` at `#/components/schemas/YearParams`:
   `YearParams` is unused.

No warning was added.

## Immutable and phase-boundary evidence

The following explicit-baseline commands returned exit code 0 with no diff:

```text
git diff --exit-code 54dcf99...HEAD -- packages/yunqi-domain packages/calendar-adapters/tyme4ts packages/yunqi-service packages/yunqi-contracts packages/yunqi-client
git diff --exit-code 54dcf99...HEAD -- packages/yunqi-service/openapi/yunqi-service.openapi.yaml
```

Therefore Domain rules, the tyme4ts adapter, Service, contracts, client, and
the frozen OpenAPI document are byte-unchanged from the Phase3-A base.

The branch contained 50 changed files before this record was added. A changed
path audit found zero Router, Next.js page, database/schema/migration, inquiry
workflow, expert-review, or rule-management files. A Workbench manifest and
source audit found zero Next.js, React Router, Prisma, TypeORM, or Sequelize
dependency/import hits. `src/app/routes.ts` contains navigation metadata
only: active Home plus disabled YunQi and inquiry placeholders.

## Definition of Done trace

| Requirement | Evidence |
|---|---|
| Dev application starts | Vite served `http://127.0.0.1:4173`; browser inspection completed; server stopped cleanly |
| Browser build exists | Focused build passed; `dist/index.html` exists |
| Shell, providers, queries, feedback, and time behavior | 12 Workbench files and 21 tests passed |
| Public contract types only | Workbench `test:typecheck` passed; dependency governance passed |
| Forbidden patterns rejected | Workbench governance 53/53 and time governance 8/8 mutation tests passed |
| Root gates pass | Install, contracts, tests, typecheck, coverage, schema, OpenAPI, and diff checks all passed |
| Responsive/theme/runtime browser behavior | Desktop and mobile inspection passed with zero console warnings/errors, zero overflow, and zero business API requests |
| Frozen inputs unchanged | Both explicit `54dcf99...HEAD` immutable diff commands returned zero diff |

No verification gate failed, and Task 8 required no repair to Tasks 1-7.
