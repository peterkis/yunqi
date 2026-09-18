# Phase3-E Clinical Validation

This directory is the controlled entry point for the YunQi Phase3-E clinical
validation MVP. It contains protocols and de-identified review materials only;
it is not a patient record store and does not establish clinical efficacy.

## Current status

The repository is at the E0 specification-freeze stage. The three review tasks
are defined as:

1. current YunQi structure;
2. arbitrary-year YunQi analysis; and
3. specified-time analysis using Beijing standard time.

The specified-time route and UI are only proposed by the E0 design. They are
not a live capability until the separately verified E1 implementation exists.

No expert reference cases, signed confirmations, clinical feedback sessions, or
real patient data are present here. Therefore no clinical gate is PASS, and no
expected result may be filled by Codex or copied from the system output.

## Planned E2 materials

After E1 is independently verified, E2 may add:

- an expert review protocol;
- a blank reference-case template;
- a candidate coverage guide;
- a de-identified Demo feedback template; and
- a G1–G6 gate matrix template.

The templates must preserve supplied URL/time order where applicable, keep
expert expected values empty until an expert supplies them, and contain no
patient identifiers.

## Safety boundary

Phase3-E only evaluates deterministic five-movement/six-qi rule presentation.
It does not create patients or inquiries, collect symptoms, infer diagnoses or
syndromes, recommend treatment or prescriptions, predict risk, integrate with
HIS/EMR, persist clinical data, or use AI medical judgement.

The review result can describe rule consistency, understandability, missing
information, and possible future workflow needs. It cannot be presented as a
diagnosis, treatment decision, efficacy finding, or substitute for a clinician's
judgement.
