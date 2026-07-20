# Phase3-B React Workbench Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable, tested React Workbench foundation that consumes the frozen YunQi client/contracts boundary without adding business pages or time-semantic drift.

**Architecture:** Add `apps/yunqi-workbench` as a Vite SPA. Provider infrastructure owns QueryClient, theme, YunQiClient, and render-error boundaries; feature hooks consume `@yunqi/client` query options; presentation components receive state and DTOs without performing transport or business calculations.

**Tech Stack:** React 19.2.7, React DOM 19.2.7, Vite 8.1.5, TypeScript 7.0.2, TanStack Query 5.101.2, Vitest 4.1.10, Testing Library 16.3.2, jsdom 29.1.1, pnpm 10.32.1, Node.js 22.

## Global Constraints

- API path remains `/api/v1`.
- Contract ID remains `YQ-API-CONTRACT-1.0.0`.
- OpenAPI document remains `1.2.0`.
- Rule version remains `YQ-MVP-RULES-1.0.0`.
- `@yunqi/contracts` remains `1.0.0`; `@yunqi/client` remains `1.0.0`.
- Workbench may depend on `@yunqi/client` and `@yunqi/contracts`; it must not depend on Service, Domain, or calendar adapters.
- DTOs are imported from `@yunqi/contracts`; no Workbench DTO copies are allowed.
- HTTP behavior comes from `@yunqi/client`; Workbench components must not call `fetch`, Axios, or client methods directly.
- Business time is fixed `BeijingStandardTime+08:00`; Workbench source must not use Date, Temporal, Intl, locale/ISO conversion, IANA timezone names, or browser local timezone.
- No Next.js, SSR, React Server Components, router, business page, inquiry flow, expert review, rule management, diagnosis, or treatment output.
- Root and Workbench packages declare Node.js `>=22`; GitHub Actions remains on Node 22.
- Workbench coverage thresholds are statements 90, branches 85, functions 90, and lines 90.
- Every production behavior follows RED, GREEN, REFACTOR; config-only generation is paired with a failing repository governance assertion.

---

### Task 1: Create the runnable Vite workspace and root integration

**Files:**
- Create: `tests/yunqi-workbench-governance.test.mjs`
- Create: `apps/yunqi-workbench/package.json`
- Create: `apps/yunqi-workbench/index.html`
- Create: `apps/yunqi-workbench/tsconfig.json`
- Create: `apps/yunqi-workbench/tsconfig.test.json`
- Create: `apps/yunqi-workbench/vite.config.ts`
- Create: `apps/yunqi-workbench/vitest.config.ts`
- Create: `apps/yunqi-workbench/src/vite-env.d.ts`
- Create: `apps/yunqi-workbench/src/test/setup.ts`
- Create: `apps/yunqi-workbench/src/app/App.test.tsx`
- Create: `apps/yunqi-workbench/src/app/App.tsx`
- Create: `apps/yunqi-workbench/src/main.tsx`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `@yunqi/client@1.0.0`, `@yunqi/contracts@1.0.0`.
- Produces: workspace package `@yunqi/workbench`, Vite `dev`/`build`, Vitest `test`/`test:coverage`, and TypeScript `typecheck`/`test:typecheck`.

- [ ] **Step 1: Write the failing workspace governance test**

Create `tests/yunqi-workbench-governance.test.mjs` with assertions that:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = (path) =>
  JSON.parse(readFileSync(join(root, path), 'utf8'));

