# Phase3-E2 Design — Clinical Validation Kit

- Status: Implementation-ready
- Date: 2026-09-18
- Base SHA: ee226ac34082bc18226d6038933c8928c43667fe
- Branch: codex/phase3e-e2-clinical-validation-kit
- Scope: Documentation and non-production validation assets only

## Goal

Create a controlled, repeatable package for experts to review the three
verified Workbench tasks:

1. current YunQi;
2. arbitrary-year YunQi; and
3. specified-time YunQi using Beijing standard time.

The kit must not contain patient records, expected rule values, invented
reviewers, signatures, consensus statements, or clinical efficacy claims.

## Package topology

~~~
docs/clinical-validation/phase3-e/
  README.md
  protocol.md
  reference-cases.template.csv
  reference-case-selection-guide.md
  demo-feedback.template.md
  gate-matrix.template.md
  sessions/
  references/
~~~

The sessions and references directories contain only placeholders until a real
expert supplies de-identified material.

## Reference-case contract

The CSV header includes the minimum rule-review fields required by E3. All
expected fields and reviewer metadata are blank in E2. The only planned review
statuses are PENDING, CONFIRMED, and DISPUTED. Codex must not fill expected
values from the API, Domain tests, or any generated candidate output.

## Session protocol

The protocol is a 30–45 minute independent expert review. The clinician
supplies familiar times for the specified-time task and ranks the first real
use context. The facilitator records observations without entering patient
information. Feedback is classified into the eight controlled categories and
is not automatically converted into implementation work.

## Gate contract

G1–G6 are evidence gates, not a satisfaction survey. Every row begins as
NOT_RUN. PASS is forbidden before a real session and, for G1, a real
expert-confirmed reference set. E3 requires at least one complete confirmed
source; E4 requires at least one de-identified real session.

## Safety boundary

The kit evaluates rule consistency, understandability, information gaps, and
future workflow needs. It does not establish diagnosis, syndrome
differentiation, treatment, prescription, medication, risk prediction,
recommendation, or clinical efficacy.
