# F2 原文与释义：K01 分层卡

## 目标

按[参考稿 02](../reference/02-classics.html)把原文页的三层信息拉开：当前段一眼可辨，原文、释义、出处三者靠字体、底色、标签区分，不再只靠一条虚线。

## 必读

- 参考稿 `reference/02-classics.html`
- `features/yunqi/components/CurrentClassicsPage.tsx`、`CurrentClassicsView.tsx`、`features/yunqi/birth/components/BirthClassicsView.tsx`、`RelationSourceLinks.tsx`
- `features/yunqi/presentation/map-learning.ts`、`map-drilldown.ts`
- `styles/views/learning-reading.css`、`drilldown.css`
- `tests/browser/learning.flows.spec.mjs`、`workbench.visual.spec.mjs`

## 要求

1. **当前段卡片**：
   - 1px `accent` 描边，`radius-lg`。
   - 卡头条用 `accent-subtle` 底，左侧写段名（如“少阴之政 · 子午之纪 · 五之气”）。
   - 卡头右侧放实色徽标“● 正在此段”：`accent` 底、`accent-on` 字、`radius-full`、22px 高。
2. **非当前段卡片**：`border-default` 描边，无卡头色条；徽标为中性标签，全年段写“全年适用”。
3. **原文**：
   - 上方放“原 文”小标签：`surface-sunken` 底，`radius-xs`，字距 0.06em。
   - 原文放在 `surface-page` 底的块内，`radius-md`，内距 14/16，左侧留 34px 放大号开引号。开引号用宋体 34px、`accent-muted`、`aria-hidden`。
   - 正文宋体 16/1.9/500。原文首尾不再另加引号字符。
4. **释义**：“释 义”小标签用 `accent-subtle` 底、`accent` 字；正文黑体 13/1.75、`ink-secondary`、白底；与原文块间距 16。
5. **出处**：独立一行，上方 1px `border-subtle`；左侧 `meta` 两行（书名篇章 / 节次），右侧“出处 ›”文字链接，指向现有出处地址。原“查看原文出处”下划线链接删除。
6. **说明**：“原文为文献线索，非个体发病预测”从页面底部挪到最后一张卡之后，前置 14px 信息图标（内联 SVG，`aria-hidden`）。
7. “全年 / 当下阶段”分段控件、下钻头和页脚不变。先天对照里的原文阅读（`BirthClassicsView`）复用同一组件与样式；先天原文没有“正在此段”，统一用中性徽标。

## 检查（机械约束）

- 单测：当前段渲染实色徽标，非当前段渲染中性徽标；原文、释义、出处三块按顺序出现，各带标签；开引号 `aria-hidden`。
- 浏览器：`axe` 零违规；“正在此段”徽标、“原 文”与“释 义”两个标签的对比度断言均 ≥4.5:1（沿用 `visual-assertions.mjs`）。
- 浏览器：原文与释义的 `font-family` 计算值分别为宋体栈和黑体栈。

## 不做

不改原文内容、释义文案、出处数据、路由；不改当下页的原文入口卡（F1 保留原样）。

## 验收标准

- 当前段与非当前段在截图中一眼可分。
- 原文、释义、出处三层分明，有截图为证。
- 全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