test('Workbench workspace and versions are pinned', () => {
  const app = readJson('apps/yunqi-workbench/package.json');
  const workspace = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const rootPackage = readJson('package.json');

  assert.equal(app.name, '@yunqi/workbench');
  assert.equal(app.engines.node, '>=22');
  assert.equal(app.dependencies.react, '19.2.7');
  assert.equal(app.dependencies['react-dom'], '19.2.7');
  assert.equal(app.dependencies['@tanstack/react-query'], '5.101.2');
  assert.equal(app.dependencies['@yunqi/client'], 'workspace:*');
  assert.equal(app.dependencies['@yunqi/contracts'], 'workspace:*');
  assert.equal(rootPackage.engines.node, '>=22');
  assert.match(workspace, /apps\/\*/);
  assert.doesNotMatch(JSON.stringify(app), /next|react-router|axios/);
});
```

- [ ] **Step 2: Run the governance test and verify RED**

Run:

```text
node --test tests/yunqi-workbench-governance.test.mjs
```

Expected: FAIL because `apps/yunqi-workbench/package.json` does not exist.

- [ ] **Step 3: Add the package and toolchain configuration**

Create `apps/yunqi-workbench/package.json` with exact runtime dependencies:

```json
{
  "name": "@yunqi/workbench",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json --noEmit && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test:typecheck": "tsc -p tsconfig.test.json --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage --maxWorkers=1"
  },
  "dependencies": {
    "@tanstack/react-query": "5.101.2",
    "@yunqi/client": "workspace:*",
    "@yunqi/contracts": "workspace:*",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.3",
    "@vitest/coverage-v8": "4.1.10",
    "jsdom": "29.1.1",
    "typescript": "7.0.2",
    "vite": "8.1.5",
    "vitest": "4.1.10"
  }
}
```

Configure strict bundler TypeScript with DOM libraries and `react-jsx`.
Configure Vite with `react()`. Configure Vitest with jsdom,
`src/test/setup.ts`, CSS enabled, and thresholds `90/85/90/90`.
Create `index.html` with `#root` and `/src/main.tsx`.

Add `apps/*` to `pnpm-workspace.yaml`. Add root `engines.node: >=22`.
Append `pnpm --filter @yunqi/workbench build`, test, typecheck,
test:typecheck, and test:coverage to the corresponding root scripts.

- [ ] **Step 4: Install exact dependencies and verify governance GREEN**

Run:

```text
pnpm install
node --test tests/yunqi-workbench-governance.test.mjs
```

Expected: lockfile updates and the governance test passes.

- [ ] **Step 5: Write the failing application smoke test**

Create `src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the Workbench identity', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'TCM YunQi Lab' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the smoke test and verify RED**

Run:

```text
pnpm --filter @yunqi/workbench test -- src/app/App.test.tsx
```

Expected: FAIL because `App.tsx` does not exist.

- [ ] **Step 7: Implement the minimal React entry**

Implement `App` with a heading and `main.tsx` using
`createRoot(...).render(<StrictMode><App /></StrictMode>)`. Add
`src/test/setup.ts` importing `@testing-library/jest-dom/vitest`.

- [ ] **Step 8: Verify GREEN and the production build**

Run:

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench build
```

Expected: one test passes and Vite writes `dist`.

- [ ] **Step 9: Commit**

```text
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tests/yunqi-workbench-governance.test.mjs apps/yunqi-workbench
git commit -m "feat(workbench): create Vite React application"
```

---

### Task 2: Establish Query and YunQi client providers

**Files:**
- Create: `apps/yunqi-workbench/src/lib/runtime-config.test.ts`
- Create: `apps/yunqi-workbench/src/lib/runtime-config.ts`
- Create: `apps/yunqi-workbench/src/providers/QueryProvider.test.tsx`
- Create: `apps/yunqi-workbench/src/providers/QueryProvider.tsx`
- Create: `apps/yunqi-workbench/src/providers/YunQiClientProvider.test.tsx`
- Create: `apps/yunqi-workbench/src/providers/YunQiClientProvider.tsx`

**Interfaces:**
- Produces: `readWorkbenchRuntimeConfig(env)`,
  `createWorkbenchQueryClient(options?)`, `QueryProvider`,
  `YunQiClientProvider`, and `useYunQiClient(): YunQiClient`.
- Consumes: `createFetchTransport`, `createYunQiClient`, `YunQiClient`.

- [ ] **Step 1: Write failing provider and runtime tests**

Tests must assert:

