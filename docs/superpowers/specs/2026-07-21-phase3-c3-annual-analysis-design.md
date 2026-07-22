# Phase3-C3 Annual YunQi Analysis Design

**Status:** Approved, implementation-ready
**Date:** 2026-07-21
**Base:** Phase3-C2 Current YunQi Annual Timeline
**Application:** `apps/yunqi-workbench`

## 1. Purpose

Phase3-C3 adds the first arbitrary-year YunQi analysis page. It answers
"what is the complete YunQi structure of this selected year?" and remains
separate from the Phase3-C1/C2 current-state view, which answers "where are we
now?".

The authoritative annual flow is:

```text
/yunqi/year/:year
  -> strict URL validation
  -> useYunQiYearQuery(year)
  -> @yunqi/client GET /api/v1/yunqi/year/{year}
  -> YunQiYearDto
  -> pure presentation mapper
  -> AnnualYunQiViewModel
  -> annual master-detail components
```

The page is read-only. It does not calculate rules, infer current time,
diagnose, prescribe, or add traditional-theory conclusions.

## 2. Frozen boundaries

Phase3-C3 preserves:

- API path version `/api/v1`;
- Contract ID `YQ-API-CONTRACT-1.0.0`;
- OpenAPI document version `1.2.0`;
- rule version `YQ-MVP-RULES-1.0.0`;
- `@yunqi/contracts@1.0.0` and `@yunqi/client@1.0.0`;
- the fixed `BeijingStandardTime+08:00` presentation contract; and
- all Domain, adapter, Service, Client, Contract, OpenAPI, and wire behavior.

No database, inquiry workflow, runtime fixture, chart library, SVG, Canvas,
duration calculation, or new API field is introduced.

## 3. Navigation baseline

React Router is introduced because the Workbench now has two real pages.
Router responsibilities stop at URL matching and page selection.

```text
/
  -> replace redirect to /yunqi/current

/yunqi/current
  -> existing CurrentYunQiView
  -> GET /current

/yunqi/year
  -> YearAnalysisLayout + YearEntryPage
  -> no query

/yunqi/year/:year
  -> YearAnalysisLayout + YearAnalysisPage
  -> validate parameter before mounting AnnualYunQiView

*
  -> NotFoundPage
```

Navigation exposes "当前五运六气" and "年度分析" as real links. The inquiry
entry remains disabled. Both annual routes mark the annual navigation entry
active.

The URL is the only source of the selected year. React state must not mirror
the year. The `/yunqi/year` entry does not derive a default from `Date`, the
browser, `/current`, the server clock, or any timezone.

## 4. Year range and validation

Workbench owns one mirrored UI constraint:

```ts
export const YUNQI_YEAR_RANGE = {
  min: 1901,
  max: 2099,
} as const;
```

`YUNQI_YEAR_OPTIONS` is generated once beside this constant. Components must
not duplicate `1901`, `2099`, or a computed length literal.

`parseYearParam()` is an independent pure helper. It is not implemented in a
Router or Page component:

```ts
type YearParamResult =
  | { readonly ok: true; readonly year: number }
  | {
      readonly ok: false;
      readonly reason: 'format' | 'range';
    };
```

Validation first requires an exact four-digit decimal string, then converts
with `Number`, then applies the inclusive range. Values such as `abc`,
`2026abc`, `2026.5`, `02026`, `1900`, and `2100` are invalid. Invalid routes
never mount the query-owning component and therefore cannot call the API.

## 5. Presentation models

The neutral shared stage contains only Contract facts:

```ts
interface SixQiStageViewModel {
  readonly index: SixQiStepDto['index'];
  readonly name: SixQiStepDto['name'];
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly hostQi: SixQiStepDto['hostQi'];
  readonly guestQi: SixQiStepDto['guestQi'];
  readonly relation: GuestHostRelationViewModel;
}

type SixQiStageTuple<
  Stage extends SixQiStageViewModel = SixQiStageViewModel,
> = readonly [Stage, Stage, Stage, Stage, Stage, Stage];

interface CurrentSixQiStageViewModel
  extends SixQiStageViewModel {
  readonly status: LabeledCodeViewModel<
    'completed' | 'current' | 'upcoming'
  >;
}
```

The annual model has no current-state fields:

```ts
interface AnnualYunQiViewModel {
  readonly summary: YunQiYearSummaryViewModel;
  readonly stages: SixQiStageTuple;
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}
```

It must not contain `inputTime`, `currentStep`, `status`, or
`epochMilliseconds`.

Shared pure helpers map canonical time, host/guest relations, year summary,
and neutral stage facts. The six-stage mapper must destructure and reconstruct
all six items explicitly; using `steps.map(...)` is forbidden because it loses
the tuple invariant. Every output `index` copies `step.index`; tuple position
must never recreate the business index.

`mapCurrentYunQi()` enriches neutral stages with current/completed/upcoming
status for C2. `mapAnnualYunQi()` returns neutral stages without status.

## 6. Page and component structure

```text
YearAnalysisLayout
  -> YearAnalysisHeader
  -> YearSelector
  -> Outlet
      -> YearEntryPage
      -> InvalidYearPage
      -> AnnualYunQiView
          -> AsyncState
              -> AnnualYunQiPage
                  -> YunQiYearSummaryPanel
                  -> AnnualSixQiSelector
                  -> AnnualSixQiDetailPanel
                  -> RuleExplanationPanel
                  -> TraceabilityPanel
```

