# YunQi Domain Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the standalone `packages/yunqi-domain` TypeScript package required by the approved Phase 1 prompt, including actual Beijing solar-term boundaries and complete Vitest evidence.

**Architecture:** Versioned tables under `src/rules` are the only source of YunQi mappings. Pure calculators consume those tables and an injectable `CalendarProvider`; a deterministic `tyme4ts` adapter supplies the default actual solar-term times. Public services compose the calculators without UI, persistence, API, or diagnostic behavior.

**Tech Stack:** Node.js 22.14.0, npm 11.9.0, TypeScript 7.0.2, Vitest 4.1.10, tyme4ts 1.5.2.

## Global Constraints

- Implement only `packages/yunqi-domain`; do not add React, login, HIS, EMR, database, API framework, or large-model code.
- All YunQi mappings come from `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` and `src/rules/phase1-rules.ts`; calculators may not duplicate mapping literals.
- Use Beijing time UTC+08:00 and actual `tyme4ts` solar-term instants; fixed calendar dates are forbidden.
- Use left-closed, right-open intervals at Dahan and all six-step boundaries.
- Preserve `少阴君火` and `少阳相火` as distinct qi values.
- Rule version is exactly `V1.0-2026.7.7-implementation.1` and status remains pending formal freeze.
- Outputs may contain rule explanations and teaching notes only; no diagnosis, syndrome differentiation, prescription, herb, or dosage content.
- Initialize a local Git repository with default branch `main`, commit the documentation baseline, and implement on `feat/yunqi-domain-phase1`.

---

### Task 1: Package scaffold, public types, and versioned rule constants

**Files:**
- Create: `packages/yunqi-domain/package.json`
- Create: `packages/yunqi-domain/tsconfig.json`
- Create: `packages/yunqi-domain/src/types.ts`
- Create: `packages/yunqi-domain/src/rules/phase1-rules.ts`
- Test: `packages/yunqi-domain/tests/rules.test.ts`

**Interfaces:**
- Consumes: `rules/PHASE1_IMPLEMENTATION_RULES_V1.md`.
- Produces: `RULE_VERSION`, `SIXTY_CYCLE`, `STEM_RULES`, `BRANCH_QI_RULES`, `HOST_QI_SEQUENCE`, `GUEST_QI_SEQUENCE`, `STEP_BOUNDARY_TERMS`, and all public domain unions/interfaces.

- [ ] **Step 0: Initialize local Git and create the implementation branch**

Run from `D:\Projects\YunQi`:

```powershell
git init -b main
git add .gitignore README.md api architecture codex database docs domain rules
git commit -m "chore: initialize YunQi project"
git switch -c feat/yunqi-domain-phase1
```

Expected: `main` contains one baseline commit, the current branch is `feat/yunqi-domain-phase1`, and `git status --short` is empty.

- [ ] **Step 1: Create package configuration**

Use exact runtime and development dependencies:

```json
{
  "name": "@yunqi/domain",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": { "tyme4ts": "1.5.2" },
  "devDependencies": {
    "@vitest/coverage-v8": "4.1.10",
    "typescript": "7.0.2",
    "vitest": "4.1.10"
  }
}
```

Configure `target` and `module` as `ES2022`, `moduleResolution` as `Bundler`, `strict: true`, declaration output to `dist`, `rootDir: src`, and include only `src/**/*.ts` in the build.

- [ ] **Step 2: Install dependencies**

Run: `npm install` from `packages/yunqi-domain`.

Expected: exit 0 and a package-local `package-lock.json` with the exact direct versions above.

- [ ] **Step 3: Write the failing rule-table test**

```ts
import { describe, expect, it } from 'vitest';
import {
  BRANCH_QI_RULES,
  GUEST_QI_SEQUENCE,
  HOST_QI_SEQUENCE,
  RULE_VERSION,
  SIXTY_CYCLE,
  STEM_RULES,
} from '../src/rules/phase1-rules.js';

describe('Phase 1 rule tables', () => {
  it('exposes the versioned complete tables without merging the two fire qi', () => {
    expect(RULE_VERSION).toBe('V1.0-2026.7.7-implementation.1');
    expect(SIXTY_CYCLE).toHaveLength(60);
    expect(new Set(SIXTY_CYCLE).size).toBe(60);
    expect(Object.keys(STEM_RULES)).toHaveLength(10);
    expect(Object.keys(BRANCH_QI_RULES)).toHaveLength(12);
    expect(HOST_QI_SEQUENCE[1]).toBe('少阴君火');
    expect(HOST_QI_SEQUENCE[2]).toBe('少阳相火');
    expect(GUEST_QI_SEQUENCE).toEqual([
      '厥阴风木', '少阴君火', '太阴湿土',
      '少阳相火', '阳明燥金', '太阳寒水',
    ]);
  });
});
```