```tsx
expect(readWorkbenchRuntimeConfig({}).apiBaseUrl).toBe('');
expect(
  readWorkbenchRuntimeConfig({
    VITE_YUNQI_API_BASE_URL: ' https://api.test/ ',
  }).apiBaseUrl,
).toBe('https://api.test/');

const client = createWorkbenchQueryClient({ onQueryError });
expect(client.getDefaultOptions().queries).toMatchObject({
  staleTime: 300_000,
  retry: false,
  refetchOnWindowFocus: false,
});

render(
  <QueryProvider client={client}>
    <QueryClientProbe />
  </QueryProvider>,
);
expect(screen.getByTestId('query-client')).toHaveTextContent('connected');

render(
  <YunQiClientProvider client={fakeClient}>
    <ClientProbe />
  </YunQiClientProvider>,
);
expect(observedClient).toBe(fakeClient);
```

Also assert `useYunQiClient()` throws
`useYunQiClient must be used within YunQiClientProvider` outside its provider,
and that a rejected `fetchQuery` calls `onQueryError` once.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm --filter @yunqi/workbench test -- src/lib/runtime-config.test.ts src/providers/QueryProvider.test.tsx src/providers/YunQiClientProvider.test.tsx
```

Expected: FAIL because the provider modules do not exist.

- [ ] **Step 3: Implement runtime config and providers**

Implement:

```ts
export interface WorkbenchRuntimeEnv {
  readonly VITE_YUNQI_API_BASE_URL?: string;
}

export function readWorkbenchRuntimeConfig(
  env: WorkbenchRuntimeEnv,
) {
  return {
    apiBaseUrl: env.VITE_YUNQI_API_BASE_URL?.trim() ?? '',
  } as const;
}
```

Create QueryClient with an explicit QueryCache and the frozen defaults.
Keep the production QueryClient at module scope. Permit injection through
`QueryProviderProps.client`.

Create the default YunQi client once from the Vite runtime config:

```ts
const runtimeConfig = readWorkbenchRuntimeConfig(import.meta.env);
const defaultClient = createYunQiClient(
  createFetchTransport({ baseUrl: runtimeConfig.apiBaseUrl }),
);
```

Expose only the provider and `useYunQiClient`.

- [ ] **Step 4: Verify GREEN and refactor duplication**

Run:

```text
pnpm --filter @yunqi/workbench test -- src/lib/runtime-config.test.ts src/providers/QueryProvider.test.tsx src/providers/YunQiClientProvider.test.tsx
pnpm --filter @yunqi/workbench typecheck
```

Expected: all focused tests and typecheck pass.

- [ ] **Step 5: Commit**

```text
git add apps/yunqi-workbench/src/lib apps/yunqi-workbench/src/providers/QueryProvider* apps/yunqi-workbench/src/providers/YunQiClientProvider*
git commit -m "feat(workbench): establish data providers"
```

---

### Task 3: Build ThemeProvider and the non-routing Workbench shell

**Files:**
- Create: `apps/yunqi-workbench/src/providers/ThemeProvider.test.tsx`
- Create: `apps/yunqi-workbench/src/providers/ThemeProvider.tsx`
- Create: `apps/yunqi-workbench/src/app/routes.ts`
- Create: `apps/yunqi-workbench/src/components/layout/Navigation.tsx`
- Create: `apps/yunqi-workbench/src/components/layout/AppShell.test.tsx`
- Create: `apps/yunqi-workbench/src/components/layout/AppShell.tsx`
- Create: `apps/yunqi-workbench/src/styles/global.css`
- Modify: `apps/yunqi-workbench/src/app/App.test.tsx`
- Modify: `apps/yunqi-workbench/src/app/App.tsx`
- Modify: `apps/yunqi-workbench/src/main.tsx`

**Interfaces:**
- Produces: `ThemeProvider`, `useTheme`, `navigationItems`, `Navigation`,
  and `AppShell`.
- Consumes: `YUNQI_API_CONTRACT_ID`.

- [ ] **Step 1: Write failing theme and shell tests**

Assert the initial theme is light and a user click changes the wrapper to
`data-theme="dark"`. Assert the shell exposes:

```text
banner: TCM YunQi Lab
navigation: 工作台导航
active item: 首页
disabled placeholders: 五运六气, 问诊
main heading: Workbench 基础架构
contract text: YQ-API-CONTRACT-1.0.0
```

Assert neither placeholder is a link.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm --filter @yunqi/workbench test -- src/providers/ThemeProvider.test.tsx src/components/layout/AppShell.test.tsx src/app/App.test.tsx
```

