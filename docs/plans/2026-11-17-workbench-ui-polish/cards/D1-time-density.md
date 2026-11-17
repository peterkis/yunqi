# D1 时间精度与先天对照信息密度

## 目标

主视图不出现秒和毫秒；先天对照提交后首屏能看到对照表。补齐工作站截图矩阵。

## 必读

- 本计划 `README.md`「与清单的调整」、`source-checklist.md` P0-1、P0-3
- `components/time/YunQiTimeDisplay.tsx`、`features/yunqi/components/CurrentYunQiParts.tsx`、`CurrentYunQiPage.tsx`
- `features/yunqi/presentation/map-drilldown.ts`、`year-analysis/components/*`（全年卡、阶段区间）
- `features/constitution/components/ConstitutionContext.tsx`
- `features/yunqi/birth/components/BirthComparisonPage.tsx`、`BirthComparisonTable.tsx`、`styles/views/birth.css`
- `playwright.config.mjs`、`tests/browser/workbench.visual.spec.mjs`、`birth-assessment.flows.spec.mjs`、`fixtures.mjs`

## 要求

### 时间精度（P0-1）

1. 主视图（当下、对照、量表、下钻页主体）展示时间一律用 `YunQiTimeDisplay variant="compact"`（`MM-DD HH:mm`）或只显示日期；`<time dateTime>` 保留完整 `localTime`。
   需要“北京时间 UTC+08”标注的位置保留标注（同一块内只出现一次即可）。不新增 Date/Intl/Temporal/字符串日期运算，只允许对 `localTime` 字符串取子串。
2. 删除“此刻”卡第二行完整时间戳（眉标已有日期）。
3. 全年卡“交运”与阶段区间改为 compact；阶段副标题为 compact 起止（如 `09-22 20:19 → 11-22 15:36`）。**不做**节气名映射和“还有 N 天”。
4. 精确到秒的边界时刻完整列在“计算说明与版本”中（已有则核对，缺则补），作为唯一出现秒的地方。

### 先天对照提交后（P0-3）

5. 提交成功后表单折叠为一行摘要条：`<出生日期> · 时刻不详|<HH:mm> · 修改`；“修改”为文字按钮，点击展开原表单并把焦点移到日期框。清空后回到展开态。
6. 候选区间说明：只有一个候选时压成一行 meta“当日无交界 · 归属唯一”（以 ViewModel 实际字段判断，不自行推断）；多个候选时保持现有完整说明。
7. “当下快照”不再单独占行，并入对照表“当下”列头（compact 时间）。
8. 保留边界说明 `BIRTH_NOTICE` 与提交前说明句；不改 D2 负责的控件样式（日期框、复选框保持原生）。

### 截图矩阵

9. `playwright.config.mjs` 增加 `workstation-768`（1366×768）与 `workstation-1080`（1920×1080）视觉项目（浅色，运行 `workbench.visual.spec.mjs`），沿用现有工作站停靠逻辑；
   新项目同样执行字号、axe、外部请求断言。更新 `tests/browser/README.md` 矩阵与数量。

## 检查（机械约束）

- 浏览器：断言主视图可见文本不匹配 `/\d{2}:\d{2}:\d{2}/` 与毫秒 `/\.\d{3}/`（“计算说明与版本”展开内容除外），并断言 `<time>` 的 `dateTime` 仍为完整值。
- 浏览器：1366×768 下提交出生对照后，对照表列头与岁运行在视口内（`toBeInViewport`）。
- 单测：摘要条、修改展开与焦点、单候选/多候选两种说明。

## 不做

节气名、剩余天数、控件样式（D2）、操作区（D3）、当下页底部入口（D4）。不改 Service/Domain/Contracts/Client。

## 验收标准

- 主视图无秒/毫秒；计算说明中有精确时刻。
- 1366×768 提交后首屏见对照表列头与岁运行。
- 新视觉项目落地；全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
