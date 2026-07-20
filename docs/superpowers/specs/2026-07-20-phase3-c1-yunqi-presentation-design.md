# Phase3-C1 YunQi Presentation Model and Component Design

**Status:** Approved, implementation-ready
**Date:** 2026-07-20
**Base:** Phase3-B React Workbench Foundation
**Application:** `apps/yunqi-workbench`

## 1. Purpose

Phase3-C1 introduces the first real, read-only YunQi Workbench view. It
consumes the frozen `/api/v1/yunqi/current` result and presents a concise
current summary followed by the complete six-step timeline.

The authoritative data flow is:

```text
/current
  -> @yunqi/client query options
  -> TanStack Query hook
  -> YunQiCalculationDto
  -> pure presentation mapper
  -> CurrentYunQiViewModel
  -> presentational components
```

React remains a contract consumer. It does not calculate YunQi facts,
reinterpret calendar boundaries, or provide diagnosis or treatment guidance.

## 2. Frozen boundaries

The following remain unchanged:

- API path `/api/v1`;
- Contract ID `YQ-API-CONTRACT-1.0.0`;
- OpenAPI document `1.2.0`;
- Rule version `YQ-MVP-RULES-1.0.0`;
- `@yunqi/contracts@1.0.0`;
- `@yunqi/client@1.0.0`;
- all Domain, calendar-adapter, service, OpenAPI, and wire fields.

No runtime dependency is added. React Router, Next.js, Axios, a UI framework,
runtime fixtures, year selection, calculation forms, database work, and
inquiry features remain out of scope.

## 3. Presentation boundary

Only the feature mapper may accept YunQi DTOs for presentation. Components
receive immutable ViewModels and must not import `YunQi*Dto` types.

The mapper:

- is a pure TypeScript module with no React, Query, or client dependency;
- preserves the six-element tuple;
- uses `currentStep.index` only to mark the current item;
- keeps API facts and `traditionalLabel` unchanged;
- maps frozen enums to neutral Chinese display labels exhaustively; and
- never calculates boundaries, relations, explanations, or medical meaning.

The Workbench governance gate rejects DTO imports from production component
paths and rejects React, Query, or client imports from the presentation mapper
directory.

## 4. ViewModel definitions

The feature owns these internal, readonly types:

```ts
interface LabeledCodeViewModel<Code extends string> {
  readonly code: Code;
  readonly label: string;
}

interface YunQiTimeViewModel {
  readonly localTime: string;
  readonly standard: LabeledCodeViewModel<
    'BeijingStandardTime+08:00'
  >;
}

interface GuestHostRelationViewModel {
  readonly qi: LabeledCodeViewModel<
    HostGuestRelationDto['qiRelation']
  >;
  readonly element: LabeledCodeViewModel<
    HostGuestRelationDto['elementRelation']
  >;
  readonly direction: LabeledCodeViewModel<
    HostGuestRelationDto['direction']
  >;
  readonly traditionalLabel: string;
}
```

`CurrentYunQiViewModel` contains the canonical input time, year summary,
year interval, current step, a six-element timeline tuple, explanations, and
rule version. It intentionally excludes `epochMilliseconds`.

The relation labels are:

| Contract field | Code | UI label |
|---|---|---|
| `qiRelation` | `SAME_QI` | 同一六气 |
| `qiRelation` | `DIFFERENT_QI` | 不同六气 |
| `elementRelation` | `SAME_ELEMENT` | 同五行 |
| `elementRelation` | `DIFFERENT_ELEMENT` | 不同五行 |
| `direction` | `NONE` | 无方向关系 |
| `direction` | `HOST_GENERATES_GUEST` | 主生客 |
| `direction` | `GUEST_GENERATES_HOST` | 客生主 |
| `direction` | `HOST_CONTROLS_GUEST` | 主胜客 |
| `direction` | `GUEST_CONTROLS_HOST` | 客胜主 |

These are display labels for existing facts, not newly inferred rules.

## 5. Fixed Beijing time presentation

Every time ViewModel contains only:

- the canonical `localTime` string;
- the literal `BeijingStandardTime+08:00`; and
- the UI label `北京时间 UTC+08`.

