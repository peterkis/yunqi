# 阶段事实补全：当步运关系、节气边界、阶段进度（契约 1.3.0）

> 用户 2026-11-18 下达的原始计划，原样存档。执行以本目录 `README.md` 与 `cards/` 为准。

- 日期：2026-11-18
- 基线：`main` @ fff024f（#22 UI 收尾打磨 D1–D5）
- 来源：UI 收尾打磨清单里未做的三项。三项都必须由 Domain 和契约提供，UI 不自行计算：
  - P1-7 当步运关系
  - P0-1 节气名与“还有 N 天”
  - P2-13 段内进度
- 授权：本计划即排期依据。三项一起升一个契约版本，避免连续升级两次。

## 目标

当下页的“气”和“运”两段对称呈现：

```
五之气                         终运
秋分 → 小雪 · 还有 4 天         立冬后4日 → 大寒 · 还有 63 天
主气 阳明燥金  客气 少阳相火     主运 水运太过（太羽） 客运 金运不及（少商）
[顺 · 客胜主] 客火克主金        [客运生主运] 客金生主水
```

六步进度条的当前段按比例硬边分割（已过 / 未过）。

## 三项事实的定义（Domain）

### A. 当步运的主客关系

- 新增 `relation/movement-relation.ts`，导出 `calculateMovementRelation(host: SuiYun, guest: SuiYun)`。
  - 复用 `ELEMENT_GENERATION_MAP`、`ELEMENT_CONTROL_MAP`，与六气客主加临共用同一张五行生克表。
  - 返回 `{ elementRelation: 'SAME_ELEMENT' | 'DIFFERENT_ELEMENT', direction: 'NONE' | 'HOST_GENERATES_GUEST' | 'GUEST_GENERATES_HOST' | 'HOST_CONTROLS_GUEST' | 'GUEST_CONTROLS_HOST', traditionalLabel }`。
- 标签表 `MOVEMENT_RELATION_LABELS` 放在 `learning/rules.ts`，因为五步运属于教学口径。教学规则版本由 `YQ-LEARNING-RULES-1.0.0` 升到 `1.1.0`。

| direction | traditionalLabel |
| --- | --- |
| NONE（同五行） | 同属{element} |
| HOST_GENERATES_GUEST | 主运生客运 |
| GUEST_GENERATES_HOST | 客运生主运 |
| HOST_CONTROLS_GUEST | 主运克客运 |
| GUEST_CONTROLS_HOST | 客运克主运 |

- **刻意不加**“相得 / 顺 / 逆”。“主胜逆、客胜从”出自《至真要大论》，讲的是六气客主加临；把它套到五运主客运，属于需要专家确认的外推。标签先只陈述生克方向，见文末“待专家确认”。
- `MovementStep` 增加 `relation` 字段，五步都给出，以便“其余阶段”列表复用。

### B. 阶段边界的节气标签

- 六气：`SixQiStep` 增加 `startTerm` 和 `endTerm`，类型为 `SolarTerm`。直接取自现有的 `STEP_BOUNDARY_TERMS`，不形成第二份规则来源。
  - 终之气的 `endTerm` 是次年大寒。
- 五运：`MovementStep` 增加 `startLabel` 和 `endLabel`，类型为 `string`，由 `buildMovementSteps` 里已有的偏移表生成：
  - 取值依次为“大寒”“春分后13日”“芒种后10日”“处暑后7日”“立冬后4日”“大寒”。
  - 这是交运口径的如实描述，不是节气名，所以用 label 而不用 term。

### C. 当前阶段进度

- 新增纯函数 `calculateStageProgress(start, end, input)`，三个参数都是 `YunQiInstant`，返回：

| 字段 | 定义 |
| --- | --- |
| `elapsedRatio` | `(input − start) / (end − start)`，按 epochMilliseconds 计算，范围 [0, 1)，保留 3 位小数 |
| `remainingCalendarDays` | 北京时间日历日差，即 `date(end) − date(input)`，整数 ≥ 0，不看钟点 |
| `endsOnInputDate` | `remainingCalendarDays === 0` |

- 只给 `currentStep` 和 `currentMovement`，也就是含输入时刻的那一步，其余步没有“进度”。
- 只用输入时刻计算，不读本机时钟，符合时间纯度门禁。
- 文案约定交给 UI，以 DTO 为准：
  - `remainingCalendarDays > 0` 时显示“还有 N 天”。
  - 等于 0 时显示“今日 HH:mm 交气”或“今日 HH:mm 交运”，HH:mm 取 `end.localTime`。

## 契约（YQ-API-CONTRACT-1.3.0）

| DTO | 新增字段（全部 required、闭合对象） | 端点 |
| --- | --- | --- |
| `SixQiStepDto` | `startTerm`、`endTerm`（SolarTerm 枚举） | year、calculate、current、learning |
| 计算结果 | `currentStepProgress: StageProgressDto` | calculate、current |
| `MovementStepDto` | `relation: MovementRelationDto`、`startLabel`、`endLabel` | learning |
| `YunQiLearningDto` | `currentMovementProgress: StageProgressDto` | learning |

