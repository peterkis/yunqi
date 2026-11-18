# TCM YunQi Lab

项目协作入口：[AGENTS.md](AGENTS.md) · [分类指引](docs/agents/README.md) · [会话复盘索引](docs/retrospectives/README.md)。

## 项目简介

面向院内医生的五运六气计算、理论学习、出生时令对照和体质量表原型。
项目保留问诊结构化与专家审核的后续规划；当前能力和授权边界见下文。

本项目不是自动诊断、自动开方或医疗决策系统。

## 当前版本

当前为 2026-11-16 医生反馈迭代，实施范围、选型和验收计划见
[五项反馈实施计划](docs/plans/2026-11-16-clinician-feedback.md)。
后续病候对读与同页测评见[第二轮计划](docs/plans/2026-11-16-clinician-feedback-continuation.md)。
第二轮实现、来源核对与测试结果见[第二轮工程验收报告](docs/superpowers/verification/2026-11-16-clinician-feedback-continuation.md)。
首轮实现结果、原件核对、失败修复和验收证据见
[首轮工程验收报告](docs/superpowers/verification/2026-11-16-clinician-feedback.md)。

| 组件或契约 | 当前版本 |
| --- | --- |
| `@yunqi/domain` | `1.4.0` |
| `@yunqi/service` | `2.3.0` |
| `@yunqi/contracts` / `@yunqi/client` | `1.3.0` |
| 业务 API Contract | `YQ-API-CONTRACT-1.3.0` |
| OpenAPI 文档版本 / 规范版本 | `1.5.0` / `3.1.0` |

第一阶段规则是已版本化的实现基线，待正式专家冻结与验证，状态以
`rules/RULE_FREEZE_NOTE.md` 为准。API Contract 冻结不代表专家验证通过。
问诊关联边界与医疗安全边界继续遵守 AGENTS.md。

当前规则为 [YQ-MVP-RULES-1.1.0](rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md)。
2026-10-18 按用户确认采用 Word R-08/R-21：支持1900–2100运气年，
客生主传统描述为“客生主，相得”。新增教学规则为
[YQ-LEARNING-RULES-1.1.0](rules/LEARNING_RULES_V1_1.md)，量表规则为
[YQ-CONSTITUTION-1.0.0](rules/CONSTITUTION-GBT46939-2025.md)。
经典内容更新为[YQ-CLASSICAL-READING-1.1.0](rules/CLASSICAL_READING_V1_1.md)，
补充连续气候与病候选段，不改变运气计算、量表计分或API结构。
[当前契约与迁移说明](docs/contracts/YQ-API-CONTRACT-1.3.0.md)记录新增接口及消费方影响；
[1.0.0](docs/contracts/YQ-API-CONTRACT-1.0.0.md)、
[1.1.0](docs/contracts/YQ-API-CONTRACT-1.1.0.md)说明、原始确认单与历史冻结文件保留。

## UI 设计

Workbench 已按[运气通设计规范与原型](docs/design/README.md)实现400px门诊侧栏：
三段导航“当下运气 / 先天对照 / 体质量表”、原文与分析下钻、浅深主题及400×64收起胶囊。
标题栏和页脚固定，内容区滚动；1366×900工作站视口下面板位于右侧。这是浏览器布局，宿主停靠部署尚未实现。
字号统一使用全应用五档，旧demo样式与组件已清理；历史demo截图只保留为历史证据。

## 当前工作台能力

- 当前页聚焦年度中运、司天、在泉，以及当下所属的运与气；其余阶段按需展开。
- 年度司天与中运、当步主客气分别显示生克方向和传统关系提示，经典摘录、阅读释义及出处分别展示。
- `/yunqi/birth` 将出生时令与当前运气并列对照，双方均提供年度与阶段原文。时刻不详时保留当日交界候选，不将取样点当作出生时刻；不从生日推断疾病或替代体质测评。
- 出生对照内可主动打开一份体质量表，与本次当前快照同时查看。结束测评、修改出生资料、清空或重新对照会销毁本次答卷及结果；不会额外刷新成另一份当前快照。
- `/yunqi/constitution` 提供 `GB/T 46939-2025` 体质量表，每个性别实际作答26题，一题一屏，支持数字键1–5与上一题；完整作答并提交后显示九质评分、倾向及兼夹结果，并列查看当前运气。
- `/yunqi/year` 与 `/yunqi/calculate` 保留年度及指定时点分析；`/yunqi/inquiry` 仍为问诊规划入口。