The mapper does not read or copy `epochMilliseconds`. Components may replace
the literal `T` separator for readability, but they may not parse or
reinterpret the value.

All existing prohibitions on Date, Temporal, Intl, locale formatting,
`toISOString`, IANA timezone names, browser timezone, and epoch-derived
display remain in force.

## 6. Component system

Shared presentation primitives are domain-neutral:

- `Panel`: a titled page section with optional description;
- `Card`: a compact grouped surface;
- `DataLabel`: a semantic label/value pair;
- `Badge`: `neutral`, `accent`, or `current` visual emphasis only;
- `TimelineItem`: a timeline node and accessible disclosure shell;
- `LoadingState`, `ErrorState`, and `EmptyState`: sanitized feedback surfaces.

`AsyncState` composes the three feedback components and retains the priority:
pending, error, empty, success.

YunQi-specific components live under the feature:

```text
CurrentYunQiView
  -> AsyncState
  -> CurrentYunQiPage
      -> CurrentSummary
      -> CurrentStepCard
      -> SixQiTimeline
          -> SixQiTimelineItem
              -> GuestHostRelationDetail
      -> TheoryAndTraceabilityPanel
```

`CurrentYunQiView` is the only query-owning component. It calls
`useCurrentYunQiQuery`, maps successful data, supplies `refetch` as the retry
action, and never receives or constructs a client.

## 7. Information hierarchy

The first view is summary-first:

1. canonical input time;
2. YunQi year, stem-branch, and year interval;
3. SuiYun, Sitian, and Zaiquan;
4. a dedicated current-step card;
5. the complete six-step timeline;
6. API explanations and rule-version traceability.

A collapsed timeline item shows its step name, current marker when applicable,
time range, host Qi, guest Qi, and `traditionalLabel`. Expanded content shows
the structured Qi, element, and direction relations plus the unchanged
traditional label.

No good/bad tone, risk score, diagnosis-like color, causality, treatment, or
additional traditional interpretation is introduced.

## 8. Timeline interaction and accessibility

The current step is highlighted and expanded on first render. Other steps are
collapsed. Each item is independently controlled, so multiple items may be
open at once.

When `currentStepIndex` changes, the new current item is added to the expanded
set without closing items opened by the user.

Each disclosure uses:

- a native `button`;
- `aria-expanded`;
- `aria-controls`;
- a stable detail ID; and
- a detail region labelled by its control.

Native button semantics provide Tab, Enter, and Space operation. Focus-visible
styles remain explicit in both themes.

## 9. Query and failure behavior

Production always calls the real `/current` endpoint through the existing
query hook and `@yunqi/client`. There is no runtime fixture or silent fallback.

Pending requests show `LoadingState`. API failure shows a sanitized
`ErrorState` and a retry action. Missing data uses `EmptyState`. No raw backend
message, response body, stack trace, or medical conclusion is rendered.

The view replaces the Phase3-B foundation content inside the existing Home
shell. Navigation metadata remains non-routing and unchanged.

## 10. Visual direction

The view extends the existing restrained clinical-editorial system:

- warm paper and ink surfaces;
- cinnabar reserved for current state and trace accents;
- ruled sections instead of generic dashboard shadows;
- serif-led Chinese hierarchy with sans-serif data labels;
- responsive summary cards and a vertical timeline;
- visible focus and reduced-motion support.

The design avoids gradients, glass effects, gamification, decorative medical
alerts, and meaning-bearing green/red success or danger colors.

## 11. Acceptance

Completion requires:

1. mapper tests for every field, relation enum, tuple invariant, current-step
   identity, `traditionalLabel`, and canonical `localTime`;
2. component tests for primitives and all feedback states;
3. integration tests for pending, failure/retry, and successful `/current`;
4. accessibility tests for current default expansion and independent
   multi-expand behavior;
5. governance mutation tests for DTO imports in components and forbidden
   dependencies in mappers;
6. Workbench coverage at lines/statements/functions 90% and branches 85%;
7. root tests, typecheck, time governance, contract drift, and build passing;
8. no diff in frozen backend, Domain, adapter, contracts, client, or OpenAPI
   artifacts.
