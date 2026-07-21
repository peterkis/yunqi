# Phase3-C2 YunQi Annual Timeline Design

**Status:** Approved, implementation-ready  
**Date:** 2026-07-21  
**Base:** Phase3-C1 YunQi Presentation  
**Application:** `apps/yunqi-workbench`

## Purpose

Phase3-C2 adds a responsive annual six-stage visualization to the existing
read-only `/current` Workbench. It does not calculate YunQi, parse calendar
time, infer solar-term names, or change the frozen API contract.

The existing data flow remains authoritative:

```text
/current
  -> @yunqi/client
  -> YunQiCalculationDto
  -> mapCurrentYunQi()
  -> CurrentYunQiViewModel
  -> CurrentStepCard + AnnualStageRail + SixQiTimeline
```

## Data and time boundaries

- `AnnualStageRail` consumes `SixQiTimelineViewModel` directly. It must not
  define `AnnualStageRailData`, a Rail-specific ViewModel, or a second copy of
  the six-stage data.
- The mapper copies `step.index` unchanged. Components use that API index for
  labels, keys, IDs, state, and callbacks; they never derive `index + 1`.
- Stage display status is derived only from `step.index` relative to
  `currentStep.index`: `completed`, `current`, or `upcoming`.
- The UI labels are `已结束`, `当前`, and `未开始`.
- Stage boundaries remain anonymous transition nodes. The UI does not display
  大寒、春分、小满、大暑、秋分 or 小雪.
- All displayed time comes from canonical `localTime`. Compact rendering is a
  string-only projection; Date, Temporal, Intl, IANA zones, browser zones, and
  epoch-derived presentation remain forbidden.

## Layout and interaction

Above `46rem`, the six stages form an equal-width horizontal rail. Equal width
is categorical and does not represent real duration or within-stage progress.
The rail states this explicitly.

At or below `46rem`, the horizontal rail is hidden. The existing vertical
six-step disclosures carry the same stage status, avoiding duplicate mobile
navigation and focus targets.

The existing `CurrentStepCard` remains in place:

1. `CurrentStepCard` answers what is current;
2. `AnnualStageRail` shows annual position;
3. the six disclosures provide comparison and host/guest detail.

`SixQiTimeline` remains the only state owner. It maintains the expanded index
set, opens the current stage initially, adds a changed current stage without
closing user-opened stages, and lets each disclosure toggle independently.
Activating a Rail node ensures the matching detail is open and scrolls its
article into the nearest view without animation. Focus remains on the Rail
button. Automatic current-step changes never force scrolling.

If smooth scrolling is introduced later, it must honor
`prefers-reduced-motion`.

## Accessibility and visual semantics

Each Rail node is a native button with `aria-controls`, `aria-expanded`, and
`aria-current="step"` for the current stage. Its accessible name includes the
API step number, step name, status, and full canonical start/end time. Rail and
detail components share one stable ID helper.

Current state uses the existing cinnabar accent. Completed and upcoming states
use neutral ink, borders, and paper surfaces. No color expresses good/bad,
medical risk, diagnosis, or treatment meaning.

## Non-goals

- No Contract ID, OpenAPI, Client, Service, Domain, rule, or adapter change.
- No solar-term name mapping in React.
- No time-scale calculation, progress percentage, SVG, Canvas, or charting
  dependency.
- No Router, form, database, inquiry workflow, or runtime fixture.