五步运采用已标识的节气偏移教学口径，待专家确认。出生信息与量表答卷仅用于本次页面会话，
不建立患者身份关联或答卷存储。量表依据公开正式标准实现，随后已与用户本地同版 PDF 的
第5章及附录A核对；初始设备离线及后续核对证据见[量表说明](rules/CONSTITUTION-GBT46939-2025.md)。

## Workspace packages

- `@yunqi/domain`: deterministic YunQi rules, sourced learning explanations,
  authoritative calendar-time calculation and constitution scoring;
- `@yunqi/calendar-adapter-tyme4ts`: solar-term adapter;
- `@yunqi/service`: Fastify runtime and OpenAPI schema source;
- `@yunqi/contracts`: generated, browser-safe public DTO facade;
- `@yunqi/client`: Fetch/Axios-structural typed browser client.
- `@yunqi/workbench`: Vite/React current, annual and specified-time analysis,
  birth/current comparison, constitution assessment and an inquiry-planning entry.

The current business API is defined by `YQ-API-CONTRACT-1.3.0`; machine freeze
registration and drift checks are owned by `@yunqi/contracts`. React consumers
must import DTOs from `@yunqi/contracts` and client behavior from
`@yunqi/client`; they must not duplicate API DTOs.

The Workbench dependency path is
`@yunqi/workbench -> @yunqi/client -> @yunqi/contracts`. Provider
infrastructure owns QueryClient, YunQiClient, and transport creation.
Business results pass through pure DTO-to-ViewModel mappers before
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

## Business API overview

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/yunqi/year/{year}` | Annual facts for YunQi years 1900–2100 |
| GET | `/api/v1/yunqi/current` | Current core facts |
| POST | `/api/v1/yunqi/calculate` | Core facts for an explicitly submitted time |
| GET | `/api/v1/yunqi/learning/current` | Current facts, movements, relations and classical passages |
| POST | `/api/v1/yunqi/learning/calculate` | Learning result for a submitted time |
| POST | `/api/v1/yunqi/learning/birth-comparison` | Birth-period candidates and a current snapshot |
| GET | `/api/v1/constitution/questionnaire` | Versioned questionnaire and scoring-item definitions |
| POST | `/api/v1/constitution/assess` | Complete-answer assessment with all nine results |

See the [Service README](packages/yunqi-service/README.md) for request formats,
time boundaries and local startup. The five learning/constitution endpoints
return `Cache-Control: no-store`.

## Workbench development

Use Node.js 22 or newer and pnpm 10.32.1. From the repository root:

```text
pnpm install --frozen-lockfile
pnpm build
```

After the build, start the Service and Workbench in separate terminals:

```text
pnpm --filter @yunqi/service start
pnpm --filter @yunqi/workbench dev
```

Workbench-only commands are `pnpm --filter @yunqi/workbench build`,
`pnpm --filter @yunqi/workbench test` and `pnpm test:workbench-governance`.

Leave `VITE_YUNQI_API_BASE_URL` unset (or empty). The Vite development server
proxies `/api/v1/yunqi/` and `/api/v1/constitution/` to `http://127.0.0.1:3000`, preserving the request
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
布局和自动可访问性规则。测试范围包括当前状态、年度分析、指定时点分析、出生对照、体质测评、
问诊规划入口和错误恢复，并接入 `quality-gates`。具体执行状态以当次报告为准。
视觉矩阵为400×860浅/深、400×640、400×64胶囊和1366×900；覆盖七画板与下钻状态，
逐状态检查字号、控件尺寸、焦点环、主按钮数量和横向溢出。
每次运行在 `.artifacts/browser/` 下保留独立报告、
截图和失败 trace，不覆盖之前的失败证据。

详见 [浏览器验收说明](tests/browser/README.md)。这些是合成输入的工程验收，
不替代专家规则验证或临床验收。
