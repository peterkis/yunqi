# Phase3-E Clinical Validation MVP Design

- Status: Frozen for staged implementation
- Date: 2026-09-18
- Base SHA: c0beecfccebefb1db7a11b29012c1d187eabcbf5
- Baseline: main and origin/main matched this SHA before the worktree was created
- Scope: Workbench-only clinical review prototype; no patient or inquiry workflow

## 1. Purpose

Phase3-E validates a small, deterministic review loop:

~~~
Beijing standard time
  -> existing YunQi calculation contract
  -> understandable Workbench presentation
  -> independent clinical expert review
~~~

The MVP is not a diagnostic, syndrome-differentiation, treatment, prescription,
patient-record, or clinical-decision system.

## 2. Frozen user tasks

The only three user tasks are:

1. View the current YunQi structure at /yunqi/current.
2. View an arbitrary supported YunQi year at /yunqi/year/:year.
3. Enter a Beijing standard time and review the complete calculation at the
   proposed exact route /yunqi/calculate.

The proposed navigation order is:

~~~
当前五运六气 | 年度分析 | 指定时点 | 问诊
~~~

E0 freezes this product boundary only. The route, navigation item, and
calculation flow are not production capabilities until Phase3-E1 is separately
implemented and verified.

## 3. Explicit non-goals

No Phase3-E stage may add:

- patient search, selection, or records;
- HIS/EMR integration;
- inquiry or observation APIs, forms, lifecycle, or storage;
- symptoms, tongue, pulse, diagnosis, syndrome differentiation, treatment,
  prescription, medication, risk prediction, or recommendations;
- RBAC, audit persistence, database, localStorage, IndexedDB, or clinical data
  retention;
- AI, RAG, generated medical judgement, or automatic association between YunQi
  and a patient's disease.

## 4. Specified-time state machine

The future /yunqi/calculate page has exactly six UI states:

| State | Meaning and required behavior |
|---|---|
| idle | First entry or empty input; no default current time, no request, no result. |
| invalid-input | Empty or malformed local wall-time input; accessible error, no request, no result. |
| pending | Only after submit; one client.calculate() call, duplicate submit prevented, stale result hidden. |
| success | Canonical API input time, annual summary, neutral six-stage overview, selected stage, explanations, and traceability. |
| dirty-after-success | Input changed after success; old result hidden and a re-submit message shown; no new request until submit. |
| error | Sanitized retryable error; previous result hidden; no stack, raw payload, or medical interpretation. |

The page must not auto-query on mount and must not display a previous result as
the result for a changed or failed input.

## 5. Fixed-Beijing input semantics

The datetime-local control is only an input surface. Its wall-clock value is
always interpreted as BeijingStandardTime+08:00.

Accepted local forms:

~~~
YYYY-MM-DDTHH:mm
YYYY-MM-DDTHH:mm:ss
~~~

The pure string normalizer must produce:

~~~
2026-05-20T13:30
      -> 2026-05-20T13:30:00+08:00
2026-05-20T13:30:45
      -> 2026-05-20T13:30:45+08:00
~~~

The Workbench must not use Date, Date.parse, Date.UTC, Temporal, Intl, locale
formatting, browser-local time, IANA time zones, or epochMilliseconds to
interpret or display business time. Gregorian and calendar validity remain
Service/Domain responsibilities.

## 6. Frozen presentation boundary

The existing /calculate Contract remains unchanged. In particular,
YunQiCalculationDto.currentStep is not renamed or reinterpreted in the wire
Contract. The Workbench presentation model must translate it to neutral
selected-time language:

~~~ts
interface TimeAnalysisYunQiViewModel {
  readonly analysisTime: YunQiTimeViewModel;
  readonly summary: YunQiYearSummaryViewModel;
  readonly selectedStage: SixQiStageViewModel;
  readonly stages: SixQiStageTuple;
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}
~~~

The mapper must copy dto.input through mapYunQiTime, map all six returned
steps through mapSixQiStageTuple, and find selectedStage by the exact API
step index. Missing selection is an error; no array-position fallback is
allowed. The model has no current, completed, upcoming, status, or epoch
display fields.

The page vocabulary is 所选时点 and 所选时点所在阶段. The current-page
words 当前阶段, 已结束, and 未开始 are not valid for this result.

## 7. Planned component and data-flow boundary

~~~
TimeAnalysisForm
  -> TimeAnalysisView
  -> useCalculateYunQiMutation
  -> useYunQiClient().calculate
  -> @yunqi/contracts YunQiCalculationDto
  -> mapTimeAnalysisYunQi
  -> TimeAnalysisYunQiViewModel
  -> presentational components
~~~

Router and page modules do not call client methods. Components receive state or
ViewModels and do not import the runtime client, fetch, Axios, or API paths.
Mappers remain pure and do not calculate YunQi rules.

The success view order is:

1. canonical analysis time from viewModel.analysisTime.localTime;
2. YunQiYearSummaryPanel;
3. a six-stage equal-width neutral rail;
4. selected-stage detail using existing time-range and relation components;
5. API explanations;
6. traceability with Contract ID, rule version, source, and Beijing standard
   time.

The six-stage rail is an equal-width information layout, not a duration scale,
progress indicator, or stage selector.

## 8. Clinical validation protocol boundary

Codex may provide templates, schema checks, candidate coverage guidance, and
regression harnesses. Codex must not create expert expected values, names,
signatures, consensus statements, or clinical efficacy claims.

An eventual expert reference case contains only the necessary rule-review
fields: input Beijing time, expected YunQi year and ganzhi, Sui Yun fields,
Si Tian/Zai Quan, selected stage, host/guest Qi, relation label, reviewer,
review date, status, and source/basis. PENDING, CONFIRMED, and DISPUTED
are the only planned statuses. Only independently confirmed cases can enter a
regression baseline.

The usability session asks a clinician to independently complete current,
annual, and specified-time tasks; records comprehension and missing/extra
fields; and asks the clinician to rank a first real use context. The document
must preserve the clinician's words and status rather than infer a product
decision.

## 9. Phase sequence and stop conditions

~~~
E0 specification freeze
  -> E1 Workbench specified-time vertical slice
  -> E2 clinical validation kit
  -> E3 expert-confirmed reference regression
  -> E4 feedback hardening and final gate
~~~

Each stage uses its own codex/phase3e-* branch, isolated worktree, focused
verification record, review, and quality gates. E3 is blocked until actual
expert-confirmed reference material exists. E4 is blocked until an actual
de-identified Demo session record exists.

Stop and report BLOCKED if the existing /calculate Contract is inadequate, if
a core Domain rule appears wrong, or if completion requires expert judgement,
real patient data, identity, authorization, or medical responsibility design.

## 10. Acceptance for E0

E0 changes documentation only. The following remain unchanged:

- apps/yunqi-workbench/src/** production code;
- all packages/**;
- OpenAPI and Contract freeze artifacts;
- package.json and pnpm-lock.yaml.

The E0 verification record must include the actual base/final SHA, changed
files, the required focused gates, and an explicit zero-diff scope audit.
