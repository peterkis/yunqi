# Phase3-E1 Verification — Specified-Time YunQi Analysis

- Date: 2026-09-18
- Branch: codex/phase3e-e1-time-analysis
- Worktree: D:\Projects\YunQi-phase3e-e1
- Base SHA: 5c856f58da929b39905fd482faba4a947fe31991
- E1 implementation commit: 364ec785251754ff093a89ea6736ee077687938b
- Frozen Contract: YQ-API-CONTRACT-1.0.0

## Scope

E1 adds a Workbench-only /yunqi/calculate route and consumes the existing
calculate Client/Contract without changing Domain, calendar adapter, Service,
OpenAPI, Contracts, Client, manifests, or lockfile.

The page accepts a Beijing standard local wall-clock string, submits one
normalized request, maps the API DTO to a neutral selected-time ViewModel, and
renders the canonical result, six-stage overview, selected-stage detail,
explanations, and traceability. It does not add patient, inquiry, observation,
storage, diagnosis, treatment, prescription, medication, risk, recommendation,
AI, or medical workflow behavior.

## Changed files

~~~
AGENTS.md
apps/yunqi-workbench/README.md
apps/yunqi-workbench/src/app/AppRoutes.test.tsx
apps/yunqi-workbench/src/app/AppRoutes.tsx
apps/yunqi-workbench/src/app/routes.ts
apps/yunqi-workbench/src/features/yunqi/components/TraceabilityPanel.tsx
apps/yunqi-workbench/src/features/yunqi/hooks/useCalculateYunQiMutation.test.tsx
apps/yunqi-workbench/src/features/yunqi/hooks/useCalculateYunQiMutation.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-time-analysis-yunqi.test.ts
apps/yunqi-workbench/src/features/yunqi/presentation/map-time-analysis-yunqi.ts
apps/yunqi-workbench/src/features/yunqi/presentation/view-model.ts
apps/yunqi-workbench/src/styles/global.css
apps/yunqi-workbench/src/features/yunqi/time-analysis/
scripts/check-yunqi-workbench-governance.mjs
tests/yunqi-workbench-governance.test.mjs
docs/superpowers/verification/2026-09-18-phase3-e1-time-analysis.md
~~~

## Exact request and mapper evidence

For form input:

~~~
2026-05-20T13:30
~~~

the required Client request is:

~~~
{ "dateTime": "2026-05-20T13:30:00+08:00" }
~~~

Focused tests verify minute/second normalization, invalid/offset/Z rejection,
zero request before submit, exact request ownership, canonical API input time,
exact API selected index, six-stage tuple preservation, missing-stage failure,
success rendering, dirty hiding, pending duplicate protection, error hiding,
and retry recovery.

## Test and gate results

- pnpm install --frozen-lockfile: PASS.
- pnpm test: PASS on the final run.
- Workbench: 30 test files, 107 tests passed.
- Workbench governance: 245 tests passed; production checker passed.
- Time governance: 8 tests passed.
- Contract governance: 12 tests passed.
- Domain: 132 tests passed.
- Calendar adapter: 37 tests passed.
- Client: 8 tests passed.
- Service: 136 tests passed.
- pnpm typecheck: PASS.
- pnpm test:coverage: PASS.
  - Domain statements 96.15%, branches 90.98%.
  - Service statements 97.43%, branches 88.70%.
  - Workbench statements 98.82%, branches 92.95%.
- pnpm contracts:check: PASS.
- pnpm schema:validate: PASS.
- pnpm openapi:validate: PASS.
- pnpm install --frozen-lockfile: PASS.
- git diff --check: PASS; only normal Git LF/CRLF warnings were emitted.

OpenAPI lint reports the existing three non-fatal warnings for the localhost
server example, the health operation without a 4xx response, and the unused
YearParams component. They are unchanged and do not fail the final aggregate
run.

## Frozen-scope audit

The following remained zero diff relative to Base SHA:

~~~
packages/**
package.json
pnpm-lock.yaml
packages/yunqi-service/openapi/**
~~~

The only production changes are under the authorized Workbench scope. No
temporary browser-validation proxy is present in the final worktree.

## Browser verification

The browser-client safety bridge was unavailable, so the local CUA browser
fallback was used. A temporary same-origin localhost proxy was used only for
the test harness and removed before final checks.

Verified in the local preview harness at /yunqi/calculate:

- initial page has an empty form and no result;
- input 2026-05-20T13:30 submits one POST /api/v1/yunqi/calculate;
- Service returned HTTP 200;
- canonical result displayed 2026-05-20 13:30:00 and 北京时间 UTC+08;
- selected stage displayed 二之气 for that input;
- changing input to 2026-05-21T13:30 removed the previous result and displayed
  输入已修改，请重新分析;
- the second submit displayed the new canonical result and 三之气 without
  showing the first result;
- keyboard Return submitted the form successfully;
- desktop screenshot showed the route, form, selected stage, and no visible
  horizontal overflow at the available desktop viewport.

Not fully verifiable in this environment:

- exact 737×900 and 390×844 viewport runs: UNVERIFIED because the browser
  safety bridge rejected the viewport-capable browser client and the CUA
  fallback exposes no viewport override;
- browser Console zero-error check: UNVERIFIED for the same bridge reason.

The responsive CSS rules and Workbench test/build gates passed, but those facts
are not substituted for the missing exact-viewport or Console evidence.

## Review

- Local scope/spec review: no Critical or Important finding.
- Open-code-review CLI: NOT_RUN because no LLM endpoint was configured; no
  external review result is claimed.
- No Domain/Contract/Service rule change was needed.

## Clinical evidence

~~~
expert reference set: NOT_PRESENT
clinical Demo session: NOT_PRESENT
E3: BLOCKED_BY_CLINICAL_INPUT
E4: BLOCKED_BY_CLINICAL_FEEDBACK
~~~

No expert expected values, patient data, signatures, clinical consensus, or
feedback has been fabricated.