`YunQiYearSummaryPanel` is a neutral C2/C3 component. It presents the year,
stem-branch, YunQi-year interval, SuiYun, excess/deficiency, Sitian, and
Zaiquan. Refactoring the existing summary into this shared component must not
change current-view behavior.

`AnnualSixQiSelector` is intentionally not called a Timeline. It expresses
stage selection, not current temporal state.

## 7. Annual master-detail interaction

The year belongs to URL state. Stage selection is local interaction state:

```ts
interface AnnualSixQiSelectionState {
  readonly selectedStepIndex: SixQiStepDto['index'];
}
```

The initial selection is `viewModel.stages[0].index`, which selects the first
API stage without deriving an index from tuple position. The UI says
"已选择：初之气", never "当前初之气".

Selection lookup uses `stages.find(stage.index === selectedStepIndex)`.
Indexing with `selectedStepIndex - 1` is forbidden. Keying the content by the
returned year resets selection to the first stage when navigation changes the
year, avoiding state-sync Effects.

The selector uses a native radio group with `fieldset`, `legend`, and six
same-name inputs. Native checked state, arrow keys, Space, and focus behavior
provide the selection semantics. No multi-expand disclosure or step query
parameter is introduced.

The single detail region displays the selected stage name, canonical time
range, host Qi, guest Qi, structured Qi/element/direction relation, and the API
`traditionalLabel`.

## 8. Fixed Beijing time

All displayed dates come from canonical `localTime` and use the label
"北京时间 UTC+08". Annual models do not copy `epochMilliseconds`.

Router, validator, mapper, component, selector, serializer, and formatter code
must not use `Date`, Temporal, Intl, locale formatting, `toISOString()`, IANA
timezone names, browser local time, or epoch-derived display values.

## 9. Rule explanation and traceability

The two responsibilities remain separate.

`RuleExplanationPanel`:

- renders API `explanations` verbatim;
- labels them as rule-result explanations not expanded by the frontend;
- renders a neutral empty message if the array is empty; and
- never derives theory, causality, medical meaning, diagnosis, or treatment.

`TraceabilityPanel` renders only:

- `ruleVersion`;
- `YUNQI_API_CONTRACT_ID`;
- the source label "YunQi 年度查询 API"; and
- "北京时间 UTC+08".

It does not contain theoretical explanation. Components do not construct or
call `/api/v1/yunqi/**` paths.

## 10. Page states and failures

The entry route shows a selection prompt and makes no request. Invalid format
and range routes show distinct validation messages, keep the selector
available, and provide no retry action.

For a valid year:

- pending shows "正在加载 {year} 年年度五运六气数据";
- API failure shows a sanitized message and retry action;
- absent data shows "该年度暂无可展示数据"; and
- success maps and renders the annual model.

Changing years must not keep the previous year's DTO as placeholder data.
Production never falls back to fixtures or demonstration results.

## 11. Responsive and visual semantics

Desktop order is header, year selector, summary, six equal stage choices,
one detail panel, rule explanation, and traceability. Mobile uses a vertical
radio list followed by the same single detail panel.

The existing clinical-editorial paper, ink, and cinnabar tokens remain.
Cinnabar means selected only; it does not represent good/bad, warning, risk,
diagnosis, or treatment. Six equal widths communicate ordinal structure, not
real duration. No chart library, SVG, Canvas, gradient, or medical alert color
is added.

Positioning and selection are unanimated. Any future motion must honor
`prefers-reduced-motion`.

## 12. Accessibility

- YearSelector has a visible label and native select.
- The stage selector uses native radio semantics.
- Each stage label includes its name and full canonical time range.
- Selection uses `checked`, not `aria-current`.
- The detail panel is a labelled `role="region"`.
- Every route page has one unique primary heading.
- Focus-visible styles work in both themes.
- Tab, Shift+Tab, arrow keys, and Space remain functional.

## 13. Governance

Workbench governance must reject:

- Router or Page code that calls YunQi Client methods;
- DTO imports from production components;
- React, Router, Query, or Client imports in presentation mappers;
- annual component source containing current-state concepts such as
  `currentStep`, `completed`, or `upcoming`;
- annual user-facing copy containing `当前`, `已结束`, `未开始`, `吉凶`,
  `诊断`, or `治疗` except narrowly documented global safety copy;
- stage index reconstruction from tuple position;
- `.map()` in the tuple-preserving stage mapper;
- duplicated year-range literals in components;
- forbidden business-time APIs or timezone names; and
- Workbench dependencies on Service, Domain, or calendar adapters.

The governance implementation must be structural and path-scoped so unrelated
pagination, safety disclaimers, or current-view semantics do not produce false
positives.

## 14. Acceptance

Completion requires:

1. route tests for redirect, entry, valid, invalid, unknown, history, and
   active navigation;
2. zero requests on entry and invalid routes;
3. exactly the selected annual request on a valid route;
4. mapper field, tuple, index-preservation, and negative type tests;
5. unchanged C1/C2 behavior after neutral-stage refactoring;
6. default first-stage selection and single-detail updates;
7. selection reset after year navigation;
8. canonical-time-only rendering;
9. separate explanation and traceability tests;
10. pending, error/retry, empty, and success integration tests;
11. keyboard, native radio, focus, and responsive verification;
12. Workbench coverage of at least 90% lines/statements/functions and 85%
    branches;
13. root tests, typecheck, Contract drift, time governance, Schema/OpenAPI,
    build, browser verification, and `git diff --check`; and
14. zero diff in Domain, calendar adapter, Service, Contracts, Client,
    generated OpenAPI, and frozen Contract artifacts.