Expected: FAIL because ThemeProvider and layout modules do not exist.

- [ ] **Step 3: Implement navigation metadata, provider, shell, and App**

Define navigation metadata:

```ts
export const navigationItems = [
  { id: 'home', label: '首页', status: 'active' },
  { id: 'yunqi', label: '五运六气', status: 'placeholder' },
  { id: 'inquiry', label: '问诊', status: 'placeholder' },
] as const;
```

Implement a light/dark context with an explicit toggle. Implement semantic
`header`, `nav`, and `main` landmarks. Placeholders use `aria-disabled=true`.
App imports `YUNQI_API_CONTRACT_ID` and states that the Workbench consumes
the frozen contract without calculating rules.

Implement `global.css` with CSS variables for paper, ink, cinnabar, ruled
borders, focus rings, responsive layout, dark theme, and
`prefers-reduced-motion`. Import it only from `main.tsx`.

- [ ] **Step 4: Verify GREEN, accessibility queries, and build**

```text
pnpm --filter @yunqi/workbench test -- src/providers/ThemeProvider.test.tsx src/components/layout/AppShell.test.tsx src/app/App.test.tsx
pnpm --filter @yunqi/workbench build
```

Expected: focused tests pass and production CSS is emitted.

- [ ] **Step 5: Commit**

```text
git add apps/yunqi-workbench/src/app apps/yunqi-workbench/src/components/layout apps/yunqi-workbench/src/providers/ThemeProvider* apps/yunqi-workbench/src/styles apps/yunqi-workbench/src/main.tsx
git commit -m "feat(workbench): add application shell and theme"
```

---

### Task 4: Add feedback states and sanitized render-error recovery

**Files:**
- Create: `apps/yunqi-workbench/src/components/feedback/AsyncState.test.tsx`
- Create: `apps/yunqi-workbench/src/components/feedback/AsyncState.tsx`
- Create: `apps/yunqi-workbench/src/providers/ErrorBoundaryProvider.test.tsx`
- Create: `apps/yunqi-workbench/src/providers/ErrorBoundaryProvider.tsx`
- Create: `apps/yunqi-workbench/src/providers/AppProviders.test.tsx`
- Create: `apps/yunqi-workbench/src/providers/AppProviders.tsx`
- Modify: `apps/yunqi-workbench/src/main.tsx`

**Interfaces:**
- Produces: `AsyncState<T>`, `ErrorBoundaryProvider`, and `AppProviders`.
- Consumes: ThemeProvider, QueryProvider, YunQiClientProvider.

- [ ] **Step 1: Write failing four-state and boundary tests**

`AsyncState` tests must separately assert:

```text
loading -> role status and 正在加载
error -> role alert, generic 加载失败, raw secret absent, retry button works
empty -> 暂无数据
success -> supplied renderer receives data
```

The boundary test renders a child that throws
`backend database password leaked`, then asserts the fallback contains
`工作台暂时无法显示` and does not contain the thrown message or a stack.
Clicking `重新加载界面` resets the boundary.

The AppProviders test renders a probe using both provider hooks.

- [ ] **Step 2: Run focused tests and verify RED**

```text
pnpm --filter @yunqi/workbench test -- src/components/feedback/AsyncState.test.tsx src/providers/ErrorBoundaryProvider.test.tsx src/providers/AppProviders.test.tsx
```

Expected: FAIL because feedback and boundary modules do not exist.

- [ ] **Step 3: Implement deterministic state priority and provider tree**

`AsyncState` evaluates in this order: pending, error, missing/empty data,
success. It renders no exception detail.

Implement a class Error Boundary with `getDerivedStateFromError`, a reset
button, and a safe fallback. Compose providers exactly:

```tsx
<ErrorBoundaryProvider>
  <ThemeProvider>
    <QueryProvider client={queryClient}>
      <YunQiClientProvider client={yunqiClient}>
        {children}
      </YunQiClientProvider>
    </QueryProvider>
  </ThemeProvider>
</ErrorBoundaryProvider>
```

