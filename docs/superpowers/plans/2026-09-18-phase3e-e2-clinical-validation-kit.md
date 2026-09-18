# Phase3-E2 Plan — Clinical Validation Kit

## Baseline

- Base SHA: ee226ac34082bc18226d6038933c8928c43667fe
- Branch: codex/phase3e-e2-clinical-validation-kit
- Allowed changes: docs/clinical-validation/**, docs/superpowers/**,
  documentation-only AGENTS updates if necessary
- Frozen: Workbench production code, all packages, OpenAPI, Contract,
  package manifests, and lockfile

## Tasks

1. Verify that E1 is merged and that the four routes current, annual,
   specified-time, and inquiry remain available with the documented request
   boundaries.
2. Add the E2 design and plan records.
3. Add the clinical-validation phase3-e directory, protocol, blank CSV
   template, selection guide, feedback template, gate matrix, and placeholder
   directories.
4. Update the top-level clinical-validation README to link the kit and record
   that expert evidence is still absent.
5. Run the focused Contract, Workbench governance, time-governance, and diff
   gates.
6. Audit that no expected value, reviewer identity, patient identifier, or
   confirmation claim was added.
7. Create the E2 verification record, perform a scope/spec review, and deliver
   through an independent PR.

## Stop conditions

Stop with BLOCKED_BY_CLINICAL_INPUT if the work would require filling an
expected value, naming an expert, or claiming a clinical conclusion. Stop with
BLOCKED if E1 route semantics or the frozen Contract are inconsistent.
