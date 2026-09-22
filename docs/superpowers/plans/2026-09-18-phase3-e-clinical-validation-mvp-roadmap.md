# Phase3-E Clinical Validation MVP Roadmap

> This roadmap is subordinate to AGENTS.md, the fixed-Beijing-time ADRs, and
> the frozen YQ-API-CONTRACT-1.0.0 boundary.

## Base and sequencing

### 2026-09-22 reconciliation addendum

E0, E1, and E2 are merged as PRs #9, #10, and #11. The original sequence below
remains the phase specification, not an instruction to recreate those changes.
Current closeout order: E0 documentation reconciliation, E1 native-input fix
and complete browser acceptance, then E2 reproducible feedback records.
Each closeout uses its own worktree, PR, verification record, independent
specification/standards review, and passing current-commit quality-gates.
E1 browser evidence is incomplete; E2 templates are not clinical evidence.
See the [reconciliation record](../verification/2026-09-22-phase3-e0-spec-reconciliation.md).

### Original implementation baseline

- Base SHA: c0beecfccebefb1db7a11b29012c1d187eabcbf5
- E0 branch: codex/phase3e-e0-clinical-validation-baseline
- E1 branch: codex/phase3e-e1-time-analysis
- E2 branch: codex/phase3e-e2-clinical-validation-kit
- E3 branch: codex/phase3e-e3-expert-reference-regression
- E4 branch: codex/phase3e-e4-feedback-hardening-gate

Each branch starts only after the previous stage is reviewed and merged. No
phase may silently combine the next phase's work, and no phase may modify a
frozen package to avoid a blocker.

## E0 — specification freeze

Deliver:

- the MVP design specification;
- this staged roadmap;
- the clinical-validation entry README;
- a verification record proving documentation-only scope.

Do not implement the route, navigation item, Client mutation, mapper, or UI in
E0.

## E1 — specified-time Workbench vertical slice

Allowed scope is Workbench source/tests, Workbench governance, documentation,
and AGENTS.md. Keep these at zero diff:

~~~
packages/yunqi-domain
packages/calendar-adapters/tyme4ts
packages/yunqi-service
packages/yunqi-contracts
packages/yunqi-client
packages/yunqi-service/openapi
package.json
pnpm-lock.yaml
~~~

Implementation order:

1. Add failing tests for pure input normalization and governance boundaries.
2. Add the smallest pure string normalizer and its tests.
3. Add the selected-time ViewModel/mapper and tests for exact index matching.
4. Add the mutation hook and exact request test.
5. Add route, form, success, pending, invalid, dirty, and error behavior.
6. Add the neutral six-stage rail, selected-stage detail, traceability, and
   medical-safety copy.
7. Run focused tests, governance tests, build, browser verification at 1440,
   737, and 390 widths, then the full repository gates.

The Client and Contract are consumed as-is. If they cannot satisfy the frozen
design, stop with BLOCKED and evidence instead of extending them.

## E2 — clinical validation kit

After E1 is merged, add documentation and non-production validation assets:

~~~
docs/clinical-validation/phase3-e/
  README.md
  protocol.md
  reference-cases.template.csv
  demo-feedback.template.md
  gate-matrix.template.md
  reference-case-selection-guide.md
  sessions/
  references/
~~~

Templates must be blank of expert expected values, real names, patient data,
and confirmation claims. The protocol must require clinicians to supply their
own familiar times and rank their own use context.

## E3 — expert-confirmed regression

Do not start E3 from templates or system-generated output. Require at least one
actual expert-confirmed source with reviewer, review date, status, expected
values, and basis. Validate de-identification, generate a manifest, and include
only CONFIRMED rows in a machine-readable regression fixture. Any mismatch is
FAIL and pauses merge; never rewrite expected values to match the system.

## E4 — feedback hardening and gate

Do not start E4 without at least one actual de-identified Demo session. Classify
feedback into rule, domain, presentation, usability, workflow, medical,
integration, and out-of-scope categories. Only P0/P1 presentation or usability
issues may be fixed in E4, each with RED/GREEN, regression, and browser proof.

Produce the final G1–G6 gate record using evidence from the confirmed reference
set and real sessions. Do not infer PASS from empty evidence, build success, or
an unreviewed system result.
