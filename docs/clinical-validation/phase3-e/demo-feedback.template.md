# Phase3-E Demo Feedback Record

Complete this form only for a real, de-identified expert session. Leave fields
blank when no session has occurred. Do not enter patient identifiers or
clinical details.

## Session metadata

- session_code:
- session_date:
- build_or_commit:
- facilitator_code:
- reviewer_code:
- session_status: NOT_STARTED / COMPLETE / ABANDONED

`build_or_commit` must identify the full reviewed Git commit SHA. Use a new
session record if the build changes. Every task/example and feedback row
inherits this session_code and build identity; keep those fields with exports.

## Task A — current page

| Check | Status | Evidence or verbatim observation |
|---|---|---|
| YunQi year |  |  |
| ganzhi |  |  |
| Sui Yun |  |  |
| Si Tian |  |  |
| Zai Quan |  |  |
| identified stage |  |  |

Allowed status: 独立完成 / 需提示 / 未完成.

## Task B — arbitrary-year page

- task_completion_status:
- familiar_year_supplied_by_reviewer:
- annual_summary_sufficient:
- six_stage_display_understandable:
- missing_fields:
- redundant_fields:
- verbatim_observations:

Allowed task_completion_status: 独立完成 / 需提示 / 未完成.

## Task C — specified-time page

| Example | Completion status | Input understood | Time standard understood | Selected stage understood | Independent rule review | Observation |
|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |

Allowed completion status: 独立完成 / 需提示 / 未完成. Blank means not recorded,
not independently completed. Record one status for every attempted example.

| Example | Raw form input (verbatim) | API canonical localTime (observed) | Omission reason / outcome |
|---|---|---|---|
| 1 |  |  |  |
| 2 |  |  |  |
| 3 |  |  |  |

Both time columns mean fixed Beijing standard time UTC+08:00. Preserve the
raw form value exactly, including minute/second precision, without appending
an offset or adding seconds. The observed API column separately copies the
returned canonical localTime with its explicit +08:00 offset. It is an actual
system result, never an expert expected value. If no result was returned,
leave the API column blank and record the failure or unsubmitted outcome.

Only record non-patient-linked times. Otherwise omit both time columns and
state that patient linkage required omission; do not record the identifying
linkage itself. Preserve the example number so the observation remains linked.

Do not enter patient-linked times. A disputed rule result is feedback, not an
automatic expected value.

## Task D — first-use context

Rank the reviewer's actual order:

1.
2.
3.
4.
5.

Options: 临床接诊参考 / 病例复盘 / 教学 / 科研 / 其他.

## Feedback ledger

| feedback_id | task_or_example_ref | category | severity | evidence | proposed next boundary |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

Use A, B, C/1, C/2, C/3, or D as task_or_example_ref; use SESSION for a
session-wide observation. The complete evidence key is session_code +
build_or_commit + task_or_example_ref + feedback_id. Do not infer a task
completion status from satisfaction or rule agreement.

Categories:

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

Severity: P0_BLOCKS_VALIDATION / P1_MAJOR / P2_LATER.

## Safety and de-identification check

- no patient name or identifier:
- no diagnosis, treatment, prescription, medication, risk, or outcome:
- no raw clinical record copied:
- redaction completed if needed:
- reviewer confirmed the record is de-identified:

## Facilitator closeout

- unresolved questions:
- evidence files supplied:
- gate matrix updated: NO
