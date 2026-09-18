# Phase3-E Gate Matrix Template

This is an evidence ledger. Start every row at NOT_RUN. Do not mark PASS
before the required expert reference material or real session exists.

| Gate | Question | Required evidence | Status | Evidence pointer | Open action |
|---|---|---|---|---|---|
| G1 RULE IMPLEMENTATION CONSISTENCY | Do confirmed expert reference cases match 100%? | Confirmed reference set and regression output | NOT_RUN |  |  |
| G2 INDEPENDENT TASK COMPLETION | Can clinicians independently complete current, annual, and specified-time tasks? | De-identified session records | NOT_RUN |  |  |
| G3 INFORMATION COMPLETENESS | Are required fields sufficient and known gaps non-blocking? | Verbatim feedback and field inventory | NOT_RUN |  |  |
| G4 FIRST REAL USE CASE | Has the first real use context been explicitly ranked? | Reviewer-provided ranking | NOT_RUN |  |  |
| G5 CONTRACT CHANGE NEEDED | Is a Contract or Domain fact missing? | Missing-fact analysis and design decision | NOT_RUN |  |  |
| G6 MEDICAL SAFETY BOUNDARY | Are medical decision requests isolated and separately reviewed? | Safety classification and boundary decision | NOT_RUN |  |  |

Allowed status values:

~~~
NOT_RUN
PASS
PASS_WITH_ACTIONS
FAIL
BLOCKED
~~~

Do not use PASS_WITH_ACTIONS to hide a P0 validation blocker. A disputed
reference row cannot support G1 PASS.
