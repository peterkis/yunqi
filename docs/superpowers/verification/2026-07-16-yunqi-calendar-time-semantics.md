# Phase2-A.1 Fixed Beijing Time Semantics Verification

## 结论

- 状态：**PASS**
- 日期：2026-07-16
- 分支：`main`
- 实现提交：`38621d0`
- 架构依据：
  `docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md`
- 详细规格：
  `docs/superpowers/specs/2026-07-16-yunqi-calendar-time-semantics-design.md`
- 实施计划：
  `docs/superpowers/plans/2026-07-16-yunqi-fixed-beijing-time-semantics.md`

Phase2-A.1 已将五运六气业务时间统一迁移为固定北京时间 UTC+08:00。
IANA `Asia/Shanghai` 历史规则、1986–1991 夏令时、服务器默认时区和 DST
均不参与业务计算。Phase1 规则映射与 tyme4ts 节气结果未改变。

## 已交付架构

### Domain

- `YunQiCalendarTime` 是权威带日期计算模型。
- `YunQiInstant` 固定为
  `{ epochMilliseconds, offset: '+08:00' }`，只用于排序、传输、持久化、
  审计、兼容和一致性校验。
- `calculateYunQiByCalendarTime()` 是唯一带日期计算实现。
- `calculateYunQi(YunQiInstant)` 只执行
  `Instant -> CalendarTime -> calculateYunQiByCalendarTime()`。
- 年份与六步边界使用七字段 `BeijingLocalDateTime` 元组比较。
- Domain 源码、测试和夹具不使用 `Date`、Temporal、Intl、IANA 时区名或
  tzdb。

### Calendar adapter

- `CalendarProvider` 合同仍返回 `YunQiInstant`。
- tyme4ts 只负责节气计算；adapter 只转换为固定 `+08:00` 表示。
- Provider 不决定运气年、六步归属、区间开闭或五运六气规则。
- Service 禁止调用 adapter 的兼容 `toYunQiInstant` 输入转换入口。

### Service

- Business Time Normalizer 位于
  `packages/yunqi-service/src/modules/time-normalizer`。
- 支持且仅支持：

```text
YYYY-MM-DDTHH:mm:ss
YYYY-MM-DDTHH:mm:ss.SSS
YYYY-MM-DDTHH:mm:ss+08:00
YYYY-MM-DDTHH:mm:ss.SSS+08:00
YYYY-MM-DDTHH:mm:ssZ
YYYY-MM-DDTHH:mm:ss.SSSZ
```

- `/calculate` 保持原路径和 `dateTime` 请求字段。
- `/current` 执行
  `runtime epoch -> YunQiCalendarTime -> calculateYunQiByCalendarTime()`。
- Controller、route、mapper、serializer 和 DTO 层不创建业务 `Date`，
  不调用 `Date.parse()`/`toISOString()`，也不自行执行固定偏移、Temporal、
  Intl 或 IANA 转换。
- 所有公共时间 DTO 均为：

```json
{
  "localTime": "2026-06-19T12:00:00+08:00",
  "epochMilliseconds": 1781841600000,
  "offset": "+08:00",
  "calendarTimeStandard": "BeijingStandardTime+08:00"
}
```

### 版本

```text
OpenAPI dialect: 3.1.0
OpenAPI document release: 1.1.0
API path version: /api/v1
Rule version: YQ-MVP-RULES-1.0.0
Domain/adapter/service package version: 1.1.0
```

## 时间语义证据

### 等价输入

以下输入归一化为完全相同的 `YunQiCalendarTime`：

| 输入 | localTime | epochMilliseconds |
|---|---|---:|
| `2026-01-01T12:00:00` | `2026-01-01T12:00:00+08:00` | 1767240000000 |
| `2026-01-01T12:00:00+08:00` | `2026-01-01T12:00:00+08:00` | 1767240000000 |
| `2026-01-01T04:00:00Z` | `2026-01-01T12:00:00+08:00` | 1767240000000 |

### 2024 大寒边界

| 固定北京时间 | epochMilliseconds | 运气年 | 六步 |
|---|---:|---:|---:|
| `2024-01-20T22:07:21+08:00` | 1705759641000 | 2023 | 6 |
| `2024-01-20T22:07:22+08:00` | 1705759642000 | 2024 | 1 |
| `2024-01-20T22:07:23+08:00` | 1705759643000 | 2024 | 1 |

本地、`+08:00` 和等价 `Z` 三种形式结果一致，证明 `[start, end)` 边界未漂移。

### 1991 历史 DST 回归

| 节气 | 固定北京时间 | epochMilliseconds | 六步 |
|---|---|---:|---:|
| 小满 | `1991-05-21T21:20:14+08:00` | 674832014000 | 3 |
| 大暑 | `1991-07-23T16:11:08+08:00` | 680256668000 | 4 |

每个案例的无后缀本地、显式 `+08:00` 和等价 `Z` 输入同时比较：

- `localTime`
- `epochMilliseconds`
- `offset`
- `calendarTimeStandard`
- 运气年
- 当前六步

结果完全相同，历史社会夏令时未参与计算。

### Phase1 tyme4ts 基准保持

