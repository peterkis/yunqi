# E2 feedback evidence closeout — 2026-09-22

Base: `13f2ac77c53fa25d49fef882be69d14f97c5da3a`, B merged via
[PR #13](https://github.com/peterkis/yunqi/pull/13).
Branch: `codex/phase3-e2-feedback-evidence-closeout`.

## Delivered

Transferred the two preserved protocol/template repairs from the main-worktree
snapshot, then refined their time semantics: raw form input remains verbatim
at supplied precision; observed API localTime is a distinct field carrying
explicit +08:00. Neither observed value is an expert expected result.

The annual task and each specified-time example record completion separately
from comprehension and agreement. Feedback references session, full build SHA,
task/example and feedback ID. A changed build starts a new session record.
Patient linkage requires omission of both time fields with a non-identifying
reason. All answer fields remain blank.

## Verification

- Markdown tables: consistent column counts throughout both changed documents.
- Reference CSV: one header line, no data rows; unchanged.
- references/ and sessions/: only .gitkeep; no invented clinical evidence.
- Gate matrix: six G1–G6 rows, all NOT_RUN; unchanged.
- `git diff --exit-code 13f2ac7 -- apps packages package.json pnpm-lock.yaml`:
  PASS, zero production/package/OpenAPI/Contract/manifest/lockfile diff.
- `pnpm install --frozen-lockfile`: PASS (pnpm 10.32.1).
- `pnpm contracts:check`: PASS.
- `pnpm test:workbench-governance`: PASS, 245 tests and production checker.
- `pnpm test:time-governance`: PASS, 8 tests and production checker.
- `git diff --check`: PASS.
- Independent Spec and Standards review: pending.

## Delivery provenance and boundary

A merged as [PR #12](https://github.com/peterkis/yunqi/pull/12),
`883c6f096cab02c2428004f49718e56afd24dc77`.
B merged as PR #13 above; its final PR head was
`3c908f2cc0a4ae433feee2b593c88454c82af4f7`, with quality-gates success and
build-bound browser evidence. C changes documentation only and does not
invalidate that source/build identity. The C PR binds final head, CI and merge
identity without inserting a self-referential commit SHA in this record.

The original seven uncommitted repair snapshots were backed up separately;
main-worktree duplicates are removed only after content/hash checks and verified
merge. Original unrelated untracked files remain untouched.

E3: BLOCKED_BY_CLINICAL_INPUT until actual expert-confirmed cases include
reviewer, date, independent basis, expected fields and confirmation status.
E4: BLOCKED_BY_CLINICAL_FEEDBACK until actual de-identified Demo sessions and
preceding evidence exist. This closeout does not execute either phase or award
any clinical gate PASS.
