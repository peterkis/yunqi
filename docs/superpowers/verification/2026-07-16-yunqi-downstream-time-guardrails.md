# YunQi Downstream Time Guardrails Verification

## 结论

- 状态：**PASS**
- 日期：2026-07-16
- 分支：`main`
- 计划提交：`bafac72`
- 实现提交：`9487492`
- 架构依据：
  `docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md`

本次增量没有重命名公共 `YunQiInstant`，也没有提前创建数据库或 React
应用。它冻结了 Phase3/Phase4 必须继承的持久化与前端时间合同，并增加根级
自动化治理门禁。

## 已冻结合同

### YunQiInstant

公共名称保持 `YunQiInstant`，规范定义强化为：

```text
BeijingStandardTime+08:00 Absolute Representation
```

`epochMilliseconds` 仍只用于排序、传输、持久化、审计、兼容和一致性证据，
不是权威历法含义或前端展示来源。

### Persistence

最小持久化字段冻结为：

```text
calendar_time_local varchar
epoch_ms bigint
offset char(6)
calendar_time_standard varchar
```

其中：

- `offset` 固定为 `+08:00`；
- `calendar_time_standard` 固定为
  `BeijingStandardTime+08:00`；
- `timestamp with time zone`/`timestamptz` 只能作为派生查询辅助字段；
- 不依赖数据库、连接、会话、服务器、IANA 或 DST 配置即可重建业务时间。

### React/Next

未来工作台必须使用 API 的规范 `localTime`，或使用只处理固定北京时间
字段/字符串的纯 formatter。

禁止：

```ts
new Date(result.epochMilliseconds)
```

React/Next workspace 的 `src` 中统一禁止 Date、Temporal、Intl、IANA、
browser-local、ISO 和 locale 时间解释 API，从而同时阻止跨文件 helper
绕过。

## 自动化门禁

新增：

```text
scripts/check-yunqi-time-governance.mjs
tests/yunqi-time-governance.test.mjs
npm run test:time-governance
```

门禁执行：

1. 校验 `AGENTS.md`、ADR-001 和 Domain 类型注释中的冻结规则；
2. 从 `apps/`、`packages/` 的依赖自动发现未来 React/Next workspace；
3. 扫描 workspace `src` 下 JavaScript/TypeScript 源码；
4. 允许直接渲染 `localTime`；
5. 拒绝直接或通过无字段名 helper 隐藏的运行时时区解释。

`npm run test:time-purity` 已接入该门禁，因此根 `npm test` 会自动执行。

## 测试先行证据

第一轮 RED：

- 6 项治理测试全部因检查器不存在而失败；
- 失败原因为
  `Cannot find module scripts/check-yunqi-time-governance.mjs`。

第二轮逃逸 RED：

- 组件把 `epochMilliseconds` 传给 `formatter.ts`；
- formatter 内调用 `new Date(value).toLocaleString()`；
- 旧检查逻辑错误返回退出码 `0`，测试按预期失败。

最终 GREEN：

- 规范 `localTime` 展示通过；
- Date 直接转换被拒绝；
- Intl 转换被拒绝；
- Temporal/IANA 转换被拒绝；
- 跨文件 helper 转换被拒绝；
- 不完整持久化规范被拒绝；
- 模糊的 `YunQiInstant` 声明被拒绝。

## 最终验证

| 命令 | 结果 |
|---|---|
| `npm run test:time-governance` | PASS：7/7 |
| `npm run test:time-purity` | PASS：治理 7/7、Domain 27 文件、Service purity |
| `npm run typecheck` | PASS：三个 package build/source/test typecheck |
| `npm test` | PASS：Domain 132、adapter 37、Service 143、治理 7 |
| `git diff --check` | PASS |

`npm test` 同时确认：

- timezone-independence：PASS；
- production smoke：PASS；
- OpenAPI generated drift：PASS；
- OpenAPI 有效。

Redocly 仍只有既有的 3 条非阻断 warning：localhost server、`/health`
无虚构 4XX、Fastify 展开参数后 `YearParams` component 显示 unused。

## 输出边界

- 未创建数据库表、migration 或 ORM model；
- 未创建 React/Next workspace；
- 未改动 Domain 计算行为、API DTO 或 OpenAPI；
- 用户原始 Phase2-A.1 prompt 保持未跟踪、未提交；
- prompt SHA-256：
  `726FD57F641D04A1DD3E33FB604E6CEC8E9E2CCBE4E5621F97BAE4AD4BB03CD6`。
