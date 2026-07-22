# Phase3-C3 Annual YunQi Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a routable, arbitrary-year YunQi analysis page that consumes only `GET /api/v1/yunqi/year/{year}` and presents the frozen six-stage structure through a neutral master-detail interface.

**Architecture:** React Router owns page and year URL state; a pure validator gates the annual Query Hook; `@yunqi/client` returns `YunQiYearDto`; pure presentation mappers produce a neutral `AnnualYunQiViewModel`; components render Contract facts without current-state or calendar inference. The existing `/current` view remains behaviorally unchanged and derives its status-enhanced stages from the same neutral stage mapper.

**Tech Stack:** React 19.2.7, React Router DOM 7.18.1, Vite 8.1.5, TypeScript 7.0.2, TanStack Query 5.101.2, Vitest 4.1.10, Testing Library 16.3.2, pnpm 10.32.1, Node.js 22.

## Global Constraints

- Implement only in `apps/yunqi-workbench`, root governance/tests, Workbench README, and Phase3-C3 plan/verification documents.
- Do not change Domain, tyme4ts adapter, Service, Contracts, Client, OpenAPI, frozen Contract artifacts, API paths, rule version, or wire fields.
- `/yunqi/current` continues to consume `/current`; `/yunqi/year/:year` consumes only `/year/{year}`; `/yunqi/year` performs no query.
- The selected year exists only in the URL. Do not mirror it in React state and do not derive it from `Date`, `/current`, browser time, server time, or timezone APIs.
- The annual page must not contain `currentStep`, completed/current/upcoming status, or user-facing `当前`, `已结束`, or `未开始` stage copy.
- Display only canonical `localTime` with `北京时间 UTC+08`; never derive display values from `epochMilliseconds`.
- Do not use Date, Temporal, Intl, locale formatting, `toISOString()`, IANA timezone names, browser local time, SVG, Canvas, a chart library, duration ratios, gradients, or default animation.
- `SixQiStageTuple<Stage>` remains an exact readonly six-element tuple. The tuple mapper must explicitly reconstruct six items and must copy `step.index` from the DTO.
- Components consume ViewModels, not DTOs; Router/Page code does not call Client methods; presentation mappers do not depend on React, Router, Query, or Client.
- API `explanations` may be displayed verbatim but never expanded. Traceability contains metadata only.
- Preserve the existing Workbench coverage thresholds: 90% lines/statements/functions and 85% branches.
- Use TDD for every behavior change. Each task must begin RED, reach GREEN, and end with the listed focused verification and commit.
- Execute implementation in an isolated worktree. Preserve the four pre-existing untracked user artifacts in the main worktree.

## Approved references

- Design: `docs/superpowers/specs/2026-07-21-phase3-c3-annual-analysis-design.md`
- State matrix: `docs/superpowers/specs/2026-07-21-phase3-c3-state-machine.md`
- Frozen Contract: `docs/contracts/YQ-API-CONTRACT-1.0.0.md`
- Time ADR: `docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md`
- Router package metadata: `https://www.npmjs.com/package/react-router-dom/v/7.18.1`

## File structure

Create:

```text
apps/yunqi-workbench/src/app/AppRoutes.tsx
apps/yunqi-workbench/src/app/AppRoutes.test.tsx
apps/yunqi-workbench/src/app/NotFoundPage.tsx
apps/yunqi-workbench/src/lib/yunqi-year-range.ts
apps/yunqi-workbench/src/lib/year-validator.ts
apps/yunqi-workbench/src/lib/year-validator.test.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-yunqi-shared.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-annual-yunqi.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-annual-yunqi.test.ts
apps/yunqi-workbench/src/features/yunqi/components/YunQiYearSummaryPanel.tsx
apps/yunqi-workbench/src/features/yunqi/components/RuleExplanationPanel.tsx
apps/yunqi-workbench/src/features/yunqi/components/TraceabilityPanel.tsx
apps/yunqi-workbench/src/features/yunqi/components/rule-traceability-panels.test.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearSelector.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearAnalysisLayout.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearEntryPage.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/InvalidYearPage.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearAnalysisPage.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiView.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiView.test.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiPage.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiPage.test.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualSixQiSelector.tsx
apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualSixQiDetailPanel.tsx
docs/superpowers/verification/2026-07-21-phase3-c3-annual-analysis.md
```

Modify:

