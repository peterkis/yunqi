# YunQi Downstream Time Guardrails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the persistence and React display contracts for fixed Beijing Standard Time while preserving the public `YunQiInstant` name.

**Architecture:** ADR-001 and `AGENTS.md` remain the normative project-wide sources. A root governance checker validates the required wording and automatically scans future React/Next workspace source, where runtime date/time interpretation APIs are prohibited so cross-file helpers cannot bypass the fixed-Beijing contract.

**Tech Stack:** TypeScript documentation, Node.js ESM, Node built-in test runner, pnpm workspace scripts.

## Global Constraints

- Keep the public type name `YunQiInstant`; do not introduce a rename or compatibility alias.
- Define `YunQiInstant` as the `BeijingStandardTime+08:00 Absolute Representation`.
- Persisted YunQi calendar meaning must remain reconstructable without database, server, browser, IANA, or DST configuration.
- The minimum persistence tuple is `calendar_time_local varchar`, `epoch_ms bigint`, `offset char(6)`, and `calendar_time_standard varchar`.
- `timestamp with time zone` or `timestamptz` must not be the sole or authoritative YunQi business-time field.
- React/Next code must render canonical `localTime` or use a formatter that operates on canonical fixed-Beijing fields; it must not display `new Date(result.epochMilliseconds)`.

---

### Task 1: Write governance regression tests

**Files:**
- Create: `tests/yunqi-time-governance.test.mjs`

**Interfaces:**
- Consumes: future CLI `node scripts/check-yunqi-time-governance.mjs --root <fixture>`
- Produces: failing fixtures for missing governance text and unsafe React time interpretation

- [ ] **Step 1: Add a passing-contract fixture helper and failing React cases**

Create temporary repositories containing the normative documents, Domain type
comment, and a React workspace. Assert that canonical `localTime` rendering
passes, while `new Date(result.epochMilliseconds)`, `Intl`, Temporal, and IANA
interpretation fail.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/yunqi-time-governance.test.mjs
```

Expected: FAIL because `scripts/check-yunqi-time-governance.mjs` does not yet
exist.

### Task 2: Implement the governance checker

**Files:**
- Create: `scripts/check-yunqi-time-governance.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: repository root or `--root <path>`
- Produces: exit code `0` for compliant governance and frontend source; exit code `1` with file-scoped violations otherwise

- [ ] **Step 1: Validate normative project documents**

Require ADR-001, `AGENTS.md`, and the Domain `YunQiInstant` JSDoc to contain
the frozen naming, persistence tuple, authoritative-field, and frontend
display constraints.

- [ ] **Step 2: Discover and scan frontend workspaces**

Discover package manifests under `apps/` and `packages/`. Treat a package as a
frontend workspace when React or Next appears in dependencies,
devDependencies, or peerDependencies. Scan all `src` JavaScript/TypeScript
source and reject Date, Temporal, Intl, locale/ISO conversion, IANA
identifiers, or browser local-time reinterpretation. This package-wide rule
also catches a component that delegates `epochMilliseconds` to an indirectly
named helper.

- [ ] **Step 3: Wire the checker into root verification**

Add:

```json
"test:time-governance": "node --test tests/yunqi-time-governance.test.mjs && node scripts/check-yunqi-time-governance.mjs"
```

Run it from the root `test` and `test:time-purity` scripts.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm run test:time-governance
```

Expected: all governance tests pass and the current repository reports no
violations.

### Task 3: Freeze the downstream contracts

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md`
- Modify: `docs/superpowers/specs/2026-07-16-yunqi-calendar-time-semantics-design.md`
- Modify: `packages/yunqi-domain/src/calendar/time.ts`
- Modify: `packages/yunqi-domain/README.md`
- Modify: `docs/YunQi-Domain-领域模型设计.md`

**Interfaces:**
- Consumes: accepted Phase2-A.1 fixed-Beijing model
- Produces: normative persistence and frontend rules plus unambiguous public-type documentation

- [ ] **Step 1: Strengthen `YunQiInstant` documentation**

State verbatim that it is the
`BeijingStandardTime+08:00 Absolute Representation`, while retaining the
existing public name and transport/audit-only authority.

- [ ] **Step 2: Freeze the persistence tuple**

Require the four minimum fields and constraints. Allow database time-zone
columns only as derived/query helpers, never as the sole or authoritative
business calendar meaning.

- [ ] **Step 3: Freeze the React display contract**

Require `localTime` or a fixed-Beijing formatter and explicitly forbid
`new Date(result.epochMilliseconds)`, Date/Intl/Temporal/IANA/browser-local
interpretation for YunQi business display.

- [ ] **Step 4: Verify the complete repository**

Run:

```powershell
npm run test:time-governance
npm run test:time-purity
npm run typecheck
npm test
git diff --check
```

Expected: every command exits `0`; the existing untracked Phase2-A.1 prompt
remains untouched.
