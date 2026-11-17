# C3 当下运气默认态 + 原文与释义下钻

## 目标

按原型画板 ① ② 重做 `/yunqi/current`，并新增原文与释义下钻页。

## 必读

- 原型画板 ①「当下 · 默认态」与 ②「原文与释义」
- 设计组件：InfoCard、RelationChip、ElementDot、QuoteBlock、Button
- `src/features/yunqi/components/CurrentYunQiPage.tsx`、`CurrentYunQiView.tsx`、`LearningPanels.tsx`、`SixQiTimeline*.tsx`
- `src/features/yunqi/presentation/map-learning.ts`、`map-current-yunqi.ts`、`view-model.ts`
- `rules/LEARNING_RULES_V1.md`、`rules/CLASSICAL_READING_V1_1.md`（只读，理解关系与原文字段）

## 要求

1. **全年卡**：眉标“全年 · {年}”+ 右侧交运时刻 meta；干支 `display-xl`；年运说明；三栏（岁运 / 司天 / 在泉）带五行圆点；下沉提示块：年度关系标签 + 白话说明。
2. **此刻卡**：眉标“此刻 · {API 日期}”+“北京时间 UTC+08”；六步进度条（6 段，已过 `accent-muted`、当前 `accent`，`role="img"` 与完整 `aria-label`）+ 步序刻度；阶段名 `title`；节气区间（只用 API 时间，**不显示“还有 N 天”**）；主气/客气 + 关系标签 + 说明；当步运：主运/客运 + 关系标签 + 说明。
3. **“这些关系怎么读？”**：`details` 折叠，内容来自 API 说明或现有教学文案，不新增规则解释。
4. **原文摘句卡**：一条当下阶段原文摘句（`quote-sm`）+ 出处 +“原文与释义 ›”入口，链接到下钻页。
5. **原文与释义下钻页**（新路由，例如 `/yunqi/current/classics`）：30px 分段“全年 / 当下阶段”；每条原文用 QuoteBlock（原文、阅读释义、出处、长段“展开全段”）；“正在此段”标识当下阶段。更新路由表文档。
6. **关系语气与五行映射**：在 presentation mapper 中加穷举映射：API 关系值 → favorable / adverse / neutral（相合：顺、从、相得、顺化、相生；相违：逆、不和、天刑、小逆、相克；中性：同五行、天符、同属等），六气/五运 → 五行。依据合同枚举或 API 字段，不从自由文本推断；未知值映射为 neutral 并有测试。组件只接收映射结果。
7. **其余阶段**：六步与五步运全表放在下钻或折叠中，默认视图只有全年 + 此刻两张卡和原文入口（工作站高度 ≥ 900 时无需滚动即见两张卡）。
8. 年度分析与指定时点的入口：在全年卡或页脚区放文字链接“年度详情 ›”“指定时点 ›”，进入 C2 的下钻框架。
9. 收起态胶囊条补齐当步客气与关系标签。
10. 改写当前页相关单测、`learning.flows`、`ux-walkthrough`、`workbench.flows` 中针对当前页的用例与 visual 用例（选择器改为新结构；保持断言强度：真实 Service、时间显示、原文出处可达、键盘可达）。

11. `QuoteBlock` 会自动加中文引号；接入 API 原文前确认原文不自带引号，避免重复。“文献线索，非个体发病预测”说明每屏放一次（卡片末尾或页脚），不要每条引文重复。

12. `InfoCard` 的链接目前是原生 `<a href>`；应用内跳转须走 React Router（不整页刷新），可为 `InfoCard` 增加 `to` 并用 `Link`，保持 C1 的可访问名称与伸展点击区。

13. C2 的 `features/yunqi/presentation/panel-summary.ts` 有一份按 API 展示文案 `label` 的局部语气表；本卡的穷举关系映射成为唯一来源，胶囊条改用它并删除局部表。
14. 浏览器用例中“年度分析”入口目前改为直接访问 URL（C2 过渡）；本卡加上“年度详情 ›”“指定时点 ›”界面入口后，把用例恢复为点击进入。

## 不做

不改动 API、规则、教学文案版本；不做出生对照与量表。

## 验收标准

- 默认视图与画板 ① 结构一致；原文页与画板 ② 一致；差异须在报告中说明理由。
- 所有业务时间来自 API `localTime`；无倒计时；无红色或风险视觉。
- 关系语气、五行映射穷举且有测试。
- 测试全绿（含浏览器）。

## 检查

同 C2。
