# TCM YunQi Lab

## 项目简介

中医五运六气与问诊结构化原型系统。

项目目标： - 五运六气规则推算； - 中医问诊结构化； - 教学复盘； -
专家规则审核。

本项目不是自动诊断、自动开方或医疗决策系统。

## 当前版本

V1.0 MVP

第一阶段规则是已版本化的实现基线，待正式专家冻结与验证，状态以
`rules/RULE_FREEZE_NOTE.md` 为准。API Contract 冻结不代表专家验证通过。
问诊关联边界与医疗安全边界继续遵守 AGENTS.md。

## Workspace packages

- `@yunqi/domain`: deterministic YunQi rules and authoritative calendar-time
  calculation;
- `@yunqi/calendar-adapter-tyme4ts`: solar-term adapter;
- `@yunqi/service`: Fastify runtime and OpenAPI schema source;
- `@yunqi/contracts`: generated, browser-safe public DTO facade;
- `@yunqi/client`: Fetch/Axios-structural typed browser client.
- `@yunqi/workbench`: Phase3-C1 Vite/React read-only current YunQi view.

The Phase3 business API is frozen as `YQ-API-CONTRACT-1.0.0`. React consumers
must import DTOs from `@yunqi/contracts` and client behavior from
`@yunqi/client`; they must not duplicate API DTOs.

The Workbench dependency path is
`@yunqi/workbench -> @yunqi/client -> @yunqi/contracts`. Provider
infrastructure owns QueryClient, YunQiClient, and transport creation.
The `/current` result passes through a pure DTO-to-ViewModel mapper before
rendering. Components do not import DTOs, perform transport, construct API
paths, or call client methods. Phase3-C1 contains no router, input form, or
runtime fixture. Business time is rendered from canonical `localTime` and
labelled `北京时间 UTC+08`; `epochMilliseconds` is not copied into the
presentation model or used for display.

The Workbench runtime allowlist applies to dependencies, optional
dependencies, and peer dependencies. Service, Domain, calendar adapter,
Axios, and React Router imports are forbidden throughout Workbench source,
including imports backed only by development dependencies. Presentation
responsibility is path-based under `src/components/**`, `src/app/**`, and
`src/features/**/components/**`.

Relative imports must resolve inside `apps/yunqi-workbench`; absolute local
imports and relative escapes into repository implementation packages are
rejected. Public `@yunqi/contracts` and `@yunqi/client` package imports remain
the supported boundary. Presentation components cannot runtime-import
or runtime re-export `@yunqi/client`, or acquire its methods through optional
access, references, brackets, or destructuring. Pure type-only imports and
re-exports remain allowed; mixed type/runtime re-exports are rejected.
Feature presentation mappers may derive types from `@yunqi/contracts`, but
cannot depend on React, TanStack Query, transport, or `@yunqi/client`.

## Workbench development

From the repository root:

```text
pnpm --filter @yunqi/workbench dev
pnpm --filter @yunqi/workbench build
pnpm --filter @yunqi/workbench test
pnpm test:workbench-governance
```

For local development, run `pnpm build` first, then start the Service and
Workbench in separate terminals:

```text
pnpm --filter @yunqi/service start
pnpm --filter @yunqi/workbench dev
```

Leave `VITE_YUNQI_API_BASE_URL` unset (or empty). The Vite development server
proxies `/api/v1/yunqi/` to `http://127.0.0.1:3000`, preserving the request
path, method and body. The browser uses the Workbench origin for API requests.
If the Service uses another port, set this server-only value in
`apps/yunqi-workbench/.env.local` and restart Vite:

```dotenv
YUNQI_DEV_API_TARGET=http://127.0.0.1:3001
```

Remove any previous local `VITE_YUNQI_API_BASE_URL=http://127.0.0.1:3000`
override so requests use this proxy. `pnpm test:dev-proxy` checks real GET,
POST and error responses through Vite and Service on temporary loopback ports.

For a production build, configure a same-origin reverse proxy for the API.
`YUNQI_DEV_API_TARGET` is a development-server setting, not a deployment proxy.
Use `VITE_YUNQI_API_BASE_URL` for a separate API origin only when that origin
provides the necessary CORS responses and POST preflight support. Service does
not enable CORS by default. `@yunqi/client` owns the frozen API paths.

Key gates:

    pnpm contracts:check
    pnpm test:workbench-governance
    pnpm test:time-governance
    pnpm test
    pnpm typecheck
    pnpm test:coverage
