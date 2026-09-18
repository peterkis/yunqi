# Phase3-E1 Spec — Specified-Time YunQi Analysis

- Status: Implementation-ready
- Date: 2026-09-18
- Base SHA: 5c856f58da929b39905fd482faba4a947fe31991
- Branch: codex/phase3e-e1-time-analysis
- Frozen Contract: YQ-API-CONTRACT-1.0.0

## 1. Goal and scope

Expose the existing POST /api/v1/yunqi/calculate capability through the
Workbench as a clinician-operated, read-only specified-time analysis.

The implementation is limited to:

- the exact route /yunqi/calculate;
- a Beijing-standard datetime-local form;
- one explicit calculate mutation per accepted submit;
- pure Workbench presentation mapping;
- neutral six-stage display and selected-stage detail; and
- safe loading, invalid, dirty, error, and retry behavior.

The following remain out of scope and must stay unchanged:

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

No patient, inquiry, observation, storage, HIS/EMR, RBAC, audit, AI,
diagnosis, syndrome differentiation, treatment, prescription, medication,
risk, or recommendation capability is added.

## 2. Frozen data flow

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

The Router selects the page only. The page/component tree never calls the
runtime Client, fetch, Axios, or a literal YunQi API path. Only the hook owns
the injected client mutation. The mapper is pure and has no React Query,
Router, Client, time API, or rule-calculation dependency.

## 3. Time-input contract

The form uses:

~~~html
<input type="datetime-local" step="1" required>
~~~

The value is a Beijing standard wall-clock value, not a browser-local instant.
The pure normalizer accepts only:

~~~
YYYY-MM-DDTHH:mm
YYYY-MM-DDTHH:mm:ss
~~~

and returns:

~~~
YYYY-MM-DDTHH:mm:00+08:00
YYYY-MM-DDTHH:mm:ss+08:00
~~~

It rejects empty, malformed, offset-bearing, Z-suffixed, natural-language, and
other-offset strings. It must not call Date, Date.parse, Date.UTC, Temporal,
Intl, locale formatting, or an IANA timezone. The native control handles normal
input shape; Service/Domain remains authoritative for calendar validity and
supported business range.

## 4. Presentation model

The new model is:

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

Mapping rules:

1. analysisTime comes from dto.input through mapYunQiTime.
2. summary comes from mapYunQiYearSummary(dto).
3. stages come from mapSixQiStageTuple(dto.sixQi.steps).
4. selectedStage is the exact stage whose API index equals
   dto.currentStep.index.
5. A missing exact index throws; no array-position fallback is permitted.
6. No status, current/completed/upcoming, epochMilliseconds, Date, or rule
   recalculation is introduced.

The selected-time page uses 所选时点 and 所选时点所在阶段. It never presents
the current-page semantics 当前阶段, 已结束, or 未开始.

## 5. Page state behavior

The page has six externally observable states:

| State | Required behavior |
|---|---|
| idle | Initial empty form, no default time, no result, zero calculate calls. |
| invalid-input | Accessible error, no calculate call, no result. |
| pending | Only after submit; duplicate submit disabled and stale result hidden. |
| success | Canonical API time, summary, six-stage neutral rail, selected detail, explanations, traceability. |
| dirty-after-success | Input change hides old result and asks for a new analysis; no request before submit. |
| error | Sanitized retryable error; old result hidden; no stack/raw payload/medical interpretation. |

The exact valid submit example is:

~~~ts
client.calculate({
  dateTime: '2026-05-20T13:30:00+08:00',
})
~~~

The displayed analysis time comes from the API response input localTime, not
from the form string.

## 6. Presentation layout

Success content appears in this order:

1. canonical analysis time and Beijing standard label;
2. existing YunQiYearSummaryPanel;
3. a six-stage equal-width, non-interactive rail;
4. selected-stage detail with API index, name, interval, host Qi, guest Qi,
   and structured guest/host relation;
5. existing RuleExplanationPanel;
6. existing TraceabilityPanel extended with the specified-time source label.

The rail highlights only the API-selected stage with the neutral label 所选时点.
It does not mark other stages as completed/current/upcoming, provide radio
controls, progress percentages, or imply real-duration proportions.

The page includes the global safety wording that the result is only for
five-movement/six-qi rule checking and stage validation, not diagnosis,
treatment, or prescription advice.

## 7. Verification contract

Focused evidence must cover:

- normalizer empty/minute/second/malformed/offset/Z/string-fragment cases;
- forbidden time APIs through governance mutation tests;
- exact mapper index matching, six-element preservation, canonical input time,
  and missing-stage failure;
- mutation ownership and exact request payload;
- route, navigation, zero-request initial state, invalid submit, success,
  dirty-after-success, pending, second-request error, retry, and unchanged
  current/year/inquiry routes;
- safe copy and forbidden medical-decision copy;
- focused tests, typechecks, coverage, build, governance, and full repository
  quality gates; and
- browser verification at 1440×1000, 737×900, and 390×844.

## 8. Stop conditions

If the existing Contract or Client cannot satisfy this design, stop with
BLOCKED and evidence. Do not change a frozen package or invent a second DTO.
If implementation reveals a possible Domain rule defect, stop before changing
the Domain and request expert/rule review.
