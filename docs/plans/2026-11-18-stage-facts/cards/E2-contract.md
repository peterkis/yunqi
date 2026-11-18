# E2 契约 YQ-API-CONTRACT-1.3.0

## 允许修改

`packages/yunqi-service/**`（schema、mapper、服务、测试、OpenAPI、README、版本）、`packages/yunqi-contracts/**`（生成物、facade、registry、新 freeze、版本）、
`packages/yunqi-client/**`（类型/版本，如需）、`docs/contracts/YQ-API-CONTRACT-1.3.0.md`（新建）、`AGENTS.md`、`docs/agents/api-contracts.md`、根 README 中的版本行、
根 `tests/*.test.mjs` 与 `scripts/` 中引用当前契约 ID 的地方、本计划 `evidence/`。
Workbench 只允许为通过类型检查而**最小**更新测试夹具/fixture（补新 required 字段），不改界面、mapper、组件。不改 Domain。

## 必读

- `docs/agents/api-contracts.md`、`docs/architecture/ADR-002-yunqi-contract-freeze.md`、`docs/contracts/YQ-API-CONTRACT-1.2.0.md`（含 1.1.0/1.2.0 迁移写法先例）
- `packages/yunqi-service/src/schemas/{yunqi,learning,common,index}.ts`、learning/yunqi 的 service 与 DTO mapper、`src/plugins/openapi.ts`
- `packages/yunqi-contracts/contract/registry.json`、`scripts/` 中 contracts generate/freeze/check 脚本
- E1 的 Domain 新字段（`git diff main -- packages/yunqi-domain`）

## 要求

1. Schema（全部 required、`additionalProperties: false`）：
   - `SixQiStepDto` 增 `startTerm`、`endTerm`，引用新的闭合枚举 schema（6 值：大寒、春分、小满、大暑、秋分、小雪；`$id` 如 `SixQiBoundaryTerm`）。
   - 新 `StageProgressDto`：`elapsedRatio`（number，minimum 0，exclusiveMaximum 1）、`remainingCalendarDays`（integer，minimum 0）、`endsOnInputDate`（boolean）。
   - `YunQiCalculationDto` 增 `currentStepProgress`（year 端点的 `YunQiYearDto` 不加）。
   - 新 `MovementRelationDto`：`elementRelation`、`direction`、`traditionalLabel`，枚举与 `HostGuestRelationDto` 对应字段平行，不含 `qiRelation`。
   - `MovementStepDto` 增 `relation`、`startLabel`、`endLabel`；`YunQiLearningDto` 增 `currentMovementProgress`。
2. Mapper 直接映射 Domain 结果，不在 Service 计算业务；时间仍只经 time-normalizer。
3. OpenAPI `x-yunqi-contract-id` 改为 `YQ-API-CONTRACT-1.3.0`；`openapi:generate`、`contracts:generate`、`contracts:freeze` 生成 1.3.0；
   registry 追加、1.0/1.1/1.2 freeze 文件逐字节不变。
4. 包版本按 SemVer minor：service 2.2.0→2.3.0、contracts 1.2.0→1.3.0、client 1.2.0→1.3.0（若 client 无代码变化也随契约升 minor，并说明）。
5. `docs/contracts/YQ-API-CONTRACT-1.3.0.md`：覆盖端点、新增字段表、字段含义（进度相对本次输入时刻；`currentStepProgress` 也随 learning/出生对照的 `facts` 出现；
   出生对照中的进度相对出生候选时刻，仅为结构复用）、迁移说明（闭合校验的消费方须升级；运气语义不变；旧字段原样；
   learning 系列 `ruleVersion` 由 `YQ-LEARNING-RULES-1.0.0` 变为 `1.1.0`，做精确版本检查或缓存的消费方需处理）、教学标签待专家确认。
6. `AGENTS.md` 第 9 行契约版本、`docs/agents/api-contracts.md` 当前契约链接与说明更新到 1.3.0（两文件受 `pnpm test:project-guidance` 限长）。
7. Service 测试：各端点响应含新字段且通过 schema；2026-11-18 08:44 current/learning 的金标（五之气 秋分→小雪、余 4 天；终运 客运生主运）。

## 检查命令

- `pnpm build`、`pnpm test`、`pnpm typecheck`、`pnpm test:coverage`
- `pnpm contracts:check`、`pnpm test:contract-governance`、`pnpm schema:validate`、`pnpm test:project-guidance`、`pnpm test:time-governance`
- `pnpm test:browser`（评审方运行；本卡不改界面，预期不受影响）

## 不做

Domain 变更、Workbench 界面、新增端点或状态码。
