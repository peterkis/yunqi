# C1 设计基础：令牌、本地字体、主题、基础组件

## 目标

把设计系统落到 Workbench 的基础层，供后续卡片使用。本卡**不改动现有页面的外观和结构**。

## 必读

- `docs/design/design-system/README.md`、`1-layout.md`、`2-constraints.md`、`tokens.json`
- `docs/design/design-system/components/*/README.md` 与 `preview.html`
- `apps/yunqi-workbench/src/providers/ThemeProvider.tsx`、`src/main.tsx`、`index.html`、`src/styles/global.css`
- `scripts/check-yunqi-workbench-governance.mjs`（只读，了解约束）

## 要求

1. **令牌 CSS**：新建 `src/styles/tokens.css`，覆盖 `tokens.json` 中全部 color、spacing、radius、shadow、size、zIndex 令牌。
   - 变量名 `--<令牌名>`，令牌名中的 `.` 换成 `_`（`space-0.5` → `--space-0_5`）。
   - 浅色值放在 `:root, [data-theme="light"]`，深色值放在 `[data-theme="dark"]`；别名（如 `{surface-sunken}`）写成对应 `var()`。
   - 字体族：`--font-sans`、`--font-serif`，取 `tokens.json` 的 `type.families`。
   - 字号样式：每个 type style 生成 `--type-<name>-size`、`--type-<name>-line`、`--type-<name>-weight`，有字距的加 `--type-<name>-tracking`。
2. **漂移测试**：新增 Vitest 测试，读取 `docs/design/design-system/tokens.json` 与 `tokens.css`，断言每个令牌在两种主题下都有变量且值一致（别名按引用核对），并断言 CSS 中没有令牌文件以外的设计变量。改一个值测试必须失败。
3. **本地字体**：把 `docs/design/design-system/fonts/` 下两个 woff2 与 `OFL.txt` 复制到 `apps/yunqi-workbench/public/fonts/`；新建 `src/styles/fonts.css`，按设计 README 的 `@font-face`（字重 `400 700`、`font-display: swap`、同源相对路径）；`index.html` 只预加载黑体。禁止任何远程资源（治理检查会拦截）。
4. **样式入口**：`main.tsx` 在 `global.css` 之前引入 `fonts.css`、`tokens.css`。现有 demo 变量与页面外观保持不变。
5. **主题**：继续使用 `ThemeProvider` 的 `data-theme`，确认令牌随主题切换生效（单测覆盖）。
6. **基础组件**：在 `src/components/design/` 新建以下组件，严格按各自 README 的尺寸、令牌和可访问性要求：
   - `Button`：`variant` 为 primary / secondary / text / icon；icon 变体必须有 `aria-label`。
   - `ElementDot`：`element` 为 wood / fire / earth / metal / water，金为空心环；必须与可见文字一起使用（组件同时渲染标签文本）。
   - `RelationChip`：`tone` 为 favorable / adverse / neutral，`label` 文本必填，可选 `explanation` 说明句；不接受只有颜色没有字。
   - `InfoCard`：眉标（label + 可选 meta）、内容插槽、可选下沉提示块；`as="a"` 时整卡为链接。
   - `QuoteBlock`：原文、可选阅读释义（虚线分隔）、出处，可选“展开全段”（`details`）。
   - `SegmentedNav`：最多 3 段，使用 `NavLink` 与 `aria-current="page"`；含 30px 高变体。
   - `PanelHeader`：品牌标“运”、标题行与状态行（不含任何患者身份）、右侧图标按钮插槽；下钻变体为“返回 + 标题/副标题”。
   - `ScaleOption`：`role="radio"` + `aria-checked`，外层由调用方提供 `role="radiogroup"`；按键角标、主标签、程度说明。
   每个组件只用令牌变量；样式放在 `src/styles/design-components.css`（或按组件拆分），类名以 `ds-` 开头，避免影响 demo 样式。
7. 每个组件有单元测试：渲染、主要变体、可访问名称与角色、键盘可达。

## 不做

不改现有页面、路由、导航和 `global.css` 中的 demo 规则；不新增依赖。

## 验收标准

- tokens.css 与 tokens.json 完全一致，漂移测试有效（含一个反例思路说明）。
- 字体从 `/fonts/` 同源加载，`public/fonts/` 含两份字体与 OFL；无远程引用。
- 8 个组件存在，符合各自 README，测试通过。
- 现有页面外观与全部现有测试不受影响。

## 检查

- `pnpm --filter @yunqi/workbench test`
- `pnpm --filter @yunqi/workbench typecheck`
- `pnpm test:workbench-governance`
- `pnpm test:time-governance`
- `pnpm --filter @yunqi/workbench test:coverage`
