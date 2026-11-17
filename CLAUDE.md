# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

AGENTS.md (imported above) is the canonical project guidance and is size-limited and checked by `pnpm test:project-guidance`; put durable rule changes there or in `docs/agents/*`, not here. Its task table says which `docs/agents/*.md` file to read before editing each area — follow it.

## Commands

Node >= 22, pnpm 10.32.1 (`pnpm install --frozen-lockfile`). Run from the repo root.

```bash
pnpm build                 # domain → calendar-adapter → service → contracts → client → workbench (order matters)
pnpm test                  # builds, then all package tests + governance/time/contract/openapi/guidance checks
pnpm typecheck
pnpm test:coverage
pnpm test:browser          # builds, then Playwright (first: pnpm exec playwright install chromium)
```

Local dev (after `pnpm build`, separate terminals): `pnpm --filter @yunqi/service start` (port 3000) and `pnpm --filter @yunqi/workbench dev`. Vite proxies `/api/v1/yunqi/` and `/api/v1/constitution/` to the service; leave `VITE_YUNQI_API_BASE_URL` unset; use `YUNQI_DEV_API_TARGET` in `apps/yunqi-workbench/.env.local` for another port.

Single package / single test (packages use Vitest; contracts tests are `tsc` only). Downstream packages consume upstream `dist/`, so rebuild upstream packages (`pnpm build:contract-source` covers domain/adapter/service) before testing a consumer:

```bash
pnpm --filter @yunqi/domain test
pnpm --filter @yunqi/domain exec vitest run tests/liuqi-rules.test.ts
pnpm --filter @yunqi/service exec vitest run -t "test name"
pnpm exec playwright test --project=flows-chromium   # only if build output is already current
```

Targeted gates by change type (CI job `quality-gates` runs guidance, time-governance, contracts:check, test, typecheck, coverage, schema:validate, browser):

| Change | Command |
| --- | --- |
| Guidance / retrospectives docs | `pnpm test:project-guidance` |
| Rules, Domain, calendar adapter | `pnpm test:rule-consistency` |
| Business time / display | `pnpm test:time-governance` (full: `pnpm test:time-purity`, `pnpm test:timezone`) |
| Workbench deps & boundaries | `pnpm test:workbench-governance` |
| Service/OpenAPI/DTO | `pnpm contracts:check`, `pnpm test:contract-governance`, `pnpm schema:validate` |

`pnpm contracts:generate` / `pnpm contracts:freeze` and `pnpm --filter @yunqi/service openapi:generate` regenerate frozen artifacts — use only for an authorized contract change, never to silence drift.

## Architecture

Data flows one way: versioned rule docs (`rules/*.md`) → pure Domain → Service (HTTP + OpenAPI) → generated Contracts → Client → Workbench.

- `packages/yunqi-domain` — pure TS, no Date/framework/browser deps. Core rule constants live in `src/rules/phase1-rules.ts` and must match `rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md` (enforced by `tests/yunqi-rule-consistency.test.mjs`). Subdomains: `ganzhi`, `wuyun`, `liuqi`, `relation`, `calendar` (`YunQiCalendarTime` authority), `learning`/`explanation` (classical reading), `constitution` (GB/T 46939-2025 scoring). Entry point for time-based results is `calculateYunQiByCalendarTime()`.
- `packages/calendar-adapters/tyme4ts` — supplies solar-term instants only; it does not decide year/step membership.
- `packages/yunqi-service` — Fastify; TypeBox schemas in `src/schemas` are the single source of the OpenAPI file (`openapi/yunqi-service.openapi.yaml`). All business-time parsing goes through `src/modules/time-normalizer`. Request hardening lives in `src/plugins/ingress.ts`.
- `packages/yunqi-contracts` — browser-safe DTOs generated from the OpenAPI; `contract/` holds append-only `registry.json` and per-version `*.freeze.json` baselines. Any projection change needs a new contract ID (see `docs/agents/api-contracts.md`).
- `packages/yunqi-client` — typed fetch client + query options; depends only on Contracts and owns API paths.
- `apps/yunqi-workbench` — Vite/React, react-router-dom 7.18.1, TanStack Query. Dependency path is strictly `workbench → client → contracts`. Providers own QueryClient/transport; feature hooks own queries; pure DTO→ViewModel mappers sit between data and presentation; components under `src/components/**`, `src/app/**`, `src/features/**/components/**` must not runtime-import the client or DTO transport. Time is displayed from API `localTime`, labelled `北京时间 UTC+08`. These rules are enforced by `scripts/check-yunqi-workbench-governance.mjs`.

UI design (since the 2026-11-17 refactor) is defined only by `docs/design/README.md`: design-system spec and tokens in `docs/design/design-system/`, the offline prototype in `docs/design/prototypes/`. Pre-refactor Workbench layouts/styles are demos — don't reuse them. Design elements beyond current authorization (HIS patient data, writing to the medical record, host docking) are listed there and need explicit user approval first.

Root `scripts/` hold the governance checkers (time, contract dependencies, workbench boundaries, project guidance) and contract generation/freeze; their tests are in root `tests/*.test.mjs`. Browser acceptance writes per-run reports to `.artifacts/browser/` (see `tests/browser/README.md`).
