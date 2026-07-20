# TCM YunQi Lab

## 项目简介

中医五运六气与问诊结构化原型系统。

项目目标： - 五运六气规则推算； - 中医问诊结构化； - 教学复盘； -
专家规则审核。

本项目不是自动诊断、自动开方或医疗决策系统。

## 当前版本

V1.0 MVP

已冻结： - 第一阶段五运六气基础规则； - 问诊关联边界； - 医疗安全边界。

## Workspace packages

- `@yunqi/domain`: deterministic YunQi rules and authoritative calendar-time
  calculation;
- `@yunqi/calendar-adapter-tyme4ts`: solar-term adapter;
- `@yunqi/service`: Fastify runtime and OpenAPI schema source;
- `@yunqi/contracts`: generated, browser-safe public DTO facade;
- `@yunqi/client`: Fetch/Axios-structural typed browser client.
- `@yunqi/workbench`: Phase3-B Vite/React presentation foundation.

The Phase3 business API is frozen as `YQ-API-CONTRACT-1.0.0`. React consumers
must import DTOs from `@yunqi/contracts` and client behavior from
`@yunqi/client`; they must not duplicate API DTOs.

The Workbench dependency path is
`@yunqi/workbench -> @yunqi/client -> @yunqi/contracts`. Provider
infrastructure owns QueryClient, YunQiClient, and transport creation.
Components do not perform transport, construct API paths, or call client
methods. Phase3-B contains no router or business pages. Business time is
rendered from canonical `localTime` and labelled `北京时间 UTC+08`; it is not
reconstructed from `epochMilliseconds`.

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
`@yunqi/client` or acquire its methods through optional access, references,
brackets, or destructuring.

## Workbench development

From the repository root:

```text
pnpm --filter @yunqi/workbench dev
pnpm --filter @yunqi/workbench build
pnpm --filter @yunqi/workbench test
pnpm test:workbench-governance
```

The Workbench uses same-origin API requests when
`VITE_YUNQI_API_BASE_URL` is absent. To use a separately hosted API, create
`apps/yunqi-workbench/.env.local`:

```dotenv
VITE_YUNQI_API_BASE_URL=http://127.0.0.1:3000
```

Set only the service origin/base URL; `@yunqi/client` owns the frozen
`/api/v1/yunqi/**` paths. Restart the Vite dev server after changing the
environment file.

Key gates:

    pnpm contracts:check
    pnpm test:workbench-governance
    pnpm test:time-governance
    pnpm test
    pnpm typecheck
    pnpm test:coverage
