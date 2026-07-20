# Phase3-C1 YunQi Presentation Model and Components Implementation Plan

**Goal:** Deliver the first real read-only `/current` Workbench view through
the frozen client and DTO boundary, a pure ViewModel mapper, and accessible
presentational components.

**Architecture:** Query ownership remains in the YunQi feature hook/container.
Frozen DTOs enter one pure mapper and become immutable feature ViewModels.
Components consume only those ViewModels and shared domain-neutral primitives.

**Technology:** React 19.2.7, TypeScript 7.0.2 strict, TanStack Query 5.101.2,
Vitest 4.1.10, Testing Library 16.3.2, Vite 8.1.5.

## Constraints

- Do not change API paths, OpenAPI, contracts, client, service, Domain, rules,
  adapter epochs, or wire fields.
- Do not add production dependencies, routing, forms, database work, inquiry
  behavior, or runtime fixtures.
- Do not use Date, Temporal, Intl, IANA timezone names, browser timezone, or
  epoch-derived time presentation.
- Do not add medical diagnosis, causality, treatment, good/bad labels, or new
  traditional-rule interpretation.
- Follow RED, GREEN, REFACTOR for every production behavior.

## Task 1: Presentation model and pure mapper

- [ ] Add failing mapper tests using a complete `YunQiCalculationDto` fixture.
- [ ] Prove the test fails because the mapper does not exist.
- [ ] Define readonly ViewModels and exhaustive relation label maps.
- [ ] Map canonical time without reading or copying `epochMilliseconds`.
- [ ] Preserve six steps as a readonly tuple and mark current by API index.
- [ ] Verify focused tests and Workbench typecheck.

## Task 2: Shared primitives and feedback states

- [ ] Add failing behavior/accessibility tests for `Panel`, `Card`,
      `DataLabel`, `Badge`, and `TimelineItem`.
- [ ] Add failing tests for `LoadingState`, `ErrorState`, and `EmptyState`.
- [ ] Implement the minimum semantic primitives and styles.
- [ ] Refactor `AsyncState` to compose the three state components.
- [ ] Refactor fixed-Beijing time display to consume a ViewModel.
- [ ] Verify focused tests and typecheck.

## Task 3: YunQi current presentation

- [ ] Add failing tests for summary, current card, relation detail, theory
      notes, and rule-version traceability.
- [ ] Add failing timeline tests for current default expansion, independent
      multi-expand, stable ARIA relationships, and current-index updates.
- [ ] Implement feature presentation components using only ViewModels.
- [ ] Add restrained clinical-editorial responsive styles.
- [ ] Verify focused tests and production build.

## Task 4: `/current` vertical integration

- [ ] Add failing integration tests for pending, sanitized error/retry, and
      successful DTO-to-view rendering.
- [ ] Implement `CurrentYunQiView` with the existing query hook and mapper.
- [ ] Replace the foundation Home content with the real read-only view.
- [ ] Keep navigation metadata non-routing and unchanged.
- [ ] Verify integration tests, App tests, and build.

## Task 5: Governance and documentation

- [ ] Add failing mutation tests rejecting `YunQi*Dto` imports from component
      paths.
- [ ] Add failing mutation tests rejecting React, TanStack Query,
      `@yunqi/client`, and client method access from mapper paths.
- [ ] Implement scanner rules and verify the production tree is clean.
- [ ] Update the Workbench README with the new data flow and presentation
      boundary.
- [ ] Verify time governance and frozen-contract drift.

## Task 6: Acceptance and delivery

- [ ] Run focused Workbench tests, typecheck, coverage, and build.
- [ ] Run root workbench/time governance and contract checks.
- [ ] Run full root tests, typecheck, and `git diff --check`.
- [ ] Inspect the real page at desktop and mobile widths using an injected
      test API server; verify theme, disclosure controls, responsiveness, and
      console/network behavior.
- [ ] Confirm immutable package and OpenAPI diffs are empty.
- [ ] Write the Phase3-C1 verification record with exact evidence.
- [ ] Request whole-branch code review and resolve every Critical or Important
      issue with a covering test.
- [ ] Push the isolated branch, create a PR, wait for `quality-gates`, and
      merge only after review and required checks pass.

