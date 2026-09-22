# Phase3-E0 specification reconciliation — 2026-09-22

## Baseline and scope

Base: `2d568b2e7902a79eaa1abc6d9d5ac0fe169da32e`, confirmed against local
main and fetched origin/main. Branch: `codex/phase3-e0-spec-reconciliation`.
This is delivery A of the user-approved E0/E1/E2 closeout plan. Only AGENTS.md,
the clinical-validation entry README, roadmap addendum, and this record change.
The original E0 design remains authoritative; historical verification files
are retained unchanged. The main worktree's seven pending repair files and
four untracked entries remain outside this isolated worktree.

## Historical provenance

| Phase | PR | Full squash merge SHA | Historical branch commits |
|---|---|---|---|
| E0 | [#9](https://github.com/peterkis/yunqi/pull/9) | `5c856f58da929b39905fd482faba4a947fe31991` | content `3878a4784c7bf9d7f6085e8b0d8e24a94b11f0a7`; verification `ce89ae0356e19ef880e845f19ba672acb008e853` |
| E1 | [#10](https://github.com/peterkis/yunqi/pull/10) | `ee226ac34082bc18226d6038933c8928c43667fe` | implementation `364ec785251754ff093a89ea6736ee077687938b`; verification `17f4000a627ec56ad9fa78c07521a69503dec932`; pending fix `e55cf5cd13c565311fa0104eaea7976cde7b671d`; record updates `7c011034b4d937268a98fb10de36aafc3934fb76`, `9c45fec121624dcc877d80075276ca7c5fa0e369` |
| E2 | [#11](https://github.com/peterkis/yunqi/pull/11) | `2d568b2e7902a79eaa1abc6d9d5ac0fe169da32e` | kit and verification `8da7eaaa6c8e4d7ce28dcde2d246ffe6cb2ce6d4` |

These IDs resolve the historical E0 verification-record and E2 final-SHA
placeholders without changing their original text. Squash SHAs are the main
history references; branch commits identify the original evidence snapshots.
The historical [E1 verification](2026-09-18-phase3-e1-time-analysis.md) explicitly
leaves exact viewport and Console checks UNVERIFIED. Its automated test results
are historical, not proof for the new closeout tree.

## Attachment coverage

Source: `01_PHASE3-E0_SPEC_FREEZE_PROMPT.md` in the user-supplied
`YunQi_Phase3E_Clinical_Validation_MVP_Prompts_20260918` package.
Paths below are repository-relative. PASS here means specification coverage,
not clinical approval or complete E1 browser acceptance.

| Attachment section | Requirement / repository evidence | Status and remaining owner |
|---|---|---|
| 1. Read baseline | AGENTS.md; Workbench README/routes; Client calculate; Service routes/schemas; presentation models/pages; governance; E0–E2 specs/plans/records | PASS: actual baseline recorded above; C4-only assumptions superseded by merged E1 |
| 2. User tasks | E0 design sections 2–3; `src/app/routes.ts` and AppRoutes under Workbench | PASS: current, annual, specified time; navigation current/year/calculate/inquiry; inquiry is planning-only |
| 3. Six states | E0 design section 4; E1 design section 5; TimeAnalysisView/Form/Page and AppRoutes tests | Spec PASS; E1 closeout must deliver native-invalid handling, real click/keyboard regressions, stale-result and retry verification |
| 4. Time input | E0 design section 5; `time-analysis/time-input.ts` and tests | PASS: string-only minute/second normalization to seconds plus +08:00; calendar validity belongs to Service/Domain |
| 5. Presentation | E0 design section 6; `presentation/map-time-analysis-yunqi.ts` and view-model.ts | PASS: dto.input, exact six-step tuple, index-selected stage; no epoch/status/current-state projection |
| 6. Information hierarchy | E0 design section 7; TimeAnalysisPage and TimeAnalysisSixQiRail | PASS: canonical time → annual summary → neutral rail → selected detail → explanations → traceability; rail is noninteractive and not duration-proportional |
| 7. Safety | E0 design section 3; global App safety note; time-analysis medical-copy governance tests | PASS: rule facts only; existing global negative safety statement allowed; no patient, medical-decision, storage, or AI capability |
| 8. Clinical validation | E0 design section 8; E2 protocol, reference CSV, feedback and gate templates | Spec PASS; E2 closeout adds reproducible non-patient-linked input and task-completion records; expert values remain absent |
| 9. Documents | E0 design, roadmap, clinical-validation README, AGENTS.md | PASS with current-stage clarification in this delivery; no replacement MVP specification |
| 10. Acceptance | E0 original record plus this addendum; scoped Git diff and gates below | Documentation-only proof required for A; E1/E2 changes remain separate deliveries |

Section 3 lists required success content. Section 6 defines layout, matching
the already-frozen E0/E1 layout. The stage rail precedes selected detail; this
reconciliation does not authorize a UI reorder. Safety wording in the global
boundary statement is distinct from prohibited affirmative medical output.

## Closeout sequence and limits

1. A: this documentation-only reconciliation and independent review.
2. B: `codex/phase3-e1-review-closeout`; transfer only five known Workbench
   repair files; prove RED/GREEN, input focus/error associations, minute/second
   payloads, no stale results, duplicate-submit prevention, retry and routes.
   Build and verify real Service success at 1440×1000, 737×900, 390×844 with
   screenshots, Network and Console evidence. Clearly label injected failures.
   If required evidence cannot be obtained, retain a pending PR and record
   BROWSER_BLOCKED; do not merge B or start C.
3. C: `codex/phase3-e2-feedback-evidence-closeout`; after B merge, transfer only
   two template/protocol repairs; distinguish raw input from API canonical time,
   add B/C task completion statuses and session/example/build traceability.

Public APIs, DTOs, YQ-API-CONTRACT-1.0.0, Domain, Service, Client, dependencies
and lockfile remain unchanged. G1–G6 remain NOT_RUN. E3 is
BLOCKED_BY_CLINICAL_INPUT; E4 is BLOCKED_BY_CLINICAL_FEEDBACK.

## Verification

Current worktree verification on 2026-09-22:

- `pnpm install --frozen-lockfile`: PASS (pnpm 10.32.1).
- `pnpm contracts:check`: PASS, including generated-artifact/freeze comparison.
- `pnpm test:workbench-governance`: PASS, 245 tests and production checker.
- `pnpm test:time-governance`: PASS, 8 tests and production checker.
- `git diff --check`: PASS (only Git line-ending notices).
- `git diff --name-only 2d568b2 -- apps packages package.json pnpm-lock.yaml`:
  empty; production source, packages/OpenAPI, manifests and lockfile zero diff.

Independent Spec reviewer Goodall found the initial verification placeholder
incomplete. The actual results above close that finding; final confirmation
is recorded in the PR. Independent Standards review is recorded separately
in the PR. These are engineering reviews, not expert clinical validation.

Branch protection inspected on 2026-09-22 requires strict quality-gates,
enforces administrators, and prohibits force pushes/deletions. No protection
setting is changed. Final commit/check/merge identity is bound by the PR and
Git history rather than a self-referential SHA inside this file.
