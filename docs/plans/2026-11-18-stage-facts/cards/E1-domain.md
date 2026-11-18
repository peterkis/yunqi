# E1 Domain：当步运关系、边界节气标签、阶段进度

## 允许修改

`packages/yunqi-domain/**`（源码、测试、README、package.json 版本 1.3.1 → 1.4.0）、`rules/LEARNING_RULES_V1_1.md`（新建）、
`docs/agents/rules-and-time.md`（仅把教学规则链接与版本改到 1.1）、本计划 `evidence/`。
不改 Service、Contracts、Client、Workbench、OpenAPI、核心规则表 `rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md`、`rules/LEARNING_RULES_V1.md`。

## 必读

- `docs/agents/rules-and-time.md`、`rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md`、`rules/LEARNING_RULES_V1.md`、`rules/RULE_FREEZE_NOTE.md`
- `src/types.ts`、`src/rules/phase1-rules.ts`、`src/liuqi/six-qi.ts`、`src/relation/host-guest-relation.ts`
- `src/learning/{rules,movements,calculate-learning,relations}.ts`、`src/services/calculate-yunqi.ts`、`src/calendar/time.ts`、`src/index.ts`
- `tests/learning.test.ts`、`tests/public-api.test.ts`、`tests/public-entry.test.ts`、根 `tests/yunqi-rule-consistency.test.mjs`

## 要求

### A. 当步运主客关系

1. 新建 `src/relation/movement-relation.ts`，导出 `calculateMovementRelation(host: SuiYun, guest: SuiYun): MovementRelationResult`，
   只用 `ELEMENT_GENERATION_MAP`、`ELEMENT_CONTROL_MAP`。返回冻结对象
   `{ elementRelation: 'SAME_ELEMENT'|'DIFFERENT_ELEMENT', direction: 'NONE'|'HOST_GENERATES_GUEST'|'GUEST_GENERATES_HOST'|'HOST_CONTROLS_GUEST'|'GUEST_CONTROLS_HOST', traditionalLabel: string }`。
   类型放 `types.ts`（或与 `HostGuestRelationResult` 并列处），方向枚举可复用已有类型但不得含 `qiRelation`。
2. `MOVEMENT_RELATION_LABELS` 放 `src/learning/rules.ts`：NONE→`同属{element}`（替换为主运五行）、主运生客运、客运生主运、主运克客运、客运克主运。
   不加“相得/顺/逆”。`LEARNING_RULE_VERSION` 改为 `YQ-LEARNING-RULES-1.1.0`。
3. `MovementStep` 增加 `relation`，五步都给出。

### B. 边界标签

4. `SixQiStep` 增加 `startTerm`、`endTerm`，类型为六气边界节气（`(typeof STEP_BOUNDARY_TERMS)[number]`，导出类型名如 `SixQiBoundaryTerm`）。
   第 i 步 start=`STEP_BOUNDARY_TERMS[i-1]`，end=`STEP_BOUNDARY_TERMS[i % 6]`（终之气 end 为次年大寒）。只从该常量取，不另写表。
   核心规则版本 `YQ-MVP-RULES-1.1.0` 不变（只增派生投影，不改规则）；在报告中说明。
5. 把 `buildMovementSteps` 内的偏移表提为 `src/learning/rules.ts` 的单一常量（如 `MOVEMENT_BOUNDARY_OFFSETS`），交运边界与标签都从它派生。
   `MovementStep` 增加 `startLabel`、`endLabel`：初运 start “大寒”，其后依次 “春分后13日”“芒种后10日”“处暑后7日”“立冬后4日”，终运 end “大寒”。
   边界时刻计算结果必须与改动前逐毫秒一致（加测试）。

### C. 阶段进度

6. 新建纯函数 `calculateStageProgress(start: YunQiInstant, end: YunQiInstant, input: YunQiInstant): StageProgress`（建议 `src/calendar/stage-progress.ts`）：
   - 要求 `start <= input < end`，否则抛 `RangeError`；`end > start`。
   - `elapsedRatio = (input − start) / (end − start)`（epochMilliseconds），四舍五入到 3 位小数；若舍入得 1 则取 0.999，保证 [0, 1)。
   - `remainingCalendarDays`：两端用 `createYunQiCalendarTimeFromInstant` 取固定北京时间年月日，按公历日序号相减（整数，不看钟点）；
     不得用 Date。可在 `calendar/time.ts` 抽出/复用已有的按年月日求日序号的纯算术。
   - `endsOnInputDate = remainingCalendarDays === 0`。返回冻结对象。
   - 说明：epochMilliseconds 只用于比例（时长之比），日历含义（剩余天数）来自本地日期字段，符合 rules-and-time.md。
7. `YunQiCalendarResult`（及 `calculateYunQi` 返回的 `YunQiResult`）增加 `currentStepProgress`；`YunQiLearning` 增加 `currentMovementProgress`。
   其余步不带进度。
8. 公开入口 `src/index.ts` 导出新函数、类型与常量；同步 `public-api`/`public-entry` 测试。

### D. 教学规则文档

9. 新建 `rules/LEARNING_RULES_V1_1.md`：版本 1.1.0、日期 2026-11-18、授权（本计划）、相对 1.0 的变更（主客运关系标签表、交运标签、阶段进度定义）、原因、
   专家状态“待中医专家确认”，列出 E4 三问，并写明评审发现：客运为主运旋转，同元素主客运太少恒同（第 3 问在现行口径下不出现），同年五步方向一致。
   其余 1.0 内容可引用 1.0 文件，不必全文复制。`docs/agents/rules-and-time.md` 中教学规则链接与版本更新到 1.1（该文件受 `pnpm test:project-guidance` 限长）。

## 测试（金标与边界）

- 2026 丙午：终运 主太羽（水）× 客少商（金）→ `GUEST_GENERATES_HOST`/“客运生主运”；五之气 `startTerm` 秋分、`endTerm` 小雪；
  输入 2026-11-18 08:44 北京时间：五之气 `remainingCalendarDays = 4`、终运 `remainingCalendarDays` 按实算写入、`elapsedRatio` 按实算写入快照（预期约 0.929）。
- 五种 direction 各用一个真实年份覆盖（岁运木→NONE，火→主生客，土→主克客，金→客克主，水→客生主），并断言同一年五步方向一致。
- 边界：输入恰在 start → ratio 0；输入在 end 当日但早于交气时刻 → `remainingCalendarDays 0`、`endsOnInputDate true`；
  跨年的终之气、终运（end 为次年大寒）；input 等于 end 或早于 start → RangeError。
- `startLabel/endLabel` 五步序列；六步 `startTerm/endTerm` 序列且相邻步 end = 下一步 start。

## 检查命令

- `pnpm build:contract-source`、`pnpm --filter @yunqi/domain test`、`pnpm --filter @yunqi/domain typecheck`（若有）
- `pnpm test:rule-consistency`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test`（Service 等下游如因 Domain 新字段在闭合 schema 序列化处失败，记录失败并说明，不在本卡改 Service；评审方决定是否在 E2 处理）
- `pnpm test:coverage`

## 不做

Service/OpenAPI/Contracts/Client/Workbench；E4 专家结论；“相得/顺/逆”。
