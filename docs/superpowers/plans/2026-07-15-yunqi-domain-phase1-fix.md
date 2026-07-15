# YunQi Domain Phase 1 Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Phase 1 YunQi implementation so the domain package depends only on calendar abstractions and a Beijing-time instant value, returns a structured host/guest relation, and passes the Phase 2 admission test matrix.

**Architecture:** `@yunqi/domain` owns only immutable domain values, rules, and calculators. A new `@yunqi/calendar-adapter-tyme4ts` workspace package owns `Date`/string parsing, `tyme4ts`, and conversion into `YunQiInstant`; callers inject its `CalendarProvider` into domain services. Domain results carry `YunQiInstant` boundaries and format Beijing timestamps with pure integer calendar arithmetic so no `Date` symbol or concrete calendar implementation remains in domain source.

**Tech Stack:** TypeScript 7 strict mode, pnpm 10 workspace, Vitest 4, fast-check 4, tyme4ts 1.5.2.

## Global Constraints

- 只处理 FIX-001 CalendarProvider 解耦、FIX-002 统一时间模型、FIX-003 升级 HostGuestRelation 模型、FIX-004 增强测试体系。
- 禁止添加 React、API、数据库、高级五运六气规则，禁止修改专家冻结规则含义。
- `packages/yunqi-domain/src` 禁止 `Date`、`tyme4ts` 以及任何具体历法适配器依赖。
- `CalendarProvider.getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant` 是领域层唯一历法端口。
- `YunQiInstant` 必须精确为 `{ epochMilliseconds: number; timezone: "Asia/Shanghai" }`；外部 `string | Date` 只能在 adapter 转换为该类型。
- `timezone: "Asia/Shanghai"` 在 Phase 1 是北京时间 UTC+08:00 的领域标签，不引入历史 IANA 夏令时语义。
- 大寒仍为运气年起点，使用北京时间与实际交节时刻；所有区间仍为左闭右开。
- 十干化运、太过不及、六气名称、主气、客气、司天、在泉和医疗边界不得改变。
- 少阴君火与少阳相火必须表现为 `qiRelation: "DIFFERENT_QI"`、`elementRelation: "SAME_ELEMENT"`、`direction: "NONE"`。
- TypeScript 保持 `strict: true`，禁止 `any`，所有关系标签和规则映射集中在 `src/rules/`。
- 根目录 `pnpm test` 必须覆盖现有 Phase 1 测试、60 甲子、历法边界、客气不变量、客主关系和属性测试。

---

### Task 1: Pure domain calendar and time contracts

**Files:**
- Create: `packages/yunqi-domain/src/calendar/provider.ts`
- Create: `packages/yunqi-domain/src/calendar/time.ts`
- Create: `packages/yunqi-domain/tests/helpers/fixed-calendar-provider.ts`
- Modify: `packages/yunqi-domain/src/types.ts`
- Modify: `packages/yunqi-domain/src/calendar/yunqi-year-resolver.ts`
- Modify: `packages/yunqi-domain/src/liuqi/six-qi.ts`
- Modify: `packages/yunqi-domain/src/services/calculate-year-yunqi.ts`
- Modify: `packages/yunqi-domain/src/services/calculate-yunqi.ts`
- Modify: `packages/yunqi-domain/src/services/get-current-step.ts`
- Modify: `packages/yunqi-domain/src/explanation/explanation-template.ts`
- Modify: `packages/yunqi-domain/src/index.ts`
- Delete: `packages/yunqi-domain/src/calendar/beijing-time.ts`
- Delete: `packages/yunqi-domain/src/calendar/calendar-provider.ts`
- Delete: `packages/yunqi-domain/src/calendar/tyme-calendar-provider.ts`
- Modify: existing tests under `packages/yunqi-domain/tests/`
- Modify: `packages/yunqi-domain/package.json`
- Create: `packages/yunqi-domain/tsconfig.test.json`

**Interfaces:**
- Produces: `SolarTerm`, `YunQiInstant`, `CalendarProvider`, `createYunQiInstant`, `assertYunQiInstant`, `formatYunQiInstant`, `getBeijingCivilYear`.
- Produces: `calculateYearYunQi(year, provider)`, `calculateYunQi(instant, provider)`, and `getCurrentStep(instant, provider)` with mandatory dependency injection.
- Produces: `SixQiStep.start`, `SixQiStep.end`, `YunQiYearResult.start`, `YunQiYearResult.end`, and `YunQiResult.input` as `YunQiInstant` values.

- [ ] **Step 1: Write failing contract tests**

