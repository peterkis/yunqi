# C5 评审 · 第 1 轮（2026-11-17）

结论：**返工**（2 项必改）。

## 独立验证（评审方本机）

`pnpm test:browser` FAIL 1：185 通过、48 失败。48 项均为 `workbench.visual` 的 6 个量表状态 × 8 视口，同一断言：
`expectPanelLayout` 中 `footer.height` 期望 36、实得 34。

根因：本卡在量表卡片内新增 `<footer class="constitution-session-footer">`（语义正确），而 `fixtures.mjs` 用
`panel.querySelector('footer')` 取第一个 `footer`，量到的是卡片内页脚而非面板页脚。属测试选择器缺陷，不是布局缺陷。

## 通过项（截图核对）

- 作答屏符合画板 ④：GB/T 46939-2025 · 男性版 · 26 题、`1/26`、13×2 进度格、20 号宋体题干、作答提示、五级选项带按键角标、“上一题”。
- 当下摘要条、性别选择与切换说明、来源说明折叠。

## 必改

1. **夹具选择器**：`expectPanelLayout` 改为只量面板自身的结构（如 `:scope > footer` 或 `.panel-shell__footer`，标题栏同理），
   不改期望值；卡片内 `footer` 保留。
2. **空会话不显示“结束并销毁答卷”**：未作答、无结果时没有可销毁内容，按钮不应出现（入口屏截图中出现）。
   有答案或结果时才显示；保持该按钮为次按钮、唯一销毁入口，销毁语义与旧响应隔离不变。补单测与浏览器断言。

复跑后评审方将补看结果屏（画板 ⑤）截图。

# C5 评审 · 第 2 轮（2026-11-17）

结论：**小返工**（2 项）。第 1 轮 2 项已达成：夹具只量面板直接子元素；空会话不显示销毁按钮（入口截图核对）。
结果屏符合画板 ⑤：判定 30 号宋体、判定规则说明、九质转化分条形与 30/40 刻度。

独立验证：`pnpm test:browser` FAIL 1：216 通过、17 失败。

1. 16 项（出生内测评、量表作答两状态 × 8 视口）：本卡新增断言在聚焦选项后**一次性**读取 `getComputedStyle` 的 `outlineWidth`，
   读到 `3px`。与 C1 第 2 轮同一根因：demo `global.css` 的 reduced-motion 规则使过渡 0.01ms，读到过渡中值。
2. 1 项（`inquiry remains a no-query…`，`/yunqi/inquiry/patient` 等直接加载的未找到页）：`expectPanelLayout` 量得面板宽 384、文档高 876。
   评审方实测：直接加载后立即测量为 384×868（≈ 默认 8px body 外边距仍在），等待 800ms 后 html/body/#root/面板均为 400×860、外边距 0。
   结论：Vite 开发态下“标题可见”早于样式完全生效的时序问题，最终布局正确；具体为何自本卡起出现，**根因未确认**。

必改：
3. 焦点环断言改为自动重试的 `toHaveCSS('outline-width', '2px')` / `toHaveCSS('outline-style', 'solid')`，期望值不变、不加固定等待。
4. `expectPanelLayout` 改为在断言前用 `expect.poll`（或 `toPass`）等待测量结果稳定满足同一组期望，期望值全部不变、不加固定等待；
   在报告中写明该改动与上述未确认根因。

# C5 评审 · 第 3 轮（2026-11-17）

结论：**通过**。焦点环改为重试 `toHaveCSS`，`expectPanelLayout` 用 `toPass` 重试完整断言组，期望值均未变。
独立验证（评审方本机）：`pnpm test:browser` PASS（233 通过）；`pnpm test`、`typecheck`、`test:coverage`、Workbench 治理、时间治理、
项目指引、`git diff --check` 均退出码 0。未找到页直接加载时的样式时序根因仍未确认（最终布局正确）。

留给 C7：`tests/browser-fixtures.test.mjs` 未接入任何脚本（CI 不会运行），需接入根 `pnpm test` 或删除。
