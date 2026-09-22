# Phase3-E Expert Demo Protocol

## Purpose and boundaries

This protocol evaluates whether a clinician can independently use the read-only
YunQi rule Workbench for three tasks. It does not request patient data and must
not be used to record a patient case, diagnosis, treatment, prescription,
medication, risk assessment, or clinical outcome.

Use a session code rather than a person's name or a patient identifier. Record
only the minimum information needed to understand usability and rule-review
feedback.

## Preparation

The facilitator confirms before the session:

- the reviewed build and verification record;
- the fixed Beijing standard-time label;
- the three supported tasks;
- the blank reference-case template;
- the blank feedback form; and
- that no patient data will be entered or retained.

Record the full reviewed Git commit SHA and session code before starting.
Start a new record if the build changes. Every feedback entry references its
task/example number; exported excerpts retain session and build identity.

The clinician, not the facilitator, selects the familiar year and the two or
three specified-time examples. The facilitator must not choose only examples
that are likely to pass.

## Task A — current page

Ask the clinician to independently locate:

- the YunQi year;
- ganzhi;
- Sui Yun;
- Si Tian;
- Zai Quan; and
- the stage identified by the current query.

Record one status for each task:

~~~
独立完成 / 需提示 / 未完成
~~~

Record the clinician's wording when a field is unclear. Do not translate an
observation into a rule correction without a separate expert decision.

## Task B — arbitrary-year page

Ask the clinician to choose a year they know well and open its annual analysis.
Record 独立完成 / 需提示 / 未完成 for the task separately from comprehension.
Ask:

- Is the annual summary sufficient?
- Is the six-stage display understandable?
- Which fields are missing?
- Which fields are redundant?

Do not ask for a diagnosis or treatment recommendation.

## Task C — specified-time page

Ask the clinician to provide two or three familiar Beijing standard times.
Before submission, ask whether the time standard is clear. After each result,
record:

- completion status (独立完成 / 需提示 / 未完成) for each attempted example;
- verbatim raw form input, preserving supplied precision, when not patient-linked;
- the separately observed API canonical localTime, when a result exists;
- whether input was understandable;
- whether the canonical time was clear;
- whether the selected stage wording was understandable;
- whether the rule output matches the clinician's independent expectation;
- any missing domain fact; and
- any presentation or usability issue.

Both time fields use fixed Beijing UTC+08:00 semantics. Do not append an offset
or fill seconds in the raw-input record. Only the separate API field copies
the returned canonical +08:00 value. If no result exists, leave that field
blank and describe the failure/unsubmitted outcome. If patient linkage exists,
omit both time fields and record the omission without identifying details.
Use C/1, C/2, or C/3 to bind each observation to its example. Task completion,
comprehension and agreement with a rule value are separate observations.

If the clinician disputes a rule value, record it as feedback. Do not alter the
template or mark a case CONFIRMED during the session without the required
independent source and review metadata.

## Task D — first-use context

Ask the clinician to rank the first practical use context:

~~~
临床接诊参考
病例复盘
教学
科研
其他
~~~

Record the selected ordering verbatim. Do not infer a first scenario from
conversation tone or facilitator preference.

## Feedback categories

Every actionable observation receives exactly one primary category:

~~~
RULE_CORRECTNESS
MISSING_DOMAIN_FACT
PRESENTATION
USABILITY
WORKFLOW_REQUEST
MEDICAL_DECISION_REQUEST
INTEGRATION_REQUEST
OUT_OF_SCOPE
~~~

Use P0_BLOCKS_VALIDATION, P1_MAJOR, or P2_LATER only after recording the
evidence. A rule-correctness or missing-domain-fact report is not a license to
edit Domain, Service, or Contract during E2. A medical-decision or integration
request requires a separate safety or architecture review.

## Data handling

Do not record names, medical record numbers, national identifiers, symptoms,
diagnoses, treatments, prescriptions, medications, or patient outcomes.
Redact any accidentally supplied clinical detail before saving a session
record. Keep supplied time examples only when they are necessary for the rule
review and contain no patient linkage.

## Completion rule

After the session, save a de-identified copy of the feedback form under
sessions/ only when a real session occurred. The facilitator does not mark a
gate PASS. G1–G6 are completed later from the evidence rules in the gate
matrix.