Add tests that compile against and assert the desired contract:

```ts
const instant = createYunQiInstant(1_705_759_642_000);
expect(instant).toEqual({
  epochMilliseconds: 1_705_759_642_000,
  timezone: 'Asia/Shanghai',
});
expect(Object.isFrozen(instant)).toBe(true);
expect(calculateYearYunQi(2024, fixedCalendarProvider).steps[0].start).toEqual(instant);
```

Also assert invalid/non-integer epochs and incorrect provider timezone values throw `RangeError`, and update service tests to pass a `YunQiInstant` plus a provider explicitly.

- [ ] **Step 2: Verify RED**

Run: `pnpm --dir packages/yunqi-domain test`

Expected: FAIL because `calendar/time.ts`, `calendar/provider.ts`, and the instant-based service contracts do not yet exist.

- [ ] **Step 3: Implement the immutable time value and provider port**

Define the exact public contracts:

```ts
export type SolarTerm = '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪';

export interface YunQiInstant {
  epochMilliseconds: number;
  timezone: 'Asia/Shanghai';
}

export interface CalendarProvider {
  getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant;
}
```

`createYunQiInstant` must reject values that are not safe integers and freeze each result. Implement UTC+08:00 civil-field conversion with integer Gregorian arithmetic in `calendar/time.ts`; it must not call or reference `Date`. Preserve the existing `YYYY-MM-DDTHH:mm:ss+08:00` explanation format through `formatYunQiInstant`.

- [ ] **Step 4: Refactor all domain calculations to instant-only data flow**

Use epoch comparisons only:

```ts
const currentStep = annual.steps.find(
  (step) =>
    step.start.epochMilliseconds <= input.epochMilliseconds &&
    input.epochMilliseconds < step.end.epochMilliseconds,
);
```

Require a `CalendarProvider` argument in public services, validate every provider boundary, remove the default adapter and all `DateTimeInput`/`BeijingDateTime` types, and use the shared fixed provider fixture in existing tests. Remove `tyme4ts` from the domain package dependencies. Add `tsconfig.test.json` with `rootDir: "."`, `noEmit: true`, and `include: ["src/**/*.ts", "tests/**/*.ts"]`; expose it as `test:typecheck` so strict mode covers tests as well as production source.

- [ ] **Step 5: Verify GREEN and the isolation gate**

Run:

```powershell
pnpm --dir packages/yunqi-domain test
pnpm --dir packages/yunqi-domain typecheck
pnpm --dir packages/yunqi-domain test:typecheck
rg -n "\bDate\b|tyme4ts|tyme-calendar-provider" packages/yunqi-domain/src packages/yunqi-domain/package.json
```

Expected: all domain tests and typecheck pass; `rg` returns no matches.

- [ ] **Step 6: Commit**

```powershell
git add packages/yunqi-domain docs/superpowers/plans/2026-07-15-yunqi-domain-phase1-fix.md
git commit -m "refactor(yunqi-domain): improve calendar abstraction and domain models"
```

---

### Task 2: External tyme4ts calendar adapter and pnpm workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-lock.yaml`
- Delete: `packages/yunqi-domain/package-lock.json`
- Create: `packages/calendar-adapters/tyme4ts/package.json`
- Create: `packages/calendar-adapters/tyme4ts/tsconfig.json`
- Create: `packages/calendar-adapters/tyme4ts/tsconfig.test.json`
- Create: `packages/calendar-adapters/tyme4ts/src/date-time-input.ts`
- Create: `packages/calendar-adapters/tyme4ts/src/provider.ts`
- Create: `packages/calendar-adapters/tyme4ts/src/index.ts`
- Create: `packages/calendar-adapters/tyme4ts/tests/provider.test.ts`

**Interfaces:**
- Consumes: `CalendarProvider`, `SolarTerm`, `YunQiInstant`, and `createYunQiInstant` from `@yunqi/domain`.
- Produces: `Tyme4tsCalendarProvider`, `tyme4tsCalendarProvider`, `toYunQiInstant(input: string | Date)`, and `DateTimeInput`.

- [ ] **Step 1: Write failing adapter tests**

Cover exact conversion and provider behavior:

```ts
expect(toYunQiInstant('2024-01-20T14:07:22Z')).toEqual({
  epochMilliseconds: 1_705_759_642_000,
  timezone: 'Asia/Shanghai',
});
expect(tyme4tsCalendarProvider.getSolarTermInstant(2024, '大寒')).toEqual({
  epochMilliseconds: 1_705_759_642_000,
  timezone: 'Asia/Shanghai',
});
```

