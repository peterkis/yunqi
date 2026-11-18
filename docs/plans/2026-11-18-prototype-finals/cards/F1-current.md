# F1 当下：年轮卡与气运对齐网格

## 目标

当下页上半屏按[参考稿 01](../reference/01-current.html)重做：第一张卡是年轮卡（年份与交运、年轮、图例、年运三要素、年度关系），第二张卡是左右逐行对齐的“当步气 | 当步运”网格。
原文卡与“更多”列表保留在其后，样式不变。

## 必读

- 本计划 `README.md`“定稿与现行规则的调整”，以及参考稿 `reference/01-current.html`
- `features/yunqi/components/CurrentYunQiPage.tsx`、`CurrentYunQiView.tsx`、`CurrentYunQiParts.tsx`、`SixQiTimeline.tsx`、`SixQiTimelineItem.tsx`
- `features/yunqi/presentation/map-current-yunqi.ts`、`map-learning.ts`、`map-stage-progress.ts`、`visual-mappings.ts`、`view-model.ts`
- `styles/views/current-yunqi.css`、`current-yunqi.test.tsx`
- `tests/browser/stage-facts.flows.spec.mjs`、`stage-facts-helpers.mjs`、`learning.flows.spec.mjs`、`workbench.visual.spec.mjs`

## 要求

### 年轮卡（替换现有全年卡）

1. 眉标行：左侧“全年 · <年份>”，右侧“交运 <MM-DD HH:mm>”。完整时刻保留在 `<time dateTime>`。
2. 年轮为内联 SVG 组件 `YunQiWheel`（新建于 `features/yunqi/components/`），只接收 ViewModel：
   - 外环六段：`currentStepIndex`（1–6）。已过的段用 `accent-muted`，当前段用 `accent` 并反白段名，未到的段用 `surface-sunken`。段名“初 二 三 四 五 终”。
   - 内环五段：当前运序号（1–5），取自学习 ViewModel 的当前运。当前段用 `relation-favorable-fg`，其余用 `relation-favorable-bg`。
   - 圆心：干支（宋体 30）与“<岁运>之年”（`meta`）。
   - `role="img"`，`aria-label` 写全：当前第几步气及段内进度文字（复用 `map-stage-progress` 的 `elapsedLabel`），当前第几步运。
   - 几何只用常量与序号计算，不涉及任何时间运算。颜色一律用令牌，SVG 用 `style="fill:var(--…)"`，不用 `fill` 属性写色值。
3. 图例一行：“外环 · 六步气”“内环 · 五步运”，色块与两环当前段同色。
4. 年运三要素：岁运、司天、在泉三等分小块（`surface-page` 底，`radius-sm`），每块写眉标加五行圆点和值。
5. 年度关系：沿用现有 RelationChip 与说明句，作为卡片最后一行，标签与说明**垂直居中**。
6. 删除原全年卡里的干支大字、三栏表和下沉提示块，它们的内容已由上面几项承接。

### 气运对齐网格（替换现有“此刻”卡）

7. 删除“此刻 · <日期>”“北京时间 UTC+08”眉标行和六步指示条（年轮已承接）。
8. 用**一张** CSS Grid 承载两栏：`grid-template-columns: minmax(0,1fr) 1px minmax(0,1fr)`，七行依次为：
   - 标题：宋体阶段名，如“五之气”“终运”。
   - 区间：`startTerm → endTerm`，或 `startLabel → endLabel`。
   - 剩余：“还有 N 天”，或“今日 HH:mm 交气 / 交运”，复用 `map-stage-progress`。
   - 主：“主气 / 主运”加五行圆点与值。
   - 客：“客气 / 客运”加五行圆点与值。
   - 关系标签：RelationChip。
   - 说明句。

   两栏每一项用 `grid-row` 放在同一行，中间 1px `border-subtle` 竖线贯穿七行。**不允许**两栏各自用 flex 纵向堆叠，那样会再次错位。
9. 主运和客运的值按定稿只写“水运太过”“金运不及”，不带太少音名。值来自 ViewModel 现有字段，不在组件里截字符串；需要时在 mapper 中提供不带音名的字段。
10. 原文卡与“更多”列表原样保留在气运卡之后。

### 收起态复核

11. 只在截图中复核收起态胶囊与 `reference/06-pill.html` 一致，不改代码；有差异写进报告。

## 检查（机械约束）

- 单测：`YunQiWheel` 在第 1、5、6 步和第 1、5 运时，当前段的令牌与 `aria-label` 正确；气运网格的 14 个单元格各自的 `grid-row` 正确（1–7 行，两列）。
- 浏览器：400×860 下两栏七行的单元格 `boundingBox().y` 两两相等（误差 ≤1px）；1366×768 下年轮卡和气运卡的标题都在视口内。
- 浏览器：页面上不再出现“北京时间 UTC+08”的“此刻”眉标行和六步指示条的 DOM。现有 `stage-facts` 用例按新结构改写，断言内容不变（节气、剩余天数、两个关系标签与语气）。

## 不做

不改原文卡、“更多”列表、收起态、先天对照和量表；不改 Service/Domain/Contracts/Client。

## 验收标准

- 上半屏结构与参考稿一致：眉标、年轮、图例、三要素、年度关系、气运七行网格。
- 两栏逐行对齐，有截图为证。
- 年轮可读：读屏能读到当前步、段内进度和当前运。
- 全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
