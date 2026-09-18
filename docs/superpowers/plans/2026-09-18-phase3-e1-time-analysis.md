# Phase3-E1 Implementation Plan — Specified-Time YunQi Analysis

> This plan follows the E0 design freeze and the repository TDD, Workbench
> governance, and fixed-Beijing-time rules.

## Baseline

- Base SHA: 5c856f58da929b39905fd482faba4a947fe31991
- Branch: codex/phase3e-e1-time-analysis
- Allowed implementation scope: apps/yunqi-workbench/**, scripts/check-yunqi-workbench-governance.mjs, tests/yunqi-workbench-governance.test.mjs, docs/**, AGENTS.md
- Frozen scope: all packages, OpenAPI, Contract, package manifests, and lockfile

## Vertical-slice order

### Task 1 — input normalizer

- Add focused RED tests for empty, minute, second, malformed, offset, Z, and
  string-fragment input.
- Add the smallest pure string normalizer.
- Add governance coverage for Date, Temporal, Intl, IANA, and epoch display.
- Run the focused time-input tests and time governance.

### Task 2 — selected-time mapper

- Add RED tests for canonical input mapping, summary mapping, exact six-stage
  tuple, exact selected index, and missing-index failure.
- Extend the Workbench ViewModel with the frozen neutral type.
- Add a pure mapper with no time or rule API usage.

### Task 3 — mutation seam

- Add RED hook tests with an injected YunQiClient.
- Add useCalculateYunQiMutation using the existing provider and React Query.
- Verify no request occurs before mutate and the request is passed unchanged.

### Task 4 — route and form

- Add RED route/nav tests for /yunqi/calculate and zero initial calls.
- Add form tests for accessible label, Beijing UTC+08 hint, required submit,
  invalid no-call, and one exact call.
- Add the route and the mutation-owning TimeAnalysisView.

### Task 5 — result states and presentation

- Add RED tests for success, canonical time, neutral rail, selected-stage
  wording, explanations, traceability, and no stale result.
- Add presentational components that receive only state/ViewModels.
- Reuse summary, time range, relation, explanation, and traceability primitives.

### Task 6 — pending/error/dirty behavior

- Add RED tests for disabled duplicate submit, second request pending, dirty
  hiding, second-request failure hiding, sanitized retry, and successful retry.
- Implement the smallest explicit state transitions at the mutation owner.

### Task 7 — governance hardening

- Add RED mutation cases for direct DTO/client access, fetch/API literals,
  forbidden time APIs, current-stage semantics, epoch display, and medical copy.
- Add only the narrow allow cases required by the existing Workbench source.
- Implement path-scoped AST/source governance without whole-source keyword
  rejection.

### Task 8 — documentation and verification

- Update Workbench README and AGENTS.md to describe the implemented route and
  its strict rule-review-only boundary.
- Run focused tests, typechecks, coverage, build, governance, and full gates.
- Build and browser-verify the three required viewports and request behavior.
- Create the E1 verification record with base/final SHA, exact payload,
  changed files, frozen-scope audit, and review findings.

## Delivery gate

Do not merge until:

- frozen scope is unchanged;
- all focused and full gates pass;
- browser evidence covers initial, success, dirty, pending/error, keyboard,
  network, console, and responsive overflow behavior;
- independent specification/scope review finds no Critical or Important issue;
- no expert or patient data has been invented; and
- the PR description states that this is rule calculation/presentation, not
  inquiry, diagnosis, syndrome differentiation, treatment, or prescription.