Retain strict rejection of missing timezones, impossible dates, invalid `Date` values, and mismatched tyme query results.

- [ ] **Step 2: Verify RED**

Run: `pnpm test`

Expected: FAIL because the workspace and adapter package do not yet exist.

- [ ] **Step 3: Implement the adapter boundary**

Move all `Date`-based parsing and `tyme4ts` calls into the adapter package. Implement `Tyme4tsCalendarProvider implements CalendarProvider` with `getSolarTermInstant`; verify requested year/name against the returned solar term and convert the Beijing civil fields into one epoch value before calling `createYunQiInstant`.

- [ ] **Step 4: Add workspace orchestration**

Use workspace packages `packages/yunqi-domain` and `packages/calendar-adapters/*`. Pin `tyme4ts` to `1.5.2`, add workspace dependency `@yunqi/domain: workspace:*`, and make root scripts build the domain before adapter tests/typechecking. Add an adapter `test:typecheck` script using `tsconfig.test.json`; root `typecheck` must run source and test typechecks for both packages. Generate the root lockfile with `pnpm install` and remove the obsolete nested npm lockfile.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
```

Expected: domain and adapter suites pass, and both packages typecheck/build.

- [ ] **Step 6: Commit**

```powershell
git add package.json pnpm-workspace.yaml pnpm-lock.yaml packages/yunqi-domain/package-lock.json packages/calendar-adapters
git commit -m "refactor(calendar): extract tyme4ts adapter"
```

---

### Task 3: Structured host/guest relation model

**Files:**
- Modify: `packages/yunqi-domain/src/types.ts`
- Modify: `packages/yunqi-domain/src/relation/host-guest-relation.ts`
- Modify: `packages/yunqi-domain/src/rules/phase1-rules.ts`
- Modify: `packages/yunqi-domain/src/index.ts`
- Modify: `packages/yunqi-domain/tests/liuqi-rules.test.ts`
- Modify: `packages/yunqi-domain/tests/acceptance.test.ts`
- Modify: `packages/yunqi-domain/tests/services.test.ts`
- Modify: `packages/yunqi-domain/tests/public-api.test.ts`
- Modify: `packages/yunqi-domain/tests/public-entry.test.ts`

**Interfaces:**
- Produces: `HostGuestRelationResult`, `QiRelation`, `ElementRelation`, and `HostGuestDirection`.
- Produces: `calculateHostGuestRelation(host, guest): HostGuestRelationResult`.
- Changes: `SixQiStep.relation` from a string union to `HostGuestRelationResult`.

- [ ] **Step 1: Write failing relation tests**

Assert the exact examples and all six semantic cases:

```ts
expect(calculateHostGuestRelation('少阴君火', '少阳相火')).toEqual({
  qiRelation: 'DIFFERENT_QI',
  elementRelation: 'SAME_ELEMENT',
  direction: 'NONE',
  traditionalLabel: '同属火，六气不同',
});

expect(calculateHostGuestRelation('少阴君火', '少阴君火')).toEqual({
  qiRelation: 'SAME_QI',
  elementRelation: 'SAME_ELEMENT',
  direction: 'NONE',
  traditionalLabel: '同气',
});

expect(calculateHostGuestRelation('厥阴风木', '少阴君火')).toMatchObject({
  direction: 'HOST_GENERATES_GUEST',
  traditionalLabel: '主生客，相得',
});
```

The prompt does not assign evaluative wording to the remaining three directions. Preserve their frozen meanings without inventing new expert conclusions by using the neutral labels `客生主`, `主克客`, and `客克主`.

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @yunqi/domain test -- tests/liuqi-rules.test.ts`

Expected: FAIL because the calculator still returns the old string union.

- [ ] **Step 3: Implement the minimal structured mapping**

Define:

```ts
export interface HostGuestRelationResult {
  readonly qiRelation: 'SAME_QI' | 'DIFFERENT_QI';
  readonly elementRelation: 'SAME_ELEMENT' | 'DIFFERENT_ELEMENT';
  readonly direction:
    | 'NONE'
    | 'HOST_GENERATES_GUEST'
    | 'GUEST_GENERATES_HOST'
    | 'HOST_CONTROLS_GUEST'
    | 'GUEST_CONTROLS_HOST';
  readonly traditionalLabel: string;
}
```