| 节气 | epochMilliseconds |
|---|---:|
| 2024 大寒 | 1705759642000 |
| 2024 春分 | 1710903985000 |
| 2024 小满 | 1716209971000 |
| 2024 大暑 | 1721634266000 |
| 2024 秋分 | 1727009022000 |
| 2024 小雪 | 1732218991000 |
| 2025 大寒 | 1737316808000 |

## 测试先行证据

实施前的代表性 RED：

- Domain 时间模型：38 项中 22 项失败。
- Domain 权威计算入口：58 项中 10 项失败。
- Domain 规则版本：46 项中 4 项失败。
- Domain 自有字段/访问器防伪：20 项中 1 项失败。
- Domain purity：旧 IANA/时间 API 共 5 个发现。
- Adapter：旧 `timezone` 结果形状导致 12 项失败，节气 epoch 本身一致。
- Service purity 的每组新增逃逸探针均先失败，再实现门禁：
  `Date` 变体、parser/formatter、固定偏移算术、手工聚合、Domain/adapter
  conversion、normalizer 深导入、伪同名绑定和错误来源 alias。

最终 Service purity focused suite 为 **44/44**。

## 最终验收命令

| 命令 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `npm test` | PASS：Domain 132、adapter 37、Service 143，共 312 项 |
| `npm run typecheck` | PASS：三个 package 的 source/test typecheck |
| `npm run test:coverage` | PASS |
| `npm run schema:validate` | PASS：4/4 |
| `npm run openapi:validate` | PASS，OpenAPI 有效 |
| `npm run test:timezone` | PASS：`TZ=UTC` 与 `TZ=Asia/Shanghai` 业务 JSON 字节一致 |
| `npm run smoke:production-entry` | PASS：真实 `dist/server.js` 与真实 tyme4ts provider |
| `git diff --check` | PASS |

覆盖率：

| Package | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Domain | 96.15% | 90.98% | 100% | 96.13% |
| Service | 96.19% | 88.88% | 94.64% | 97.23% |

Service 覆盖率命令固定使用单 worker。原因是 Windows 下多个 Fastify
实例与 V8 coverage 并行时会产生资源竞争；单 worker 最终 14 个文件、
143 项测试全部通过，不改变测试内容或覆盖阈值。

## OpenAPI warnings

Redocly 保留 3 条非阻断 warning：

1. local server URL 使用 `http://localhost:3000`；
2. `/health` 没有不真实的 4XX response；
3. Fastify 展开 path 参数后 `YearParams` component 显示 unused。

OpenAPI 仍报告有效，生成 YAML 与 TypeScript client drift gate 通过。

## 纯净度和迁移门禁

Domain purity 扫描 27 个源码/测试文件并通过。

Service purity 除禁止时间 API 外，还验证：

- `Date.now` 只允许作为 `src/server.ts` 中精确的 `now: Date.now` 注入；
- raw `request.body.dateTime` 只允许进入从
  `modules/time-normalizer/index.js` 精确导入的 `normalizeApiDateTime`；
- 禁止伪同名本地函数、fake module、adapter alias 和重绑定；
- normalizer 外禁止 Domain 时间工厂/formatter、adapter
  `toYunQiInstant`、手工 Instant/CalendarTime、固定 `+08` 换算；
- normalizer 外只能导入稳定 `index.js`，不能深导入 parser/normalizer/
  formatter 私有实现。

## 独立审查

两路独立最终只读审查均结论为：

```text
APPROVED
P0: 0
P1: 0
P2: 0
```

审查过程中发现并闭环了旧主领域文档、旧规则时间语义、coverage 并行资源
竞争以及多类 purity gate 逃逸；最终复测均通过。

## 输出卫生与受保护文件

- `git ls-files` 对 `dist/`、`coverage/`、时区 snapshot JSON 无匹配。
- 本阶段没有创建 `apps/api`。
- 依赖方向保持 `yunqi-service -> yunqi-domain`。
- 用户原始规格文件保持未跟踪、未提交：
  `codex/prompts/Phase2-A.1_yunqi_calendar_time_semantic_fix_prompt.md`
- 该文件验收时 SHA-256：
  `726FD57F641D04A1DD3E33FB604E6CEC8E9E2CCBE4E5621F97BAE4AD4BB03CD6`

## Definition of Done

- [x] 固定北京时间 UTC+08:00 成为唯一业务时间语义。
- [x] `YunQiCalendarTime` 成为权威计算模型。
- [x] instant 入口仅为 compatibility wrapper。
- [x] CalendarProvider 只提供节气瞬间。
- [x] Service normalizer 位于批准的 package 目录。
- [x] `/calculate` 与 `/current` 均进入权威 CalendarTime 计算。
- [x] API/OpenAPI/browser contract 移除 `timezone: "Asia/Shanghai"`。
- [x] 1986–1991 DST 不参与计算。
- [x] Phase1 规则映射和 tyme4ts epochs 保持。
- [x] ADR、AGENTS、主领域设计和规则文档一致。
- [x] 全部测试、覆盖率、类型、schema、OpenAPI、TZ、smoke 和纯净门通过。
