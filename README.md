# TCM YunQi Lab

项目协作入口：[AGENTS.md](AGENTS.md) · [分类指引](docs/agents/README.md) · [会话复盘索引](docs/retrospectives/README.md)。

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

当前规则为 [YQ-MVP-RULES-1.1.0](rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md)。
2026-10-18 按用户确认采用 Word R-08/R-21：支持1900–2100运气年，
客生主传统描述为“客生主，相得”。[契约迁移说明](docs/contracts/YQ-API-CONTRACT-1.1.0.md)
记录版本、兼容性和时间边界；原始确认单与旧冻结文件保留。

## Workspace packages

- `@yunqi/domain`: deterministic YunQi rules and authoritative calendar-time
  calculation;
- `@yunqi/calendar-adapter-tyme4ts`: solar-term adapter;
- `@yunqi/service`: Fastify runtime and OpenAPI schema source;
- `@yunqi/contracts`: generated, browser-safe public DTO facade;
- `@yunqi/client`: Fetch/Axios-structural typed browser client.
- `@yunqi/workbench`: Phase3-E1 Vite/React read-only current, annual and
  specified-time analysis, with an inquiry-planning entry.

The Phase3 business API is frozen as `YQ-API-CONTRACT-1.1.0`. React consumers
must import DTOs from `@yunqi/contracts` and client behavior from
`@yunqi/client`; they must not duplicate API DTOs.

The Workbench dependency path is
`@yunqi/workbench -> @yunqi/client -> @yunqi/contracts`. Provider
infrastructure owns QueryClient, YunQiClient, and transport creation.
The `/current` result passes through a pure DTO-to-ViewModel mapper before
rendering. Components do not import DTOs, perform transport, construct API
paths, or call client methods. React Router owns navigation; feature hooks own
queries and explicit specified-time submissions. Business time is rendered from canonical `localTime` and
labelled `北京时间 UTC+08`; `epochMilliseconds` is not copied into the
presentation model or used for display.

The Workbench runtime allowlist applies to dependencies, optional
dependencies, and peer dependencies. Service, Domain, calendar adapter,
and Axios imports are forbidden throughout Workbench source,
including imports backed only by development dependencies. Presentation
responsibility is path-based under `src/components/**`, `src/app/**`, and
`src/features/**/components/**`.
The only approved router is `react-router-dom`, exactly `7.18.1`.

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

规则文档与实现的一致性可单独验证：

```text
pnpm test:rule-consistency
```

该检查读取版本化规则表，核对六十甲子、五运六气、36 对客主关系，以及全部
1900–2100 运气年的交节前后毫秒边界。它也随 `pnpm test` 运行。
通过表示与当前实现基线一致，不代表原始共识文件已经完成专家冻结。

## 自动化流程与页面验收

首次安装浏览器后，可用一条命令构建应用、启动隔离的本地服务并完成走查：

```text
pnpm exec playwright install chromium
pnpm test:browser
```

`pnpm test:browser:flows` 只检查流程；`pnpm test:browser:visual` 检查页面截图、
布局和自动可访问性规则。测试覆盖当前状态、年度分析、指定时点分析、问诊规划入口
和错误恢复，并接入 `quality-gates`。每次运行在 `.artifacts/browser/` 下保留独立报告、
截图和失败 trace，不覆盖之前的失败证据。

详见 [浏览器验收说明](tests/browser/README.md)。这些是合成输入的工程验收，
不替代专家规则验证或临床验收。