- [ ] **Step 4: Run RED and confirm the missing module is the cause**

Run: `npm test -- tests/rules.test.ts`.

Expected: FAIL because `src/rules/phase1-rules.ts` does not exist.

- [ ] **Step 5: Add the public types and exact constants**

Define these exact public discriminants in `src/types.ts`:

```ts
export type Element = '木' | '火' | '土' | '金' | '水';
export type YunState = '太过' | '不及';
export type HeavenlyStem = '甲'|'乙'|'丙'|'丁'|'戊'|'己'|'庚'|'辛'|'壬'|'癸';
export type EarthlyBranch = '子'|'丑'|'寅'|'卯'|'辰'|'巳'|'午'|'未'|'申'|'酉'|'戌'|'亥';
export type Qi = '厥阴风木'|'少阴君火'|'太阴湿土'|'少阳相火'|'阳明燥金'|'太阳寒水';
export type HostGuestRelation =
  | 'SAME_QI' | 'SAME_ELEMENT_DIFFERENT_QI'
  | 'HOST_GENERATES_GUEST' | 'GUEST_GENERATES_HOST'
  | 'HOST_CONTROLS_GUEST' | 'GUEST_CONTROLS_HOST';
export type SixStepBoundaryTerm = '大寒'|'春分'|'小满'|'大暑'|'秋分'|'小雪';
export type DateTimeInput = string | Date;
export type Tone = '太角'|'少角'|'太徵'|'少徵'|'太宫'|'少宫'|'太商'|'少商'|'太羽'|'少羽';
export type StepName = '初之气'|'二之气'|'三之气'|'四之气'|'五之气'|'终之气';

export interface BeijingDateTime { iso: string; epochMilliseconds: number }
export interface StemBranch { year: number; ganzhi: string; stem: HeavenlyStem; branch: EarthlyBranch }
export interface SuiYun { element: Element; state: YunState; tone: Tone }
export interface SitianZaiquan { sitian: Qi; zaiquan: Qi }
export interface SixQiStep {
  index: 1|2|3|4|5|6;
  name: StepName;
  start: string;
  end: string;
  hostQi: Qi;
  guestQi: Qi;
  relation: HostGuestRelation;
}
export interface YunQiYearResult extends StemBranch {
  start: string;
  end: string;
  suiYun: SuiYun;
  sitian: Qi;
  zaiquan: Qi;
  steps: readonly SixQiStep[];
  ruleVersion: string;
  explanations: readonly string[];
}
export interface YunQiResult extends YunQiYearResult {
  input: string;
  currentStep: SixQiStep;
}
```

Copy every value from the executable Markdown rule table into frozen `as const` values in `phase1-rules.ts`; include the complete 60-item sequence rather than generating it at runtime.

- [ ] **Step 6: Run GREEN**

Run: `npm test -- tests/rules.test.ts`.

Expected: 1 test passes, 0 failures.

- [ ] **Step 7: Commit the verified rule/package foundation**

Run: `git add packages/yunqi-domain && git commit -m "feat(domain): add versioned Phase 1 rule foundation"`.

Expected: commit succeeds after the focused test has passed.

### Task 2: Beijing time parsing and actual solar-term provider

**Files:**
- Create: `packages/yunqi-domain/src/calendar/beijing-time.ts`
- Create: `packages/yunqi-domain/src/calendar/calendar-provider.ts`
- Create: `packages/yunqi-domain/src/calendar/tyme-calendar-provider.ts`
- Test: `packages/yunqi-domain/tests/calendar.test.ts`

**Interfaces:**
- Consumes: `DateTimeInput`, `SixStepBoundaryTerm`, and `tyme4ts.SolarTerm`.
- Produces: `BeijingDateTime`, `parseDateTimeInput()`, `formatBeijingDateTime()`, `CalendarProvider`, `tymeCalendarProvider`, and `defaultCalendarProvider`.

- [ ] **Step 1: Write failing time and provider tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseDateTimeInput, formatBeijingDateTime } from '../src/calendar/beijing-time.js';
import { tymeCalendarProvider } from '../src/calendar/tyme-calendar-provider.js';