Allow optional client injections in `AppProvidersProps`. Update `main.tsx`
to render `<AppProviders><App /></AppProviders>`.

- [ ] **Step 4: Verify GREEN**

```text
pnpm --filter @yunqi/workbench test -- src/components/feedback/AsyncState.test.tsx src/providers/ErrorBoundaryProvider.test.tsx src/providers/AppProviders.test.tsx
pnpm --filter @yunqi/workbench typecheck
```

Expected: focused tests and typecheck pass without raw error content.

- [ ] **Step 5: Commit**

```text
git add apps/yunqi-workbench/src/components/feedback apps/yunqi-workbench/src/providers/ErrorBoundaryProvider* apps/yunqi-workbench/src/providers/AppProviders* apps/yunqi-workbench/src/main.tsx
git commit -m "feat(workbench): add feedback and error boundaries"
```

---

### Task 5: Implement the fixed-Beijing time display and prove the governance boundary

**Files:**
- Create: `apps/yunqi-workbench/src/components/time/YunQiTimeDisplay.test.tsx`
- Create: `apps/yunqi-workbench/src/components/time/YunQiTimeDisplay.tsx`
- Modify: `tests/yunqi-time-governance.test.mjs`

**Interfaces:**
- Consumes: `YunQiTimeDto` from `@yunqi/contracts`.
- Produces: `YunQiTimeDisplay({ value }: { readonly value: YunQiTimeDto })`.

- [ ] **Step 1: Write the failing display test**

Use:

```ts
const value: YunQiTimeDto = {
  localTime: '2026-01-01T12:00:00+08:00',
  epochMilliseconds: 1,
  offset: '+08:00',
  calendarTimeStandard: 'BeijingStandardTime+08:00',
};
```

Assert the rendered time has
`dateTime="2026-01-01T12:00:00+08:00"`, visible text
`2026-01-01 12:00:00`, and `北京时间 UTC+08`. Assert `1` is not used as
visible time content.

- [ ] **Step 2: Run the display test and verify RED**

```text
pnpm --filter @yunqi/workbench test -- src/components/time/YunQiTimeDisplay.test.tsx
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement string-only presentation**

Implement:

```ts
function toHumanLocalTime(localTime: string) {
  return localTime.replace('T', ' ').replace(/\+08:00$/, '');
}
```

Render the canonical localTime in the semantic attribute and the human string
plus fixed label in visible content. Do not read `epochMilliseconds`.

- [ ] **Step 4: Add an apps-directory mutation test to time governance**

Create a fixture React manifest under `apps/yunqi-workbench`, write a source
file containing a forbidden epoch reinterpretation, run the existing checker,
and assert a non-zero result naming the Workbench file. Keep the existing
package-root fixtures.

- [ ] **Step 5: Verify GREEN and repository governance**

```text
pnpm --filter @yunqi/workbench test -- src/components/time/YunQiTimeDisplay.test.tsx
pnpm test:time-governance
```

Expected: display test passes, production Workbench passes the scanner, and
the mutation fixture is rejected.

- [ ] **Step 6: Commit**

```text
git add apps/yunqi-workbench/src/components/time tests/yunqi-time-governance.test.mjs
git commit -m "feat(workbench): add fixed Beijing time display"
```

---

### Task 6: Add the YunQi Query layer and contract type tests

**Files:**
- Create: `apps/yunqi-workbench/src/features/yunqi/api/query-options.ts`
- Create: `apps/yunqi-workbench/src/features/yunqi/hooks/useCurrentYunQiQuery.ts`
- Create: `apps/yunqi-workbench/src/features/yunqi/hooks/useYunQiYearQuery.ts`
- Create: `apps/yunqi-workbench/src/features/yunqi/hooks/yunqi-queries.test.tsx`
- Create: `apps/yunqi-workbench/src/test/test-utils.tsx`
- Create: `apps/yunqi-workbench/src/test/contract.typecheck.ts`

**Interfaces:**
- Produces: `currentYunQiQueryOptions(client)`,
  `yunQiYearQueryOptions(year, client)`, `useCurrentYunQiQuery()`,
  `useYunQiYearQuery(year)`.
- Consumes: `yunqiQueryOptions`, `YunQiClient`, public contract DTOs,
  `useYunQiClient`, TanStack `queryOptions` and `useQuery`.

- [ ] **Step 1: Write failing hook tests**

Build a `createTestWrapper(client)` helper that creates a fresh Workbench
QueryClient and wraps QueryProvider plus YunQiClientProvider.

Use structural clients whose methods are Vitest functions. Assert:

```tsx
const { result } = renderHook(() => useCurrentYunQiQuery(), { wrapper });
await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(client.getCurrent).toHaveBeenCalledOnce();
expect(result.current.data).toBe(currentResult);
```

Repeat for `useYunQiYearQuery(2026)` and assert `getYear(2026)`.

- [ ] **Step 2: Run hook tests and verify RED**

```text
pnpm --filter @yunqi/workbench test -- src/features/yunqi/hooks/yunqi-queries.test.tsx
```

Expected: FAIL because query option and hook modules do not exist.

- [ ] **Step 3: Implement injected query options and hooks**

Use:

```ts
export function currentYunQiQueryOptions(client: YunQiClient) {
  return queryOptions(yunqiQueryOptions.current(client));
}

