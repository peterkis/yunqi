# F6 定稿收尾：说明折叠项、互参摘要、断行、深色核对

前置：PR #24（F1–F5）已合并。本卡只做排版收尾，不改契约、不改判定规则、不改 DTO。

通用约束沿用 [`_common.md`](_common.md)：UI 不计算领域规则；新增样式只用 tokens；推送与 PR 需用户同意。

## 背景（PR #24 验收时发现）

1. 体质量表页与结果页底部，“计算说明与版本”和“量表来源与适用说明”并排在同一行，但上下错开约 5px。结果页还另有“本次量表版本”，和前两项内容重复。
2. 结果页“与运气互参”的“体质”格在兼夹 7 种时折成 4 行，把三格一起撑高。
3. 带“·”的摘要在词中间断行：量表页“当下”栏断成“客气少阳 / 相火”，互参“当下”格断成“客气少阳相 / 火”。
4. 深色模式未逐页人工核对（PR #24 验收时只核对了浅色）。

## 必读

- `features/constitution/components/ConstitutionForm.tsx`（`.constitution-notes` 区）
- `features/constitution/components/ConstitutionContext.tsx`（`ConstitutionContextDetails`、当下 / 先天摘要行）
- `features/constitution/components/ConstitutionResults.tsx`（互参卡、“判定说明与边界”“本次量表版本”）
- `features/constitution/presentation/map-constitution.ts`（`referenceSummary`、`summary`、`guestQiSummary`）
- `components/design/InlineText.tsx`、`ElementDot`
- `styles/views/constitution.css`（第 40–64、116、158–170 行附近）
- `tests/browser/constitution-actions.flows.spec.mjs`、`workbench.visual.spec.mjs`

## 要求

### 1. 说明折叠项统一为一列

- 原因：`.constitution-notes` 用 `flex-wrap` 把多个 `<details>` 排在一行。其中 `.constitution-source summary` 有 `padding-block: var(--space-1)`，`.constitution-time-details > summary` 没有，所以两者基线错开。
- 布局：`.constitution-notes` 改为纵向一列（`display: grid; gap: 0`）。
- 样式：所有说明折叠项共用一套 summary 样式，例如新增公共类 `.constitution-disclosure`，取代分别给 `.constitution-source` 和 `.constitution-time-details` 写的 summary 规则：
  - 高度 `min-height: var(--segment-height)`；
  - 布局 `display: flex; align-items: center`；
  - 字色 `--ink-secondary`、字号 `--ts-small`；
  - 相邻两项之间加 hairline 分隔（`border-top: var(--constitution-hairline) solid var(--border-subtle)`），视觉上向“当下运气 · 更多”列表看齐，但保持 small 字号。
- 结果页顺序固定为：“判定说明与边界” → “量表来源与适用说明” → “计算说明与版本”。
- 去掉结果页单独的“本次量表版本”折叠项，内容并入“量表来源与适用说明”：有结果时，该折叠项第一行显示 `sexLabel · questionnaireId · version`；没有结果时，保持现在的“标题 · 版本”。不新增字段，只调整 mapper 已有字段的位置。

### 2. 互参“体质”格摘要收短

- 改动位置：在 `map-constitution.ts` 里调整 `referenceSummary`。这是展示层映射，只对 mapper 已有的判定状态计数，不比较分数。
  - “是”的体质 ≤2 个：照旧列出简称，如“阳虚、痰湿”。
  - “是”的体质 ≥3 个：写成“偏颇质兼夹 · N 项”。完整名单已经在判定卡的兼夹标签里，这里不重复。
  - 有“倾向”时，在后面另起一行写“倾向 · <简称>”；倾向超过 2 个时，同样写成“倾向 · N 项”。
  - 平和质 / 基本是平和质：照旧。
- 辅助技术：互参卡这一格的 `dd` 加 `aria-label`，读出完整名单，让读屏用户不丢信息。
- 验收：兼夹 7 种时，“体质”格不超过 2 行，三格等高。

### 3. 按“·”分段，段内不断行

- 新增组件：在 `components/design/` 新增 `SegmentedText`（或给 `InlineText` 加 `segments` 模式）：
  - 按 `' · '` 切分；
  - 每段包在 `<span class="ds-seg">` 里，`white-space: nowrap`；
  - 段与段之间保留现有窄空格分隔点，换行只发生在分隔点处。
- 使用位置：
  - 量表页合并卡“当下”行（`ConstitutionContext.tsx` 第 14 行）；
  - 结果页互参“当下”“先天”格；
  - `ElementDot` 的 `label`：让它接受这个组件，或在内部用它渲染。
- CSS：去掉 `.constitution-reference-rows dd` 的 `overflow-wrap: anywhere`，改成 `overflow-wrap: break-word`。如果单段本身比容器还宽（极窄窗口），允许段内断行兜底，所以 `.ds-seg` 要配 `max-width: 100%`。
- 范围：其余页面已有的 `InlineText` 用法不强制替换。但当下运气页“全年 · 2026”、先天对照页摘要行如果有同类断行，一并换用新组件。

### 4. 深色模式逐页核对

- 补截图：`workbench.visual.spec.mjs` 补齐深色截图，通过应用内主题切换按钮进入深色，不依赖系统偏好。覆盖：
  - 当下运气；
  - 原文与释义（当下阶段）；
  - 先天对照（1980-03-12 提交后）；
  - 体质量表答题中；
  - 体质结果；
  - 收起态胶囊。
- 人工核对重点：
  - 年轮图内外环与图例对比度；
  - 黛青题头在深色下的字色（`accent-on`）；
  - 程度圆点的空心 / 实心可辨；
  - 结果条形 primary / secondary / neutral 三色可辨；
  - “不和”和关系标签的 adverse / favorable 底色；
  - 胶囊阴影在深色下不发灰。
- 处理方式：发现问题只改 `tokens.json`，再用 `build_css` 同步到 `tokens.css` 的深色值，不在组件里写死颜色。

## 检查（机械约束）

- 单测：
  - `map-constitution.test.ts` 覆盖 `referenceSummary` 的 0 / 1 / 2 / 3+ 个“是”、有无倾向、平和质几种情形；
  - `SegmentedText` 的切分、无分隔符、首尾空白。
- 浏览器：
  - 量表页与结果页的说明折叠项：各 summary 左边缘 x 相同（±1px），纵向依次排列，没有任何两项处在同一行。
  - 结果页不存在名为“本次量表版本”的 summary。
  - 兼夹 7 种的数据下，互参三格 `boundingBox.height` 相同（±1px），“体质”格文字行数 ≤2（用 `getClientRects` 或行高换算）。
  - 400 宽窗口下，“当下”摘要每个 `.ds-seg` 的 `getClientRects().length === 1`（段内不断行）。
  - 深色六张截图基线更新；`axe` 零违规（含深色）；无外部请求；5 档字号约束不变。
- 全量：`pnpm build`、`pnpm test`、`pnpm test:browser` 全绿。

## 不在本卡范围

- Tauri 宿主窗口实现（另排）。
- “主客同运”标签待专家确认，不改。
- 判定规则、契约 ID、教学规则版本不变。