describe('Beijing time', () => {
  it('requires an absolute instant and formats it in UTC+08:00', () => {
    expect(() => parseDateTimeInput('2024-01-20T22:07:08')).toThrow(/时区/);
    const instant = parseDateTimeInput('2024-01-20T14:07:08Z');
    expect(formatBeijingDateTime(instant)).toBe('2024-01-20T22:07:08+08:00');
  });

  it('gets the 2024 Dahan instant from tyme4ts at second precision', () => {
    const dahan = tymeCalendarProvider.getSolarTermTime(2024, '大寒');
    expect(dahan.iso).toBe('2024-01-20T22:07:22+08:00');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/calendar.test.ts`.

Expected: FAIL because the calendar modules are missing.

- [ ] **Step 3: Implement strict parsing and provider adaptation**

`parseDateTimeInput()` must reject strings that do not match `/(Z|[+-]\d{2}:\d{2})$/`, reject invalid `Date` values, and return epoch milliseconds. `formatBeijingDateTime()` adds eight hours for field extraction and emits the fixed `+08:00` suffix.

Define `CalendarProvider` exactly as below and implement a frozen, stateless provider object using actual getters from tyme4ts:

```ts
export interface CalendarProvider {
  getSolarTermTime(year: number, term: SixStepBoundaryTerm): BeijingDateTime;
}
```

The adapter body uses this API shape:

```ts
const solarTime = SolarTerm.fromName(year, term).getJulianDay().getSolarTime();
const iso = formatBeijingFields(
  solarTime.getYear(), solarTime.getMonth(), solarTime.getDay(),
  solarTime.getHour(), solarTime.getMinute(), solarTime.getSecond(),
);
return { iso, epochMilliseconds: Date.parse(iso) };
```

Validate that the returned fields round-trip to a finite epoch and retain the requested term/year.

- [ ] **Step 4: Run GREEN and typecheck**

Run: `npm test -- tests/calendar.test.ts && npm run typecheck`.

Expected: 2 tests pass and TypeScript exits 0.

- [ ] **Step 5: Commit the verified calendar adapter**

Run: `git add packages/yunqi-domain && git commit -m "feat(domain): add Beijing solar-term provider"`.

### Task 3: Sixty-cycle, YunQi year resolver, and SuiYun

**Files:**
- Create: `packages/yunqi-domain/src/ganzhi/stem-branch.ts`
- Create: `packages/yunqi-domain/src/calendar/yunqi-year-resolver.ts`
- Create: `packages/yunqi-domain/src/wuyun/sui-yun.ts`
- Test: `packages/yunqi-domain/tests/year-and-suiyun.test.ts`

**Interfaces:**
- Consumes: `SIXTY_CYCLE`, `SIXTY_CYCLE_ANCHOR`, `STEM_RULES`, `CalendarProvider`, and absolute datetime parsing.
- Produces: `calculateStemBranch(year)`, `resolveYunQiYear(input, provider)`, and `calculateSuiYun(stem)`.

- [ ] **Step 1: Write failing 60-cycle, typical-year, and Dahan tests**

```ts
it('cycles all 60 Ganzhi from the 1984 Jiazi anchor', () => {
  const names = Array.from({ length: 60 }, (_, offset) => calculateStemBranch(1984 + offset).ganzhi);
  expect(new Set(names).size).toBe(60);
  expect(names[0]).toBe('甲子');
  expect(calculateStemBranch(2044).ganzhi).toBe('甲子');
});

it.each([
  [2024, '甲辰', '土', '太过', '太宫'],
  [2025, '乙巳', '金', '不及', '少商'],
  [2026, '丙午', '水', '太过', '太羽'],
  [2027, '丁未', '木', '不及', '少角'],
  [2028, '戊申', '火', '太过', '太徵'],
])('calculates %i', (year, ganzhi, element, state, tone) => {
  const stemBranch = calculateStemBranch(year);
  expect(stemBranch.ganzhi).toBe(ganzhi);
  expect(calculateSuiYun(stemBranch.stem)).toEqual({ element, state, tone });
});

it('changes YunQi year at the exact Dahan second', () => {
  const provider = tymeCalendarProvider;
  expect(resolveYunQiYear('2024-01-20T22:07:21+08:00', provider)).toBe(2023);
  expect(resolveYunQiYear('2024-01-20T22:07:22+08:00', provider)).toBe(2024);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/year-and-suiyun.test.ts`.

Expected: FAIL because the three calculators are missing.

- [ ] **Step 3: Implement minimal table-driven calculators**

Use normalized modulo for years before 1984:

```ts
const cycleLength = SIXTY_CYCLE.length;
const index = ((year - SIXTY_CYCLE_ANCHOR.year) % cycleLength + cycleLength) % cycleLength;
const ganzhi = SIXTY_CYCLE[index];
return { year, ganzhi, stem: ganzhi[0] as HeavenlyStem, branch: ganzhi[1] as EarthlyBranch };
```

Resolve the Beijing civil year from the instant, compare against that year's Provider Dahan milliseconds, and select civil year or civil year minus one. `calculateSuiYun()` returns a new object copied from `STEM_RULES[stem]`.

- [ ] **Step 4: Run GREEN plus the 1900–2100 range check**

Add a test loop for every year 1900 through 2100 asserting a two-character Ganzhi and defined stem rule. Run `npm test -- tests/year-and-suiyun.test.ts`.

Expected: all parameterized cases and 201-year range assertions pass.

- [ ] **Step 5: Commit the verified annual calculators**

Run: `git add packages/yunqi-domain && git commit -m "feat(domain): calculate Ganzhi and SuiYun years"`.

### Task 4: Sitian/Zaiquan, host/guest qi, and host-guest relations

**Files:**
- Create: `packages/yunqi-domain/src/liuqi/sitian-zaiquan.ts`
- Create: `packages/yunqi-domain/src/liuqi/host-guest.ts`
- Create: `packages/yunqi-domain/src/relation/host-guest-relation.ts`
- Test: `packages/yunqi-domain/tests/liuqi-rules.test.ts`

**Interfaces:**
- Consumes: branch, qi sequences, qi-element table, generation table, and control table.
- Produces: `getSitianZaiquan(branch)`, `getHostQi(index)`, `calculateGuestQi(sitian)`, and `calculateHostGuestRelation(host, guest)`.

- [ ] **Step 1: Write failing invariant and relation tests**

```ts
it.each(['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const)(
  '%s keeps Sitian at step 3 and Zaiquan at step 6',
  (branch) => {
    const { sitian, zaiquan } = getSitianZaiquan(branch);
    const guest = calculateGuestQi(sitian);
    expect(guest[2]).toBe(sitian);
    expect(guest[5]).toBe(zaiquan);
  },
);

it.each([
  ['厥阴风木','厥阴风木','SAME_QI'],
  ['少阴君火','少阳相火','SAME_ELEMENT_DIFFERENT_QI'],
  ['厥阴风木','少阴君火','HOST_GENERATES_GUEST'],
  ['少阴君火','厥阴风木','GUEST_GENERATES_HOST'],
  ['厥阴风木','太阴湿土','HOST_CONTROLS_GUEST'],
  ['太阴湿土','厥阴风木','GUEST_CONTROLS_HOST'],
])('classifies %s / %s', (host, guest, expected) => {
  expect(calculateHostGuestRelation(host, guest)).toBe(expected);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/liuqi-rules.test.ts`.

Expected: FAIL because the rule calculators are missing.

- [ ] **Step 3: Implement alignment and ordered relation checks**

Find the Sitian index in `GUEST_QI_SEQUENCE`; step 1 starts two positions before it. Generate exactly six qi with normalized modulo. For relations, check exact equality, then same element, then the two generation directions, then the two control directions; throw only if a frozen table is internally inconsistent.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/liuqi-rules.test.ts`.

Expected: all 12 branch invariants and all 6 relation categories pass.

- [ ] **Step 5: Commit the verified LiuQi mappings**

Run: `git add packages/yunqi-domain && git commit -m "feat(domain): add host and guest qi rules"`.

### Task 5: Six-step timeline and public calculation services

**Files:**
- Create: `packages/yunqi-domain/src/liuqi/six-qi.ts`
- Create: `packages/yunqi-domain/src/services/calculate-year-yunqi.ts`
- Create: `packages/yunqi-domain/src/services/calculate-yunqi.ts`
- Create: `packages/yunqi-domain/src/services/get-current-step.ts`
- Test: `packages/yunqi-domain/tests/services.test.ts`

**Interfaces:**
- Consumes: all Task 2–4 calculators.
- Produces: `buildSixQiSteps(year, sitian, provider)`, `calculateYearYunQi()`, `calculateYunQi()`, and `getCurrentStep()`.

- [ ] **Step 1: Write failing timeline and boundary tests**

```ts
it('builds six continuous left-closed/right-open steps', () => {
  const result = calculateYearYunQi(2024);
  expect(result.steps).toHaveLength(6);
  expect(result.steps[0].start).toBe('2024-01-20T22:07:22+08:00');
  for (let index = 0; index < 5; index += 1) {
    expect(result.steps[index].end).toBe(result.steps[index + 1].start);
  }
  expect(result.steps[2].guestQi).toBe(result.sitian);
  expect(result.steps[5].guestQi).toBe(result.zaiquan);
});

it('switches steps exactly at every solar-term boundary', () => {
  const result = calculateYearYunQi(2024);
  for (let index = 1; index < result.steps.length; index += 1) {
    const boundary = Date.parse(result.steps[index].start);
    expect(getCurrentStep(new Date(boundary - 1000)).index).toBe(index);
    expect(getCurrentStep(new Date(boundary)).index).toBe(index + 1);
  }
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/services.test.ts`.

Expected: FAIL because services are missing.

- [ ] **Step 3: Implement the timeline and composition**

Fetch start terms `[大寒, 春分, 小满, 大暑, 秋分, 小雪]` for the same nominal year and the ending `大寒` for `year + 1`. Validate strict monotonic increase. Build six immutable objects with 1-based indices and names `[初之气, 二之气, 三之气, 四之气, 五之气, 终之气]`.

`calculateYearYunQi()` composes all annual fields. `calculateYunQi()` resolves the year, calculates the annual result, finds `startMs <= inputMs && inputMs < endMs`, and returns the normalized input plus `currentStep`. `getCurrentStep()` returns that field directly.

- [ ] **Step 4: Run GREEN and verify every boundary**

Run: `npm test -- tests/services.test.ts`.

Expected: all continuity, invariant, Dahan, and five internal boundary cases pass with exactly one matching step.

- [ ] **Step 5: Commit the verified services**

Run: `git add packages/yunqi-domain && git commit -m "feat(domain): compose six-step YunQi services"`.

### Task 6: Rule explanations, public exports, build, and full acceptance matrix

**Files:**
- Create: `packages/yunqi-domain/src/explanation/explanation-template.ts`
- Create: `packages/yunqi-domain/src/index.ts`
- Create: `packages/yunqi-domain/README.md`
- Test: `packages/yunqi-domain/tests/public-api.test.ts`
- Test: `packages/yunqi-domain/tests/acceptance.test.ts`

**Interfaces:**
- Consumes: all public types and services.
- Produces: the stable package export surface and safe rule explanations.

- [ ] **Step 1: Write failing public API and safety tests**

```ts
import {
  calculateYunQi,
  calculateYearYunQi,
  getCurrentStep,
  RULE_VERSION,
} from '../src/index.js';

it('exports the approved services and safe explanations', () => {
  const result = calculateYunQi('2024-05-20T21:00:00+08:00');
  expect(typeof calculateYearYunQi).toBe('function');
  expect(typeof getCurrentStep).toBe('function');
  expect(RULE_VERSION).toBe('V1.0-2026.7.7-implementation.1');
  expect(result.explanations.join('')).not.toMatch(/诊断|证型|处方|剂量|建议用药/);
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/public-api.test.ts tests/acceptance.test.ts`.

Expected: FAIL because `src/index.ts` and explanations do not exist.

- [ ] **Step 3: Implement deterministic explanation templates and exports**

Explanations must state only facts such as `“2024 运气年以北京时间 2024 年大寒实际交节时刻为起点。”`, `“年干甲按规则表对应土运太过（太宫）。”`, and `“三之气客气与司天同为太阳寒水。”`. Export services, provider interfaces/default adapter, public types, and `RULE_VERSION`; do not export mutable rule objects.

Document input timezone requirements, API examples, safety boundary, rule status, and commands in the package README.

- [ ] **Step 4: Run the complete verification suite**

Run from `packages/yunqi-domain`:

```powershell
npm test
npm run typecheck
npm run build
npm run test:coverage
npm ls --all
```

Expected: all tests pass with 0 failures, typecheck/build exit 0, coverage command exits 0, and the runtime dependency tree contains only `tyme4ts` (no React, database, Fastify, or model SDK).

- [ ] **Step 5: Audit the prompt requirement by requirement**

Record direct evidence for: package path, pure calculators, nine Task 2 functions, 60 Jiazi, 2024–2028, Dahan boundary, all six-step boundaries, step 3 = Sitian, final step = Zaiquan, file tree, implementation description, test output, and unresolved formal-freeze status. Any missing evidence keeps the goal incomplete.

- [ ] **Step 6: Commit the complete verified Phase 1 package**

Run: `git add packages/yunqi-domain docs/superpowers rules/PHASE1_IMPLEMENTATION_RULES_V1.md && git commit -m "docs(domain): document Phase 1 API and verification"`.

Expected: commit succeeds and `git status --short` is empty.