export function yunQiYearQueryOptions(
  year: number,
  client: YunQiClient,
) {
  return queryOptions(yunqiQueryOptions.year(year, client));
}
```

Hooks read the context client and pass these options to `useQuery`.

- [ ] **Step 4: Add compile-time contract assertions**

`contract.typecheck.ts` imports `YunQiTimeDto`,
`YunQiCalculationDto`, and `YUNQI_API_CONTRACT_ID` from
`@yunqi/contracts`, plus `YunQiClient` from `@yunqi/client`.
It assigns valid values and includes `@ts-expect-error` assertions proving
`timezone` and `calendarTime` do not exist.

- [ ] **Step 5: Verify GREEN**

```text
pnpm --filter @yunqi/workbench test -- src/features/yunqi/hooks/yunqi-queries.test.tsx
pnpm --filter @yunqi/workbench test:typecheck
```

Expected: hooks resolve through the injected client and contract assertions
compile exactly.

- [ ] **Step 6: Commit**

```text
git add apps/yunqi-workbench/src/features apps/yunqi-workbench/src/test
git commit -m "feat(workbench): establish YunQi query layer"
```

---

### Task 7: Enforce Workbench dependency purity and document the foundation

**Files:**
- Create: `scripts/check-yunqi-workbench-governance.mjs`
- Modify: `tests/yunqi-workbench-governance.test.mjs`
- Modify: `package.json`
- Modify: `AGENTS.md`
- Modify: `README.md`
- Create: `apps/yunqi-workbench/README.md`

**Interfaces:**
- Produces: `findWorkbenchGovernanceViolations(root)` and root
  `test:workbench-governance`.
- Consumes: Workbench manifest and all source files.

- [ ] **Step 1: Write failing mutation tests for the governance checker**

Create temporary fixture repositories and assert the checker rejects each
independently:

```text
manifest dependency @yunqi/service
manifest dependency @yunqi/domain
manifest dependency axios
manifest dependency react-router-dom
source import from @yunqi/service
source import from @yunqi/domain
component fetch(...)
component string /api/v1/yunqi/current
component yunqiClient.getCurrent()
interface YunQiTimeDto {}
```

Also assert the production repository returns no violations.

- [ ] **Step 2: Run the governance test and verify RED**

```text
node --test tests/yunqi-workbench-governance.test.mjs
```

Expected: FAIL because the checker export does not exist.

- [ ] **Step 3: Implement the manifest and source scanner**

Recursively scan `apps/yunqi-workbench/src`, excluding `dist`, `coverage`,
and `node_modules`. Return path-qualified violations. Permit only these
runtime dependencies:

```text
@tanstack/react-query
@yunqi/client
@yunqi/contracts
react
react-dom
```

Reject forbidden imports anywhere. Apply direct transport, API path, client
method, and frozen DTO declaration rules to component source.

Expose a CLI that exits non-zero and prints every violation.

- [ ] **Step 4: Wire the root gate and update authoritative docs**

Add:

```json
"test:workbench-governance": "node --test tests/yunqi-workbench-governance.test.mjs && node scripts/check-yunqi-workbench-governance.mjs"
```

Invoke it from root `test`.

Add AGENTS rules for the Workbench dependency chain, provider ownership,
component transport prohibition, no router/business pages in Phase3-B, and
fixed-Beijing display. Document local `dev`, `build`, `test`, and runtime
base URL usage in the root and Workbench READMEs.

- [ ] **Step 5: Verify GREEN and CI command inclusion**

```text
pnpm test:workbench-governance
pnpm test:time-governance
pnpm contracts:check
```

Expected: governance passes production, mutation fixtures fail internally,
and the frozen contract remains unchanged.

- [ ] **Step 6: Commit**

```text
git add scripts/check-yunqi-workbench-governance.mjs tests/yunqi-workbench-governance.test.mjs package.json AGENTS.md README.md apps/yunqi-workbench/README.md
git commit -m "test(workbench): enforce frontend governance"
```

---

### Task 8: Complete visual, build, and repository verification

**Files:**
- Create: `docs/superpowers/verification/2026-07-20-phase3-b-react-workbench-foundation.md`
- Modify only if a failing verification identifies a defect in a file owned
  by Tasks 1-7.

**Interfaces:**
- Produces: auditable Phase3-B verification record and merge-ready branch.
- Consumes: every command and invariant in the design specification.

- [ ] **Step 1: Run focused Workbench acceptance**

```text
pnpm --filter @yunqi/workbench test
pnpm --filter @yunqi/workbench test:typecheck
pnpm --filter @yunqi/workbench typecheck
pnpm --filter @yunqi/workbench test:coverage
pnpm --filter @yunqi/workbench build
```

Expected: all tests pass, thresholds pass, and `dist/index.html` exists.

- [ ] **Step 2: Inspect the running application**

Start:

```text
pnpm --filter @yunqi/workbench dev --host 127.0.0.1
```

Inspect the page at the reported local URL in a browser at desktop and mobile
widths. Verify:

- shell landmarks and copy render;
- theme toggle changes the declared theme;
- placeholders remain non-interactive;
- no horizontal overflow;
- no runtime console errors;
- no API request occurs on the foundation Home screen.

- [ ] **Step 3: Run complete repository acceptance**

```text
pnpm install --frozen-lockfile
pnpm contracts:check
pnpm test:time-governance
pnpm test:time-purity
pnpm test:workbench-governance
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm openapi:validate
git diff --check
```

Expected: all commands pass and OpenAPI reports only its three existing
non-blocking warnings.

- [ ] **Step 4: Audit immutable boundaries**

Run:

```text
git diff --exit-code main...HEAD -- packages/yunqi-domain packages/calendar-adapters/tyme4ts packages/yunqi-service packages/yunqi-contracts packages/yunqi-client
git diff --exit-code main...HEAD -- packages/yunqi-service/openapi/yunqi-service.openapi.yaml
```

Expected: no diff in Domain, adapter, service, contracts, client, or OpenAPI.
Confirm no React Router, Next.js, database schema, inquiry workflow, or
business page was added.

- [ ] **Step 5: Write the verification record**

Record:

- branch and base/head commits;
- exact dependency versions;
- Workbench tests and coverage;
- root acceptance command results;
- browser viewport and console inspection;
- three unchanged OpenAPI warnings;
- zero-diff immutable packages;
- requirement-by-requirement Definition of Done evidence.

- [ ] **Step 6: Commit**

```text
git add docs/superpowers/verification/2026-07-20-phase3-b-react-workbench-foundation.md
git commit -m "docs(workbench): record Phase3-B verification"
```

- [ ] **Step 7: Request final whole-branch review**

Generate a review package from merge base `54dcf99` through HEAD. Request
spec compliance and code-quality verdicts. Resolve every Critical or Important
finding with a covering test and re-review before finishing the branch.