Keep the existing frozen priority and element maps as the only decision source. Store fixed traditional labels in `src/rules/phase1-rules.ts`, compute the same-element label from `QI_ELEMENT_MAP`, and freeze every returned result. Tests must assert both direct relation results and each `SixQiStep.relation` are runtime-frozen.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
pnpm --filter @yunqi/domain test -- tests/liuqi-rules.test.ts
pnpm --filter @yunqi/domain test
pnpm --filter @yunqi/domain typecheck
```

Expected: focused and complete domain suites pass.

- [ ] **Step 5: Commit**

```powershell
git add packages/yunqi-domain
git commit -m "refactor(yunqi-domain): structure host guest relations"
```

---

### Task 4: Phase 2 admission test matrix and documentation

**Files:**
- Create: `packages/yunqi-domain/tests/sexagenary-cycle-full.test.ts`
- Create: `packages/calendar-adapters/tyme4ts/tests/solar-term-boundary.test.ts`
- Create: `packages/calendar-adapters/tyme4ts/tests/property.test.ts`
- Modify: `packages/calendar-adapters/tyme4ts/package.json`
- Modify: `packages/yunqi-domain/README.md`
- Create: `packages/calendar-adapters/tyme4ts/README.md`

**Interfaces:**
- Consumes: final domain calculators and the real `tyme4tsCalendarProvider`.
- Produces: exhaustive 60-cycle verification, exact 1 ms boundary coverage, and fast-check invariants over supported years.

- [ ] **Step 1: Add the full sexagenary-cycle test**

For offsets `0..59` from the 1984 `甲子` anchor, call `calculateYearYunQi(year, fixedCalendarProvider)` and independently verify `ganzhi`, `stem`, `branch`, `suiYun`, `sitian`, and `zaiquan` against the frozen expected cycle and explicit maps.

- [ ] **Step 2: Add exact solar-term boundary tests**

For 2024 大寒, each six-step transition `春分`, `小满`, `大暑`, `秋分`, `小雪`, and the ending 2025 大寒, obtain the real adapter instant and assert behavior at `epochMilliseconds - 1`, the exact epoch, and `epochMilliseconds + 1`. The preceding instant must belong to the previous interval; exact and following instants must belong to the new interval. At ending 大寒 the outgoing annual array owns zero steps while the next year's step 1 owns the exact instant.

- [ ] **Step 3: Add fast-check properties**

Install `fast-check@4.9.0` as an adapter test dev dependency and use:

```ts
fc.assert(
  fc.property(fc.integer({ min: 1901, max: 2099 }), (year) => {
    const result = calculateYearYunQi(year, tyme4tsCalendarProvider);
    expect(result.steps).toHaveLength(6);
    expect(result.steps[2].guestQi).toBe(result.sitian);
    expect(result.steps[5].guestQi).toBe(result.zaiquan);
    for (let index = 0; index < 5; index += 1) {
      expect(result.steps[index].end).toEqual(result.steps[index + 1].start);
    }
  }),
  { numRuns: 200 },
);
```

Add a second property generating a year, step index `0..5`, and basis-point offset `0..1000`; construct `start + floor((end - start - 1) * fraction / 1000)` and assert exactly one step contains it and `getCurrentStep` returns that same indexed step. Add a third property over all six host/guest Qi values that checks `qiRelation`, `elementRelation`, `direction`, and the exact centralized label against independently copied element/generation/control maps.

- [ ] **Step 4: Verify RED then GREEN**

Run the three new files before and after implementation:

```powershell
pnpm --filter @yunqi/domain test -- tests/sexagenary-cycle-full.test.ts
pnpm --filter @yunqi/calendar-adapter-tyme4ts test -- tests/solar-term-boundary.test.ts tests/property.test.ts
```

Expected before: missing tests/dependency or failed assertions. Expected after: all three files pass.

- [ ] **Step 5: Update public documentation**

Document that callers convert `string | Date` with `toYunQiInstant`, inject `tyme4tsCalendarProvider`, receive instant boundaries, and that `@yunqi/domain` has zero runtime dependencies. Preserve the medical and rule-freeze boundary wording.

- [ ] **Step 6: Run the complete admission gate**

Run:

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @yunqi/domain test:coverage
rg -n "\bDate\b|tyme4ts" packages/yunqi-domain/src packages/yunqi-domain/package.json
rg -n "if\s*\(\s*yearBranch\s*===\s*['\"]午['\"]" packages
git diff --check 34d4f7913e39f1789a500be788840681c61cae54..HEAD
```

Expected: every command succeeds; both `rg` isolation checks return no matches; coverage and all named admission suites pass.

- [ ] **Step 7: Commit**

```powershell
git add packages package.json pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "test(yunqi-domain): add Phase 2 admission coverage"
```