- 新增 DTO：`MovementRelationDto`（结构与 `HostGuestRelationDto` 平行，不含 `qiRelation`）和 `StageProgressDto`。
- 只增字段、不改语义。依据 api-contracts.md，任何投影变化都要分配新的 Contract ID：`pnpm contracts:generate` 后执行 `pnpm contracts:freeze` 生成 1.3.0。
- package 版本按 SemVer 升 minor。
- 新增 `docs/contracts/YQ-API-CONTRACT-1.3.0.md`，写明迁移说明：
  - 消费方若对 response 做闭合校验，需要同步升级。
  - 运气语义没有变化，旧字段原样保留。
- 同步更新 AGENTS.md 第 9 行的版本号。

## 任务卡

| 卡 | 内容 | 依赖 |
| --- | --- | --- |
| E1 Domain | A、B、C 三项实现，以及 `LEARNING_RULE_VERSION` 1.1.0 | — |
| E2 契约 | Service schema、mapper、OpenAPI，freeze 1.3.0，契约文档与迁移说明，contracts facade 与 client 类型 | E1 |
| E3 Workbench | 当下页运的关系标签、阶段副标题、进度条分割；收起态胶囊第二行可选加“还有 N 天”；先天对照“所处运”一行改用 DTO 关系 | E2 |
| E4 专家确认 | 下文三问，结论回写规则文档 | 与 E1 并行，结论可能修改 E1 的标签表 |

### E1 验收（Domain）

金标用例：

- 2026 丙午：
  - 终运 主太羽（水）× 客少商（金）→ 客运生主运。
  - 五之气 `startTerm` 秋分、`endTerm` 小雪。
  - 输入 11-18 08:44 时，`remainingCalendarDays = 4`，`elapsedRatio ≈ 0.929`（以实现计算值为准，写入快照）。
- 每种 direction 至少覆盖一个真实年份的步。五种方向都要有，同五行用主运和客运同元素的那一步。
- 边界：
  - 输入恰在 start 时，ratio 为 0。
  - 输入在 end 当日但早于交气时刻时，`remainingCalendarDays = 0`、`endsOnInputDate = true`。
  - 跨年的终之气、终运（次年大寒）。
- 现有门禁全绿，覆盖率不下降。

### E2 验收（契约）

- `contracts:check`、`test:contract-governance`、`schema:validate` 通过。
- OpenAPI 的 `x-yunqi-contract-id` 是 1.3.0。
- 1.2.0 的冻结快照原样保留。

### E3 验收（Workbench）

- 关系标签语气映射写在 `visual-mappings.ts`：

| 关系 | 标签语气 |
| --- | --- |
| 生（任一方向） | 相合（蓝） |
| 同五行 | 中性 |
| 克（任一方向） | **中性**，在专家确认之前不用相违色 |

- 进度条当前段的比例来自 `elapsedRatio`。实现方式是一个 2px 宽、硬边的“已过”填充，不用渐变。
- UI 内不出现任何时间差运算，不出现节气静态表。门禁中新增 grep 断言：workbench 源码里不出现 `大寒|春分|小满|大暑|秋分|小雪` 的数组字面量。
- 浏览器矩阵中 400×860、1366×768、1920×1080 三档截图对比，axe 零违规。

## 待专家确认（E4）

1. 主客运之间是否沿用“相得”的说法（主运生客运、客运生主运时）？
2. 客运克主运、主运克客运，是否有顺逆之分？如果有，依据哪段原文？确认后再决定“克”是否改用相违色。
3. 主运与客运同五行但太少不同（如主太羽、客少羽）时，是否需要单独称谓？

在确认之前，界面统一使用上表的中性陈述，页脚“五步运为教学口径，待专家确认”的声明保持不变。


---

## 追加（用户 2026-11-18 第二轮下达）

用户随新一轮计划附来两份补丁（原样存于 `source/`）：

- `0001`：E4 专家结论落地，教学规则 `YQ-LEARNING-RULES-1.2.0`。专家结论表：主运生客运“相得 · 主生客”（相合）、客运生主运“相得 · 客生主”（相合）、
  客运克主运“顺 · 客胜主”（相合，《至真要大论》“主胜逆，客胜从”；《类经》“客主之运有逆顺”）、主运克客运“逆 · 主胜客”（相违）、
  同五行太少不同“同属水运 · 太少不同”（中性）、同五行太少相同“主客同运”（中性，专家未单独作答，待下次确认）。契约 1.3.0 不变。
- `0002`：独立侧栏窗口宿主契约。运气通为独立侧边栏程序，不嵌入门诊工作站；收起态 424×88 透明窗口、`shadow-pill`（0 2px 8px）、
  展开面板左缘 1px 细线；AppBar 预留右侧 400px（可切悬浮覆盖）、收起窗口置顶可拖动按显示器记忆位置；Tauri 外壳另行排期。