```text
apps/yunqi-workbench/package.json
pnpm-lock.yaml
apps/yunqi-workbench/src/main.tsx
apps/yunqi-workbench/src/main.test.tsx
apps/yunqi-workbench/src/app/App.tsx
apps/yunqi-workbench/src/app/App.test.tsx
apps/yunqi-workbench/src/app/routes.ts
apps/yunqi-workbench/src/components/layout/Navigation.tsx
apps/yunqi-workbench/src/components/layout/AppShell.test.tsx
apps/yunqi-workbench/src/components/feedback/AsyncState.tsx
apps/yunqi-workbench/src/components/feedback/AsyncState.test.tsx
apps/yunqi-workbench/src/features/yunqi/presentation/view-model.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-current-yunqi.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-current-yunqi.test.ts
apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx
apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.test.tsx
apps/yunqi-workbench/src/features/yunqi/components/CurrentStepCard.tsx
apps/yunqi-workbench/src/features/yunqi/components/SixQiTimeline.tsx
apps/yunqi-workbench/src/features/yunqi/components/SixQiTimelineItem.tsx
apps/yunqi-workbench/src/features/yunqi/components/AnnualStageRail.tsx
apps/yunqi-workbench/src/test/yunqi-fixtures.ts
apps/yunqi-workbench/src/test/test-utils.tsx
apps/yunqi-workbench/src/test/contract.typecheck.ts
apps/yunqi-workbench/src/styles/global.css
apps/yunqi-workbench/README.md
scripts/check-yunqi-workbench-governance.mjs
tests/yunqi-workbench-governance.test.mjs
```

Delete after consumers migrate:

```text
apps/yunqi-workbench/src/features/yunqi/components/CurrentSummary.tsx
apps/yunqi-workbench/src/features/yunqi/components/TheoryAndTraceabilityPanel.tsx
```

---

### Task 1: Centralize the supported year range and strict URL validation

**Files:**
- Create: `apps/yunqi-workbench/src/lib/yunqi-year-range.ts`
- Create: `apps/yunqi-workbench/src/lib/year-validator.ts`
- Test: `apps/yunqi-workbench/src/lib/year-validator.test.ts`

**Interfaces:**
- Produces: `YUNQI_YEAR_RANGE`, `YUNQI_YEAR_OPTIONS`, `YearParamResult`, and `parseYearParam(value)`.
- Consumes: no React, Router, Query, Client, DTO, Date, or browser API.

- [ ] **Step 1: Write failing range and validator tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  YUNQI_YEAR_OPTIONS,
  YUNQI_YEAR_RANGE,
} from './yunqi-year-range';
import { parseYearParam } from './year-validator';

