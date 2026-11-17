# D4 评审 1（Claude）

结论：返工。关系说明、“更多”列表、原文页对齐与下沉声明、出处链统一均符合卡片；声明仍固定在阅读区外，`toBeInViewport` 断言未放宽。
评审方 `pnpm test:browser`：194 通过、1 失败。另有一处偏离设计需改回。

## 要求

1. **焦点环**（`ux-walkthrough.flows.spec.mjs:104` 失败）：`.current-more__row`（`summary`）键盘聚焦时计算 `outline-width` 为 3px，规范为 2px。
   找出覆盖来源（全局 `summary`/`details` 规则或特异性冲突）并修正，使四行（展开类与链接类）焦点环一致为 2px solid、偏移 2px。不改测试。
2. **收起态胶囊尺寸**：报告称在 400×64 视口中把胶囊缩为 384×48、阴影改用 `shadow-segment`。这违反设计（`1-layout.md`：`pill-height` 64、宽 400、`shadow-float`）。
   改为：胶囊本体保持 400×`--pill-height`、`shadow-float`；收起态窗口（宿主窗口）比胶囊四周各大 8px，即 416 × 80。
   - `playwright.config.mjs` 的 `collapsed-pill` 项目改为 416×80；`panel-pill.visual.spec.mjs` 断言胶囊 400×64、四周距视口 ≥ 8px、阴影不被裁切（阴影外扩在视口内或说明测量方法）。
   - 同步 `tests/browser/README.md` 矩阵与 `docs/agents/workbench.md`/`docs/design/README.md` 中关于收起态窗口尺寸的描述（如有）：注明“宿主窗口 416×80 = 胶囊 400×64 + 8px 外边距”，留给 Tauri 阶段使用。
   - 删除为 64 高视口所做的尺寸适配分支（“较高视口仍保持 64px”这类条件逻辑不应存在）。
3. `D4-validation.md` 是实现方证据，移到 `docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-validation.md`，`reviews/` 只放评审结论。

完成后按原结构报告。
