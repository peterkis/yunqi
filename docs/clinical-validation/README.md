# Phase3-E Clinical Validation

This directory is the controlled entry point for the YunQi Phase3-E clinical
validation MVP. It contains protocols and de-identified review materials only;
it is not a patient record store and does not establish clinical efficacy.

## Current status

The repository has completed the E0 specification freeze and E1 specified-time
Workbench slice. E2 now provides the expert validation kit. The three review
tasks are:

1. current YunQi structure;
2. arbitrary-year YunQi analysis; and
3. specified-time analysis using Beijing standard time.

The implemented E1 route is /yunqi/calculate. It remains a deterministic
rule calculation and presentation capability, not an inquiry or medical
decision workflow.

Merged implementation does not establish complete engineering acceptance.
The 2026-09-18 E1 record leaves exact viewport and Console checks unverified.
The [2026-09-22 E1 closeout](../superpowers/verification/2026-09-22-phase3-e1-review-closeout.md)
records the native-invalid form repair and new three-viewport browser evidence.
The [E2 feedback closeout](../superpowers/verification/2026-09-22-phase3-e2-feedback-closeout.md)
adds separate raw/observed time fields, task-completion statuses, and
session/example/build traceability. Templates remain blank pending real review.
See the [2026-09-22 reconciliation](../superpowers/verification/2026-09-22-phase3-e0-spec-reconciliation.md)
for provenance, attachment coverage, and the separate E1/E2 closeout gates.

No expert reference cases, signed confirmations, clinical feedback sessions, or
real patient data are present here. Therefore no clinical gate is PASS, and no
expected result may be filled by Codex or copied from the system output.

## E2 materials

The phase3-e directory contains the protocol, blank reference-case template,
coverage guide, de-identified Demo feedback template, and G1–G6 gate matrix.
The templates keep expert expected values empty until an expert supplies them
and contain no patient identifiers.

## Safety boundary

Phase3-E only evaluates deterministic five-movement/six-qi rule presentation.
It does not create patients or inquiries, collect symptoms, infer diagnoses or
syndromes, recommend treatment or prescriptions, predict risk, integrate with
HIS/EMR, persist clinical data, or use AI medical judgement.

The review result can describe rule consistency, understandability, missing
information, and possible future workflow needs. It cannot be presented as a
diagnosis, treatment decision, efficacy finding, or substitute for a clinician's
judgement.