describe('YunQi year URL validation', () => {
  it('exposes one inclusive option list', () => {
    expect(YUNQI_YEAR_OPTIONS[0]).toBe(YUNQI_YEAR_RANGE.min);
    expect(YUNQI_YEAR_OPTIONS.at(-1)).toBe(YUNQI_YEAR_RANGE.max);
    expect(YUNQI_YEAR_OPTIONS).toHaveLength(
      YUNQI_YEAR_RANGE.max - YUNQI_YEAR_RANGE.min + 1,
    );
  });

  it.each(['1901', '2026', '2099'])('accepts %s', (value) => {
    expect(parseYearParam(value)).toEqual({
      ok: true,
      year: Number(value),
    });
  });

  it.each([undefined, 'abc', '2026abc', '2026.5', '02026'])
    ('rejects %s as format', (value) => {
      expect(parseYearParam(value)).toEqual({
        ok: false,
        reason: 'format',
      });
    });

  it.each(['1900', '2100'])('rejects %s as range', (value) => {
    expect(parseYearParam(value)).toEqual({
      ok: false,
      reason: 'range',
    });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```text
pnpm --filter @yunqi/workbench exec vitest run src/lib/year-validator.test.ts
```

Expected: FAIL because both modules are missing.

- [ ] **Step 3: Implement the single range source and strict parser**

```ts
// yunqi-year-range.ts
export const YUNQI_YEAR_RANGE = {
  min: 1901,
  max: 2099,
} as const;

function createYearOptions(): readonly number[] {
  const values: number[] = [];
  for (
    let year = YUNQI_YEAR_RANGE.min;
    year <= YUNQI_YEAR_RANGE.max;
    year += 1
  ) {
    values.push(year);
  }
  return Object.freeze(values);
}

export const YUNQI_YEAR_OPTIONS = createYearOptions();
```

```ts
// year-validator.ts
import { YUNQI_YEAR_RANGE } from './yunqi-year-range';

export type YearParamResult =
  | { readonly ok: true; readonly year: number }
  | {
      readonly ok: false;
      readonly reason: 'format' | 'range';
    };

export function parseYearParam(
  value: string | undefined,
): YearParamResult {
  if (value === undefined || !/^\d{4}$/.test(value)) {
    return { ok: false, reason: 'format' };
  }

  const year = Number(value);
  if (
    !Number.isInteger(year) ||
    year < YUNQI_YEAR_RANGE.min ||
    year > YUNQI_YEAR_RANGE.max
  ) {
    return { ok: false, reason: 'range' };
  }

  return { ok: true, year };
}
```

- [ ] **Step 4: Run focused tests and typecheck**

```text
pnpm --filter @yunqi/workbench exec vitest run src/lib/year-validator.test.ts
pnpm --filter @yunqi/workbench typecheck
```

Expected: all validator tests PASS; Workbench typecheck PASS.

- [ ] **Step 5: Commit**

```text
git add apps/yunqi-workbench/src/lib
git commit -m "feat(workbench): validate annual year routes"
```

---

### Task 2: Refactor presentation mapping around a neutral six-stage tuple

**Files:**
- Create: `apps/yunqi-workbench/src/features/yunqi/presentation/map-yunqi-shared.ts`
- Create: `apps/yunqi-workbench/src/features/yunqi/presentation/map-annual-yunqi.ts`
- Test: `apps/yunqi-workbench/src/features/yunqi/presentation/map-annual-yunqi.test.ts`
- Modify: `apps/yunqi-workbench/src/features/yunqi/presentation/view-model.ts`
- Modify: `apps/yunqi-workbench/src/features/yunqi/presentation/map-current-yunqi.ts`
- Modify: `apps/yunqi-workbench/src/features/yunqi/presentation/map-current-yunqi.test.ts`
- Modify: `apps/yunqi-workbench/src/features/yunqi/components/CurrentStepCard.tsx`
- Modify: `apps/yunqi-workbench/src/features/yunqi/components/SixQiTimeline.tsx`
- Modify: `apps/yunqi-workbench/src/features/yunqi/components/SixQiTimelineItem.tsx`
- Modify: `apps/yunqi-workbench/src/features/yunqi/components/AnnualStageRail.tsx`
- Modify: `apps/yunqi-workbench/src/test/yunqi-fixtures.ts`
- Modify: `apps/yunqi-workbench/src/test/contract.typecheck.ts`

**Interfaces:**
- Produces: `SixQiStageViewModel`, `CurrentSixQiStageViewModel`, `SixQiStageTuple<Stage>`, `YunQiYearSummaryViewModel`, `AnnualYunQiViewModel`, `mapSixQiStageTuple()`, and `mapAnnualYunQi()`.
- Preserves: `CurrentYunQiViewModel.timeline` as a six-element status-enhanced tuple and all existing C2 behavior.

- [ ] **Step 1: Add RED mapper and type tests**

Add `createYunQiYearDto()` to the fixture by omitting calculation-only fields from the existing fixture, then test:

```ts
import { expectTypeOf } from 'vitest';
import type {
  AnnualYunQiViewModel,
  SixQiStageTuple,
} from './view-model';
import { createYunQiYearDto } from '../../../test/yunqi-fixtures';
import { mapAnnualYunQi } from './map-annual-yunqi';

it('maps a neutral exact six-stage annual model', () => {
  const dto = createYunQiYearDto();
  const result = mapAnnualYunQi(dto);

  expectTypeOf(result.stages).toMatchTypeOf<SixQiStageTuple>();
  expectTypeOf(result).toMatchTypeOf<AnnualYunQiViewModel>();
  expect(result.stages).toHaveLength(6);
  expect(result.stages.map((step) => step.index)).toEqual(
    dto.sixQi.steps.map((step) => step.index),
  );
  expect(result.stages[0]).not.toHaveProperty('status');
  expect(result).not.toHaveProperty('currentStep');
  expect(result).not.toHaveProperty('inputTime');
  expect(result.stages[0].start).not.toHaveProperty(
    'epochMilliseconds',
  );
});
```

Add negative compile checks:

```ts
declare const annual: AnnualYunQiViewModel;
declare const stages: SixQiStageTuple;
void stages[5].index;
// @ts-expect-error Annual analysis has no seventh stage.
void stages[6];
// @ts-expect-error Annual analysis has no current-step field.
void annual.currentStep;
// @ts-expect-error Neutral annual stages have no status.
void annual.stages[0].status;
```

- [ ] **Step 2: Run mapper tests and verify RED**

```text
pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/presentation/map-annual-yunqi.test.ts src/features/yunqi/presentation/map-current-yunqi.test.ts
pnpm --filter @yunqi/workbench test:typecheck
```

Expected: FAIL because annual types and mapper do not exist.

- [ ] **Step 3: Define the neutral and enhanced models**

Use these exact relationships in `view-model.ts`:

```ts
export interface SixQiStageViewModel {
  readonly index: SixQiStepDto['index'];
  readonly name: SixQiStepDto['name'];
  readonly start: YunQiTimeViewModel;
  readonly end: YunQiTimeViewModel;
  readonly hostQi: SixQiStepDto['hostQi'];
  readonly guestQi: SixQiStepDto['guestQi'];
  readonly relation: GuestHostRelationViewModel;
}

export type SixQiStageTuple<
  Stage extends SixQiStageViewModel = SixQiStageViewModel,
> = readonly [Stage, Stage, Stage, Stage, Stage, Stage];

export interface CurrentSixQiStageViewModel
  extends SixQiStageViewModel {
  readonly status: LabeledCodeViewModel<YunQiStageStatusCode>;
}

export type CurrentSixQiStageTuple =
  SixQiStageTuple<CurrentSixQiStageViewModel>;

export interface YunQiYearSummaryViewModel {
  readonly year: YunQiYearDto['year'];
  readonly stemBranch: {
    readonly ganzhi: YunQiYearDto['stemBranch']['ganzhi'];
    readonly stem: YunQiYearDto['stemBranch']['stem'];
    readonly branch: YunQiYearDto['stemBranch']['branch'];
  };
  readonly interval: {
    readonly start: YunQiTimeViewModel;
    readonly end: YunQiTimeViewModel;
  };
  readonly suiYun: {
    readonly element: YunQiYearDto['suiYun']['element'];
    readonly state: YunQiYearDto['suiYun']['state'];
    readonly tone: YunQiYearDto['suiYun']['tone'];
  };
  readonly sitian: YunQiYearDto['sixQi']['sitian'];
  readonly zaiquan: YunQiYearDto['sixQi']['zaiquan'];
}

export interface AnnualYunQiViewModel {
  readonly summary: YunQiYearSummaryViewModel;
  readonly stages: SixQiStageTuple;
  readonly explanations: readonly string[];
  readonly ruleVersion: string;
}
```

Change `CurrentYunQiViewModel.timeline` and `currentStep` to the enhanced types.

- [ ] **Step 4: Extract shared pure mapping and preserve the tuple explicitly**

`map-yunqi-shared.ts` must export a tuple mapper shaped as follows:

```ts
export function mapSixQiStageTuple(
  steps: YunQiYearDto['sixQi']['steps'],
): SixQiStageTuple {
  const [first, second, third, fourth, fifth, sixth] = steps;
  return [
    mapSixQiStage(first),
    mapSixQiStage(second),
    mapSixQiStage(third),
    mapSixQiStage(fourth),
    mapSixQiStage(fifth),
    mapSixQiStage(sixth),
  ];
}
```

`mapSixQiStage(step)` must set `index: step.index`. Move the existing canonical time and exhaustive relation label mappings into this file unchanged.

Implement annual mapping without current-state enrichment:

```ts
export function mapAnnualYunQi(
  dto: YunQiYearDto,
): AnnualYunQiViewModel {
  return {
    summary: mapYunQiYearSummary(dto),
    stages: mapSixQiStageTuple(dto.sixQi.steps),
    explanations: dto.explanations,
    ruleVersion: dto.ruleVersion,
  };
}
```

Refactor `mapCurrentYunQi()` to call the same neutral mapper and explicitly build `CurrentSixQiStageTuple`; never derive the index from tuple position.

- [ ] **Step 5: Update C2 component prop types without changing behavior**

Replace uses of `SixQiTimelineItemViewModel` with
`CurrentSixQiStageViewModel` and replace `SixQiTimelineViewModel` with
`CurrentSixQiStageTuple`. Keep component names, disclosure behavior,
accessible names, and status labels unchanged.

- [ ] **Step 6: Run presentation regression tests and typechecks**

```text
pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/presentation src/features/yunqi/components/AnnualStageRail.test.tsx src/features/yunqi/components/SixQiTimeline.test.tsx
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:typecheck
```

Expected: annual mapper tests PASS; every existing C2 timeline test PASS; both typechecks PASS.

- [ ] **Step 7: Commit**

```text
git add apps/yunqi-workbench/src/features/yunqi apps/yunqi-workbench/src/test
git commit -m "refactor(workbench): share neutral six qi stage models"
```

---

### Task 3: Separate shared summary, rule explanation, and traceability components

**Files:**
- Create: `apps/yunqi-workbench/src/features/yunqi/components/YunQiYearSummaryPanel.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/components/RuleExplanationPanel.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/components/TraceabilityPanel.tsx`
- Test: `apps/yunqi-workbench/src/features/yunqi/components/rule-traceability-panels.test.tsx`
- Modify: `apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx`
- Modify: `apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.test.tsx`
- Delete: `apps/yunqi-workbench/src/features/yunqi/components/CurrentSummary.tsx`
- Delete: `apps/yunqi-workbench/src/features/yunqi/components/TheoryAndTraceabilityPanel.tsx`

**Interfaces:**
- Produces: neutral summary component, verbatim explanation component, metadata-only traceability component.
- Consumes: ViewModels and `YUNQI_API_CONTRACT_ID`; no DTO, Client, API path, or rule logic.

- [ ] **Step 1: Write RED responsibility tests**

```tsx
it('keeps API explanations separate from traceability metadata', () => {
  render(
    <>
      <RuleExplanationPanel explanations={['API 原文']} />
      <TraceabilityPanel
        dataSource="YunQi 年度查询 API"
        ruleVersion="YQ-MVP-RULES-1.0.0"
      />
    </>,
  );

  const explanation = screen.getByRole('region', {
    name: '规则结果说明',
  });
  const trace = screen.getByRole('region', { name: '追溯信息' });
  expect(explanation).toHaveTextContent('API 原文');
  expect(explanation).toHaveTextContent('前端未扩写');
  expect(trace).not.toHaveTextContent('API 原文');
  expect(trace).toHaveTextContent('YQ-API-CONTRACT-1.0.0');
  expect(trace).toHaveTextContent('北京时间 UTC+08');
});

it('does not invent an explanation for an empty API array', () => {
  render(<RuleExplanationPanel explanations={[]} />);
  expect(screen.getByText('本次结果未提供规则说明')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/components/rule-traceability-panels.test.tsx src/features/yunqi/components/CurrentYunQiPage.test.tsx
```

Expected: FAIL because the new components do not exist.

- [ ] **Step 3: Implement the two bounded panels**

`RuleExplanationPanel` renders the supplied strings unchanged and the exact empty message. `TraceabilityPanel` accepts only:

```ts
export interface TraceabilityPanelProps {
  readonly dataSource:
    | 'YunQi 当前查询 API'
    | 'YunQi 年度查询 API';
  readonly ruleVersion: string;
}
```

It imports `YUNQI_API_CONTRACT_ID` and renders the Contract ID, source label,
rule version, and fixed time label. It must not accept `explanations`.

- [ ] **Step 4: Rename the summary component and migrate C2**

Move the existing summary markup to `YunQiYearSummaryPanel`, change its prop to
`YunQiYearSummaryViewModel`, and render it from `CurrentYunQiPage`. Replace the
combined theory panel with:

```tsx
<RuleExplanationPanel explanations={viewModel.explanations} />
<TraceabilityPanel
  dataSource="YunQi 当前查询 API"
  ruleVersion={viewModel.ruleVersion}
/>
```

Delete the retired files only after imports are gone.

- [ ] **Step 5: Run component regression tests**

```text
pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/components
pnpm --filter @yunqi/workbench typecheck
```

Expected: all shared and current-page tests PASS; current C1/C2 facts and current-state behavior remain unchanged.

- [ ] **Step 6: Commit**

```text
git add apps/yunqi-workbench/src/features/yunqi/components
git commit -m "refactor(workbench): separate rule explanations from traceability"
```

---

### Task 4: Build the annual master-detail presentation

**Files:**
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualSixQiSelector.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualSixQiDetailPanel.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiPage.tsx`
- Test: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiPage.test.tsx`
- Modify: `apps/yunqi-workbench/src/styles/global.css`

**Interfaces:**
- Consumes: `AnnualYunQiViewModel`, `SixQiStageTuple`, and neutral stage ViewModels.
- Produces: a native-radio stage selector and one selected-stage detail region.

- [ ] **Step 1: Write RED master-detail tests**

Cover these exact assertions:

```tsx
it('selects the first API stage without current-state language', async () => {
  const viewModel = mapAnnualYunQi(createYunQiYearDto());
  render(<AnnualYunQiPage viewModel={viewModel} />);

  const radios = screen.getAllByRole('radio');
  expect(radios).toHaveLength(6);
  expect(radios[0]).toBeChecked();
  expect(
    screen.getByRole('region', { name: '已选择：初之气' }),
  ).toBeInTheDocument();
  expect(screen.queryByText('当前')).not.toBeInTheDocument();
  expect(screen.queryByText('已结束')).not.toBeInTheDocument();
  expect(screen.queryByText('未开始')).not.toBeInTheDocument();
});

it('changes only the single detail panel', async () => {
  const user = userEvent.setup();
  render(
    <AnnualYunQiPage
      viewModel={mapAnnualYunQi(createYunQiYearDto())}
    />,
  );

  await user.click(screen.getByRole('radio', { name: /三之气/ }));
  expect(
    screen.getByRole('region', { name: '已选择：三之气' }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole('region', { name: /已选择：/ })).toHaveLength(1);
});
```

Also test that the selected stage resets to the first returned stage when the
page is rerendered with a different `summary.year`.

- [ ] **Step 2: Run the component test and verify RED**

```text
pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/year-analysis/components/AnnualYunQiPage.test.tsx
```

Expected: FAIL because annual components are missing.

- [ ] **Step 3: Implement the native radio selector**

Use `useId()` to create an instance-safe group name. For each stage, render a
radio whose `value` is `String(stage.index)`, whose `checked` condition compares
the DTO-derived index, and whose `onChange` calls `onSelect(stage.index)`.
Visible content includes the API index, stage name, and canonical start/end
time through `YunQiTimeDisplay`; do not create a Date or compact epoch format.

- [ ] **Step 4: Implement the selected detail and page state owner**

Use a keyed inner component so a new annual result resets local selection:

```tsx
export function AnnualYunQiPage({ viewModel }: AnnualYunQiPageProps) {
  return (
    <AnnualYunQiContent
      key={viewModel.summary.year}
      viewModel={viewModel}
    />
  );
}

function AnnualYunQiContent({ viewModel }: AnnualYunQiPageProps) {
  const [selectedStepIndex, setSelectedStepIndex] = useState(
    viewModel.stages[0].index,
  );
  const selected = viewModel.stages.find(
    (stage) => stage.index === selectedStepIndex,
  );
  if (!selected) {
    throw new Error('Selected annual Six-Qi stage is missing');
  }

  return (
    <div className="annual-yunqi-page">
      <YunQiYearSummaryPanel summary={viewModel.summary} />
      <AnnualSixQiSelector
        onSelect={setSelectedStepIndex}
        selectedStepIndex={selectedStepIndex}
        stages={viewModel.stages}
      />
      <AnnualSixQiDetailPanel stage={selected} />
      <RuleExplanationPanel explanations={viewModel.explanations} />
      <TraceabilityPanel
        dataSource="YunQi 年度查询 API"
        ruleVersion={viewModel.ruleVersion}
      />
    </div>
  );
}
```

- [ ] **Step 5: Add responsive clinical-editorial styling**

Add path-scoped classes for a six-column selector above `46rem`, a vertical
radio list at or below `46rem`, visible focus styles, a single detail surface,
and no document-level horizontal overflow. Use existing CSS variables and
cinnabar only for the checked selection. Do not add transitions or animations.

- [ ] **Step 6: Run focused tests, coverage slice, and build**

```text
pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/year-analysis/components/AnnualYunQiPage.test.tsx
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench build
```

Expected: master-detail tests PASS; typecheck and production build PASS.

- [ ] **Step 7: Commit**

```text
git add apps/yunqi-workbench/src/features/yunqi/year-analysis apps/yunqi-workbench/src/styles/global.css
git commit -m "feat(workbench): build annual six qi master detail"
```

---

### Task 5: Introduce Router, annual query states, and URL-driven navigation

**Files:**
- Create: `apps/yunqi-workbench/src/app/AppRoutes.tsx`
- Create: `apps/yunqi-workbench/src/app/AppRoutes.test.tsx`
- Create: `apps/yunqi-workbench/src/app/NotFoundPage.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearSelector.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearAnalysisLayout.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearEntryPage.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/InvalidYearPage.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearAnalysisPage.tsx`
- Create: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiView.tsx`
- Test: `apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualYunQiView.test.tsx`
- Modify: `apps/yunqi-workbench/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/yunqi-workbench/src/main.tsx`
- Modify: `apps/yunqi-workbench/src/main.test.tsx`
- Modify: `apps/yunqi-workbench/src/app/App.tsx`
- Modify: `apps/yunqi-workbench/src/app/App.test.tsx`
- Modify: `apps/yunqi-workbench/src/app/routes.ts`
- Modify: `apps/yunqi-workbench/src/components/layout/Navigation.tsx`
- Modify: `apps/yunqi-workbench/src/components/layout/AppShell.test.tsx`
- Modify: `apps/yunqi-workbench/src/components/feedback/AsyncState.tsx`
- Modify: `apps/yunqi-workbench/src/components/feedback/AsyncState.test.tsx`
- Modify: `apps/yunqi-workbench/src/test/test-utils.tsx`
- Modify: `scripts/check-yunqi-workbench-governance.mjs`
- Modify: `tests/yunqi-workbench-governance.test.mjs`

**Interfaces:**
- Produces: three approved routes, strict query gating, native YearSelector navigation, browser-history restoration, and sanitized annual query states.
- Consumes: `parseYearParam`, `YUNQI_YEAR_OPTIONS`, existing year Query Hook, annual mapper/page, and providers.

- [ ] **Step 1: Write RED route and query integration tests**

Tests must prove:

```text
/                         -> replace redirect to /yunqi/current
/yunqi/year               -> selection prompt, getYear called 0 times
/yunqi/year/abc           -> format error, getYear called 0 times
/yunqi/year/1900          -> range error, getYear called 0 times
/yunqi/year/2026          -> getYear called once with 2026
unknown path              -> not-found page, no YunQi request
```

For the valid route, test pending, sanitized error plus retry, empty, and
success. During navigation from a resolved 2026 response to a pending 2027
response, assert that no 2026 facts remain visible.

Use an explicit Router/provider test harness:

```tsx
function renderAppAt(route: string, client: YunQiClient) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppProviders
        queryClient={createWorkbenchQueryClient()}
        yunqiClient={client}
      >
        <App />
      </AppProviders>
    </MemoryRouter>,
  );
}

it('does not query from the annual entry route', async () => {
  const client: YunQiClient = {
    getCurrent: vi.fn(),
    getYear: vi.fn(),
    calculate: vi.fn(),
  };
  renderAppAt('/yunqi/year', client);
  expect(
    screen.getByText('请选择要分析的年份'),
  ).toBeInTheDocument();
  expect(client.getYear).not.toHaveBeenCalled();
});

it('queries exactly the validated URL year', async () => {
  const client: YunQiClient = {
    getCurrent: vi.fn(),
    getYear: vi.fn().mockResolvedValue(createYunQiYearDto()),
    calculate: vi.fn(),
  };
  renderAppAt('/yunqi/year/2026', client);
  expect(
    await screen.findByRole('region', { name: '年度概览' }),
  ).toBeInTheDocument();
  expect(client.getYear).toHaveBeenCalledOnce();
  expect(client.getYear).toHaveBeenCalledWith(2026);
  expect(client.getCurrent).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run route tests and verify RED**

```text
pnpm --filter @yunqi/workbench exec vitest run src/app/AppRoutes.test.tsx src/features/yunqi/year-analysis/components/AnnualYunQiView.test.tsx
```

Expected: FAIL because Router and route components do not exist.

- [ ] **Step 3: Add the exact Router dependency**

```text
pnpm --filter @yunqi/workbench add react-router-dom@7.18.1 --save-exact
```

Do not install `@types/react-router-dom`; the package includes declarations.

- [ ] **Step 4: Add BrowserRouter and declarative routes**

Wrap the existing providers in `main.tsx`:

```tsx
<StrictMode>
  <BrowserRouter>
    <AppProviders>
      <App />
    </AppProviders>
  </BrowserRouter>
</StrictMode>
```

Implement `AppRoutes`:

```tsx
export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate replace to="/yunqi/current" />}
      />
      <Route path="/yunqi/current" element={<CurrentYunQiView />} />
      <Route path="/yunqi/year" element={<YearAnalysisLayout />}>
        <Route index element={<YearEntryPage />} />
        <Route path=":year" element={<YearAnalysisPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

Replace the direct `CurrentYunQiView` in `App` with `AppRoutes`. Preserve the
Contract footer and safety note.

- [ ] **Step 5: Implement URL-derived selection and query gating**

`YearSelector` receives `selectedYear?: number`, renders
`YUNQI_YEAR_OPTIONS`, and navigates to `/yunqi/year/${value}` on change. It has
no `useState`.

`YearAnalysisPage` must gate the query component:

```tsx
export function YearAnalysisPage() {
  const { year: yearParam } = useParams<'year'>();
  const result = parseYearParam(yearParam);
  if (!result.ok) {
    return <InvalidYearPage reason={result.reason} />;
  }
  return <AnnualYunQiView year={result.year} />;
}
```

`AnnualYunQiView` is the only annual query owner and maps success with
`mapAnnualYunQi`. Extend `AsyncState` with optional `loadingMessage`,
`errorMessage`, and `emptyMessage` props while preserving current-view defaults.
Do not configure `placeholderData` or keep-previous-data behavior.

- [ ] **Step 6: Make navigation route-aware**

Change navigation metadata to real `to` values for current and annual views.
Render enabled items with `NavLink`; both `/yunqi/year` and descendants mark
annual active. Inquiry stays a disabled span. Update AppShell/App tests to use
`MemoryRouter`, and set the bootstrap test URL explicitly before importing
`main.tsx`.

- [ ] **Step 7: Permit only the approved Router runtime dependency**

In governance:

- add `react-router-dom` to `ALLOWED_RUNTIME_DEPENDENCIES`;
- remove the old blanket React Router forbidden-import entry;
- keep React Router forbidden in presentation mapper modules;
- replace the old mutation expectation that Router is forbidden with tests
  proving `react-router-dom` is accepted but unlisted routing packages remain
  rejected.

- [ ] **Step 8: Run route, query, shell, governance, and frozen-install checks**

```text
pnpm --filter @yunqi/workbench exec vitest run src/app src/main.test.tsx src/components/layout src/components/feedback src/features/yunqi/year-analysis/components/AnnualYunQiView.test.tsx
pnpm test:workbench-governance
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:typecheck
pnpm install --frozen-lockfile
```

Expected: all focused tests and governance PASS; lockfile is frozen-clean.

- [ ] **Step 9: Commit**

```text
git add apps/yunqi-workbench package.json pnpm-lock.yaml scripts/check-yunqi-workbench-governance.mjs tests/yunqi-workbench-governance.test.mjs
git commit -m "feat(workbench): route annual yunqi analysis"
```

---

### Task 6: Enforce annual semantic and dependency boundaries

**Files:**
- Modify: `scripts/check-yunqi-workbench-governance.mjs`
- Modify: `tests/yunqi-workbench-governance.test.mjs`
- Modify if required by type assertions: `apps/yunqi-workbench/src/test/contract.typecheck.ts`

**Interfaces:**
- Produces: path-scoped structural rules for annual components and shared tuple mapping.
- Preserves: current-page terminology, global safety copy, and unrelated index arithmetic.

- [ ] **Step 1: Write failing governance mutation tests**

Add mutations that must fail for production files under
`features/yunqi/year-analysis/components`:

```text
importing YunQiYearDto
calling client.getYear()
containing currentStep/completed/upcoming identifiers
rendering 当前/已结束/未开始/吉凶/诊断/治疗 literals
rebuilding step.index from callback position + 1
using stages[selectedStepIndex - 1]
duplicating 1901 or 2099 in YearSelector
```

Add mapper mutations that must fail:

```text
mapSixQiStageTuple returns steps.map(mapSixQiStage)
mapSixQiStage assigns index from tuple position
annual mapper imports React Router or TanStack Query
```

Add allow cases proving:

- current-view source may use current/completed/upcoming;
- the global safety note may contain 诊断/治疗;
- unrelated pagination may use `index + 1`;
- tests and fixtures are excluded; and
- the production tree currently has zero violations.

- [ ] **Step 2: Run governance tests and verify RED**

```text
node --test tests/yunqi-workbench-governance.test.mjs
```

Expected: new mutation tests FAIL because checks are not implemented.

- [ ] **Step 3: Implement AST-based, path-scoped checks**

Use TypeScript AST helpers already present in the checker. Do not add broad
repository regexes. Scope annual wording and identifier checks to production
annual component paths. Scope tuple `.map()` detection to the declared
`mapSixQiStageTuple` function. Scope index arithmetic to stage/index
expressions so unrelated arithmetic remains valid.

Require `YearSelector` to import `YUNQI_YEAR_OPTIONS` from
`lib/yunqi-year-range` and reject local numeric boundary literals. Keep DTO,
Client capability, fetch, direct API path, and presentation-mapper rules.

- [ ] **Step 4: Run mutation tests and the production checker**

```text
pnpm test:workbench-governance
pnpm test:time-governance
pnpm --filter @yunqi/workbench test:typecheck
```

Expected: every mutation is rejected for the intended reason; the real source
tree has zero violations; time governance and type tests PASS.

- [ ] **Step 5: Commit**

```text
git add scripts/check-yunqi-workbench-governance.mjs tests/yunqi-workbench-governance.test.mjs apps/yunqi-workbench/src/test/contract.typecheck.ts
git commit -m "test(workbench): enforce annual analysis boundaries"
```

---

### Task 7: Complete Workbench documentation, browser verification, and full quality gates

**Files:**
- Modify: `apps/yunqi-workbench/README.md`
- Create: `docs/superpowers/verification/2026-07-21-phase3-c3-annual-analysis.md`

**Interfaces:**
- Produces: maintainable route/model documentation and auditable verification evidence.
- Consumes: the approved design, state matrix, implemented source, real Fastify service, and production Workbench build.

- [ ] **Step 1: Update the Workbench README**

Document:

- `/yunqi/current`, `/yunqi/year`, and `/yunqi/year/:year` semantics;
- URL-owned year state and local-only stage selection;
- neutral versus status-enhanced stage ViewModels;
- Router → Query Hook → Client → Contract → Mapper → Component flow;
- fixed Beijing time display rules;
- explanation/traceability separation;
- the Router 7.18.1 dependency boundary; and
- local build/test/governance commands.

- [ ] **Step 2: Run the focused Workbench acceptance suite**

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
pnpm test:workbench-governance
pnpm test:time-governance
```

Expected:

- all Workbench tests PASS;
- coverage is at least 90% lines/statements/functions and 85% branches;
- build/typechecks PASS;
- governance has zero production violations.

- [ ] **Step 3: Browser-verify against the real API**

Build and start the real service:

```text
pnpm build
pnpm --filter @yunqi/service start
```

Serve the production Workbench through a temporary verification-only
same-origin static proxy to the real Fastify service, as recorded for
Phase3-C2. Do not commit the proxy and do not use response fixtures or mocks.

Verify:

```text
/ redirects to /yunqi/current
/yunqi/current retains C2 current states and disclosure behavior
/yunqi/year makes no annual request
/yunqi/year/abc and /yunqi/year/2100 make no annual request
/yunqi/year/2026 loads the real annual response
selecting 2027 changes the URL and removes 2026 facts while pending
Back restores the previous URL and annual result
radio Arrow/Space input changes the single detail region
no annual stage displays current/completed/upcoming language
```

Inspect `1440x1000`, `737x900`, and `390x844`. Record viewport width,
scroll width, focus behavior, console warnings/errors, and network evidence.
There must be no document-level horizontal overflow or unexpected console
message.

- [ ] **Step 4: Run full repository acceptance**

```text
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm test:time-governance
pnpm test:time-purity
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm openapi:validate
git diff --check
```

Expected: every command exits 0. OpenAPI may retain only the existing three
non-blocking warnings; no new warning is allowed.

- [ ] **Step 5: Verify frozen-boundary zero diffs**

Against the implementation base commit, confirm no file changes under:

```text
packages/yunqi-domain
packages/calendar-adapters/tyme4ts
packages/yunqi-service
packages/yunqi-contracts
packages/yunqi-client
packages/yunqi-service/openapi
```

Also confirm no React application, database table, inquiry feature, API field,
runtime fixture, or chart dependency was added outside the approved scope.

- [ ] **Step 6: Write the verification record**

Record exact command results, test counts, coverage percentages, browser
viewports, console/network observations, frozen-boundary diff checks, and the
three pre-existing OpenAPI warnings in
`docs/superpowers/verification/2026-07-21-phase3-c3-annual-analysis.md`.

- [ ] **Step 7: Commit documentation and verification**

```text
git add apps/yunqi-workbench/README.md docs/superpowers/verification/2026-07-21-phase3-c3-annual-analysis.md
git commit -m "docs(workbench): record phase3-c3 annual analysis"
```

---

## Final review and delivery

- [ ] Request an independent specification-compliance and code-quality review.
- [ ] Resolve all Critical and Important findings with RED/GREEN regression tests.
- [ ] Re-run the focused and full acceptance commands after the final code change.
- [ ] Push the isolated feature branch and open a ready-for-review PR against `main`.
- [ ] Confirm remote `quality-gates` succeeds and inspect review comments/check logs.
- [ ] Merge only after the required check passes and the PR is conflict-free.
- [ ] Fast-forward the local main worktree without touching the four user-owned untracked artifacts.
- [ ] Delete the merged local/remote feature branch and remove only the Phase3-C3 worktree.

The work is complete only when the merged `main` commit, remote PR state,
required `quality-gates`, local main synchronization, branch/worktree cleanup,
and preserved user artifacts are all verified.
