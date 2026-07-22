# Phase3-C4 Inquiry Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real, read-only `/yunqi/inquiry` Workbench entry with five minimal internal Context Models and governance that prevents the entry from becoming an invented inquiry workflow or medical model.

**Architecture:** React Router owns the exact entry URL. `InquiryEntryPage` renders three static, non-interactive planned capabilities and makes no request. Internal Context Models are type-only future boundaries; AST governance freezes their minimal shape and keeps them out of contracts, clients, and production presentation code.

**Tech Stack:** React 19.2.7, React Router DOM 7.18.1, TypeScript 7.0.2, Vite 8.1.5, Vitest 4.1.10, Testing Library 16.3.2, pnpm 10.32.1, Node.js 22.

## Global Constraints

- Implement only in Workbench source/tests/styles, root Workbench governance/tests, `AGENTS.md`, Workbench README, and Phase3-C4 specification/verification documents.
- Do not change Domain, calendar adapter, Service, Contracts, Client, OpenAPI, Contract freeze, package manifests, or lockfile.
- Do not add an API, Query Hook, form, mock record, storage, child route, role model, permission enforcement, persistence, AI analysis, or YunQi correlation.
- Production pages/components must not import or instantiate Context Models.
- Use TDD: every behavior or governance rule begins with a focused failing test and reaches green before the next task.
- Preserve the four user-owned untracked artifacts in the main worktree.

---

### Task 1: Freeze the five internal Context Models

**Files:** Create the five `features/inquiry/models/*.ts` files, a type-only `models/index.ts`, and `src/test/inquiry-context.typecheck.ts`.

- [ ] Add positive and negative type assertions for exact fields, readonly members, optional members, and forbidden properties.
- [ ] Run `pnpm --filter @yunqi/workbench test:typecheck` and verify RED because modules are absent.
- [ ] Add the minimal interfaces and type-only model index. Do not add a feature-root index.
- [ ] Run Workbench typechecks and verify GREEN.
- [ ] Commit `feat(workbench): add inquiry context boundaries`.

### Task 2: Add the exact entry route and static page

**Files:** Create `InquiryCapabilityCard.tsx`, `InquiryEntryPage.tsx`, and their tests; modify routes, AppRoutes, shell tests, and global CSS.

- [ ] Add RED tests for the heading, three articles, planned status, no controls, zero Client calls, active navigation, and rejected child paths.
- [ ] Confirm focused Vitest failures are caused by the missing route/page.
- [ ] Add the exact route, enable navigation, explicitly render the three approved cards, and add responsive styles.
- [ ] Run focused route/page/shell tests and typecheck to GREEN.
- [ ] Commit `feat(workbench): add inquiry entry page`.

### Task 3: Enforce inquiry boundaries

**Files:** Modify `scripts/check-yunqi-workbench-governance.mjs` and `tests/yunqi-workbench-governance.test.mjs`.

- [ ] Add RED mutation tests for Page bypass, model shape drift, feature-root export, model use in production components, and visible medical-decision copy.
- [ ] Add allow cases for neutral visible copy, ordinary non-visible identifiers, tests/fixtures, and global safety copy.
- [ ] Confirm mutation tests fail because the checks are absent.
- [ ] Implement path-scoped AST checks; do not add a whole-source keyword regex.
- [ ] Run governance, time governance, and Workbench typechecks to GREEN.
- [ ] Commit `test(workbench): enforce inquiry entry boundaries`.

### Task 4: Synchronize architecture documentation

**Files:** Modify `AGENTS.md` and `apps/yunqi-workbench/README.md`.

- [ ] Document the authorized route, the meaning of enabled, zero-request behavior, Context Model boundary, non-goals, and later Contract-first evaluation path.
- [ ] Confirm docs do not claim patient, inquiry, permission, audit, or AI capabilities exist.
- [ ] Run governance and `git diff --check`.
- [ ] Commit `docs(workbench): document phase3-c4 boundaries`.

### Task 5: Verify and deliver

**Files:** Create `docs/superpowers/verification/2026-07-22-phase3-c4-inquiry-entry.md`.

- [ ] Run Workbench test, typecheck, type-test, coverage, build, Workbench governance, and time governance.
- [ ] Browser-verify `/yunqi/inquiry` at 1440x1000, 737x900, and 390x844, including overflow, focus, console, network, and rejected child routes.
- [ ] Run frozen install, Contract check, time purity, full tests/typechecks/coverage, Schema/OpenAPI checks, and `git diff --check`.
- [ ] Confirm zero diff in all frozen packages, OpenAPI, manifests, and lockfile.
- [ ] Record exact evidence and commit `docs(workbench): record phase3-c4 verification`.
- [ ] Review scope, open a ready PR, wait for `quality-gates`, resolve actionable findings, merge to protected `main`, synchronize local main, and clean up only this branch/worktree.
