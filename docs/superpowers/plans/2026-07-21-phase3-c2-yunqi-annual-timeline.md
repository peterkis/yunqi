# Phase3-C2 YunQi Annual Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or
> `superpowers:executing-plans` task-by-task. Every production behavior follows
> RED, GREEN, REFACTOR.

**Goal:** Add a responsive, accessible annual six-stage rail to the existing
read-only YunQi Workbench without changing frozen backend or time contracts.

**Architecture:** The existing pure DTO mapper enriches the single
`SixQiTimelineViewModel` with presentation status. `AnnualStageRail` and the
vertical disclosures consume that same tuple, while `SixQiTimeline` remains
the sole owner of expanded state and navigation refs.

**Tech Stack:** React 19.2.7, TypeScript 7.0.2 strict, TanStack Query 5.101.2,
Vitest 4.1.10, Testing Library 16.3.2, Vite 8.1.5.

## Global Constraints

- Keep `/api/v1`, `YQ-API-CONTRACT-1.0.0`, OpenAPI `1.2.0`, and
  `YQ-MVP-RULES-1.0.0` unchanged.
- Do not add runtime dependencies or modify Domain, Adapter, Service,
  Contracts, Client, OpenAPI, or wire fields.
- Use canonical `localTime`; never use Date, Temporal, Intl, IANA timezone,
  browser timezone, or epoch-derived display.
- Do not display solar-term names or introduce a Rail-specific data model.
- Preserve API `step.index` exactly; production components never renumber it.
- Keep Workbench coverage at lines/statements/functions 90% and branches 85%.

## Tasks

1. Add mapper RED tests for stage status, unique current identity, tuple shape,
   and exact API indexes; implement the minimal ViewModel and mapper changes.
2. Add time-display RED tests for canonical compact rendering, including
   millisecond input; implement a backward-compatible `full | compact` mode.
3. Add `AnnualStageRail` RED tests for six nodes, time/status content, direct
   API indexes, shared ViewModel typing, and ARIA relationships; implement the
   pure component.
4. Add interaction RED tests for reveal-without-close, no-animation nearest
   scrolling, stable focus, current-step changes, and independent disclosure
   toggles; integrate the Rail into `SixQiTimeline`.
5. Add page and responsive tests, implement the equal-width desktop rail and
   mobile vertical fallback, then update Workbench documentation and time
   governance coverage.
6. Run focused and full acceptance, inspect immutable package diffs, write the
   verification record, request review, and merge only after `quality-gates`
   passes.

## Acceptance Commands

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
```
