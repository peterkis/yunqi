# C1 评审 · 第 1 轮（2026-11-17）

结论：**返工**（3 项必改），其余通过。

## 独立验证

| 检查 | 结果 |
| --- | --- |
| `pnpm test:browser`（本机 Chromium，Codex 沙箱无法启动浏览器） | FAIL 1：118 通过、2 失败（新增 `design-foundations.flows` 浅/深两例） |
| 字体字节 | `public/fonts/*.woff2` 与 `docs/design/design-system/fonts/` sha256 一致 |
| Codex 报告的单测、类型、治理、时间治理、覆盖率 | 采信其退出码记录；返工后由评审方复跑 |

## 通过项

- `tokens.css` 覆盖全部令牌，双主题、别名、字体族、字号变量齐全；漂移测试检查缺失/多余/重复，并实测过反例。
- 本地字体同源加载、仅黑体预加载、无远程引用；入口顺序正确，demo 页面未受影响（118 个既有浏览器用例通过）。
- 8 个组件结构与可访问性符合 README（NavLink 仅活动项 `aria-current`、ScaleOption radio 语义、图标按钮必有 `aria-label`）。
- 新增 `src/test/design-foundations.html` 测试夹具与浏览器用例：超出卡片但有价值，保留；不进入生产构建。

## 必改

1. **金的空心环渲染为 1px**：`ElementDot` 金用 `border: calc(var(--space-1_5) / 4)`，Chromium 把小于 2px 的边框宽度取整到 1px，浅/深两例浏览器用例失败。改为不受整像素取整影响的实现（例如 `box-shadow: inset 0 0 0 1.5px var(--element-metal-ring)`），并让浏览器断言检查实际生效的 1.5px 环，而不是放宽断言。
2. **用无关令牌拼算未定义尺寸**：`design-components.css` 中按钮/分段字号用 `(caption + body) / 2`、1px 线用 `space-0_5 / 2`、`line-height` 用 `(display-lg-line + label-line) / 2` 等。这样无法追溯来源。改为在文件顶部定义少量组件常量（如 `--ds-hairline: 1px`、`--ds-button-secondary-size: 13.5px`、`--ds-text-button-size: 13px`、`--ds-segment-size: 13px`），每个常量注释注明来源（组件 README 或 `1-layout.md` 原文数值）；与令牌等值的直接用令牌。删除所有“平均值/除法凑数”的 `calc()`；确实需要的几何计算（如分段内高 = 轨道高 − 2×内距）保留并注释。
3. **QuoteBlock 每条原文都硬编码声明**：设计要求“文献线索，非个体发病预测”与病候原文**同屏**出现，声明放卡片末尾或页脚、一句话说完，而不是每条引文重复。改为可选 prop（默认不渲染），由页面决定放置位置；更新单测。

## 留给后续卡

- C3：`QuoteBlock` 会自动加中文引号，接入 API 原文前确认原文不自带引号，避免重复。
- C5：`ScaleOption` 方向键会选中（点击）目标项；量表“选中后 160ms 自动进入下一题”时，方向键浏览会被误判为作答并跳题。C5 须让方向键只移动焦点、Space/Enter/数字键才作答，或给出同等安全的方案。

# C1 评审 · 第 2 轮（2026-11-17）

结论：**小返工**（1 项）。第 1 轮 3 项必改均已达成：金环为 inset 1.5px 且浏览器实测通过；组件常量逐项注明来源，仅剩 1 处注释过的几何计算；`QuoteBlock.notice` 改为可选。

独立验证：Workbench 单测、类型（含测试类型）、覆盖率、Workbench 治理、时间治理均 PASS（退出码 0）；
`pnpm test:browser` FAIL 1：118 通过、2 失败（`design-foundations.flows` 浅/深，`summary` 焦点环读到 `3px / 0px`，期望 `2px / 2px`）。

根因（评审方本机 Chromium 复现）：demo `global.css` 的 `@media (prefers-reduced-motion: reduce)` 对所有元素设置 `transition-duration: 0.01ms !important`；
浏览器验收以 `reducedMotion: 'reduce'` 运行，用例在 Tab 后立即一次性读取 `getComputedStyle`，读到过渡中的值。
不开 reduce 时立即为 `2px 2px`；开 reduce 时 500ms 后同样为 `2px 2px`。设计样式本身正确。

必改：
4. `design-foundations.flows.spec.mjs` 中焦点环断言改为自动重试的 `await expect(summary).toHaveCSS('outline-width', '2px')`、`toHaveCSS('outline-offset', '2px')`，
   颜色断言同样改为重试形式；不改期望值、不加固定等待、不改 demo 的 reduced-motion 规则（C7 清理时处理）。
   用例里其他“交互后立即读取计算样式”的地方按同一方式检查并修正。

# C1 评审 · 第 3 轮（2026-11-17）

结论：**小返工**（1 项）。第 4 项已达成：焦点环与主题样式改为重试断言，期望值未变。

独立验证：`pnpm test:browser` FAIL 1：118 通过、2 失败。焦点环断言已通过；用例继续执行到 axe 扫描，
暴露此前被前序失败掩盖的真实缺陷：`label-content-name-mismatch`（WCAG 2.5.3，serious），
目标 `<a class="ds-info-card" href="#scale" aria-labelledby="…">`。整卡链接的可访问名称只取眉标与“原文与释义”，
而链接内还有 meta 与正文可见文字；整张卡片（含引文块等块级内容）作为一个链接也不利于读屏。

必改：
5. `InfoCard` 可点变体改为：容器保持 `section`（以眉标为可访问名称），只有可见的“原文与释义 ›”文字是真实 `<a>`，
   其可访问名称即可见文字（箭头 `aria-hidden`）；用伸展点击区（链接 `::after` 覆盖卡片，卡片 `position: relative`）
   保持“整卡可点”，焦点环在链接/卡片上可见。删除 `as="a"` 整卡包裹与 `aria-labelledby` 拼接。
   更新单测（角色、名称、整卡点击导航、键盘 Tab 只停一次）与夹具；浏览器用例的 axe 断言保持为空违规，不加排除规则。

# C1 评审 · 第 4 轮（2026-11-17）

结论：**通过**。第 5 项已达成：`InfoCard` 为以眉标命名的 `section`，仅可见文字链接为 `<a>`，伸展点击区保持整卡可点。

独立验证（评审方本机）：`pnpm test:browser` PASS（120 通过，含 `design-foundations` 浅/深 axe 零违规）；
Workbench 单测、类型、测试类型、覆盖率、构建，Workbench 治理、时间治理，`git diff --check` 均退出码 0。
生产构建 `dist/` 含 `fonts/` 两份字体与 OFL，不含测试夹具页面。

留给 C3：`InfoCard` 链接是原生 `<a href>`；接入应用内路由时须走 React Router 导航（不整页刷新），可为组件增加 `to` 并使用 `Link`。
