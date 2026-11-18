# F4 体质量表：组合 2，以及题干焦点黑框修复

## 目标

按[参考稿 04](../reference/04-constitution.html)重做作答页：

- 上方一张合并卡：运气上下文两栏加九质进度。
- 中间是黛青题头，只放题干与作答提示。
- 下方选项序号在左、程度圆点在右。

同时修掉自动翻题后题干外的焦点黑框。

## 必读

- 本计划 `README.md` 中关于“先天一栏”和“九质进度计数”的两行调整，以及参考稿 `reference/04-constitution.html`
- `features/constitution/components/ConstitutionForm.tsx`、`ConstitutionContext.tsx`、`ConstitutionAssessmentPanel.tsx` 及其单测
- `features/constitution/presentation/map-constitution.ts`
- `styles/views/constitution.css`、`form-controls.css`
- `tests/browser/constitution-helpers.mjs`、`constitution-actions.flows.spec.mjs`、`workbench.visual.spec.mjs`

## 要求

### 合并卡（上下文加九质进度）

1. 卡片上半部为两栏，中间 1px `border-subtle` 竖线分隔：
   - 左栏：眉标“当下”，下面是五行圆点加摘要（如“丙午 · 五之气 · 相火加临”）。
   - 右栏：眉标“先天”。有本次会话的出生资料时显示其摘要，复用现有 `context.birth`；多候选时显示“<n> 个候选”，加 `aria-label` 列出全部候选。没有出生资料时显示链接“未填写 · 去对照 ›”，指向先天对照。
   - 原上下文卡里的“计算说明与版本”折叠项移到页面底部，放在“量表来源与适用说明”旁边。
2. 卡片下半部（上方 1px `border-subtle`）：
   - 标题行左侧写“体质维度 · 男性版|女性版 更换”。“更换”沿用 D2 的确认与清空逻辑。
   - 标题行右侧写“<已答> / <总题数>”，已答数用 13px、`ink-primary`。
   - 下面一行九格，`repeat(9, minmax(0,1fr))`，按标准附录顺序排列。每格自上而下：体质简称（如“气虚”）、3px 进度条、计数。计数为“已答/该维度题数”，该维度全部答完时显示“✓”。
   - 当前题所属的维度：简称加粗，用 `accent` 色。有已答题的维度用 `accent` 色；其余维度用 `ink-tertiary`。
   - 计数由 mapper 按 DTO `scales[].items[].questionId` 统计；一题属于多个维度时各自计入，当前题所属的全部维度都高亮。不改题目顺序。
3. 原先单独一行的“男性版 · 更换”和 26 格进度条删除，由第 2 项承接。

### 黛青题头

4. 题头为 `accent` 底、`accent-on` 字、`radius-lg`，内距 18/18/16，只包含：
   - 题干：保持现有 `h3.constitution-question-title`（`tabindex="-1"`），字体与字号沿用 `--ts-title`、`--type-question-line`，颜色改为 `accent-on`。
   - 提示句：11.5px，透明度 .85，内容为“请患者根据近一年的体验和感觉作答 · 数字键 1–5”。

   不放进度条、进度数字和“体质量表 · 男性版”。

### 选项

5. 每项高 48，自左至右依次为：
   - 序号角标（22px，`radius-xs`）；
   - 主标签（600，宽 36）；
   - 程度说明（`ink-tertiary`）；
   - 右侧推到底（`margin-left:auto`）的 5 个 7px 圆点，按选项值 1–5 依次填满 1–5 个。

   圆点填色为 `accent`，未填的圆点为 1.5px `border-strong` 描边。圆点 `aria-hidden`，读屏文本保持“<序号> <标签>（<说明>）”。
6. 选中项：`accent` 实底、`accent-on` 字；序号角标反白（`accent-on` 底、`accent` 字）；圆点改为 `accent-on`，未填的圆点为 `accent-on` 描边且透明度 .45。
7. “上一题”保留为文字按钮；“结束并销毁答卷”保留在底部操作区。

### 题干焦点黑框（修复）

8. 根因：翻题后脚本把焦点移到题干 `h3`，而 `.constitution-session :focus-visible` 给它画了 2px 描边，用户按数字键作答时浏览器判定为键盘焦点，所以出现黑框。
   修复：仅对程序聚焦的非交互标题去掉描边，即 `.constitution-question-title:focus, .constitution-question-title:focus-visible { outline: none; }`，写在原规则之后。
   其他元素的焦点环不受影响，也不移除焦点转移本身，读屏仍会朗读新题干。

## 检查（机械约束）

- 单测：九质计数（含一题属于多个维度、维度全部答完显示 ✓、当前维度高亮）；选项圆点数与选项值一致；先天一栏的三种状态（无出生资料、单一候选、多候选）。
- 浏览器：按数字键作答后，`h3.constitution-question-title` 获得焦点，其 `outline-style` 计算值为 `none`；按 Tab 到选项上时，焦点环仍然可见。
- 浏览器：题头内不出现进度数字与“体质量表”字样；`axe` 零违规，题头对比度 ≥4.5:1。

## 不做

不改结果页（F5）、计分、题目顺序、性别切换的确认逻辑和 D2 控件；不改 Service/Domain/Contracts/Client。

## 验收标准

- 作答页结构与参考稿一致。
- 黑框消失，键盘焦点环保留。
- 全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
