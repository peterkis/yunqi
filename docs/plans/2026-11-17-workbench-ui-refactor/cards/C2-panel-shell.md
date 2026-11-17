# C2 面板骨架、分段导航、下钻框架、收起态与路由

## 目标

用 400px 侧栏面板替换现有 `AppShell` 侧边导航，建立所有视图共用的骨架。

## 必读

- `docs/design/design-system/1-layout.md`（面板骨架、z 轴）、`components/PanelHeader`、`components/SegmentedNav`、`components/Button`
- 原型画板 ①、⑥（`docs/design/prototypes/`，浏览器打开）
- `src/app/*`、`src/components/layout/*`、`src/providers/ThemeProvider.tsx`、`docs/agents/workbench.md` 路由表
- `tests/browser/*.flows.spec.mjs`、`workbench.visual.spec.mjs`、`fixtures.mjs`

## 要求

1. **面板骨架** `PanelShell`：宽 `--panel-width`，高度随视口，最小 `--panel-min-height`；自上而下：标题栏 52、分段导航（或下钻标题）、唯一滚动的内容区、可选操作区、页脚 36。浏览器中面板停靠视口右侧（`shadow-dock`），左侧空白区用 `surface-sunken` 以外的中性底即可，不模拟工作站内容。
2. **标题栏**：品牌标 + “运气通”标题 + 状态行（例如“教学参考 · 本次会话不关联患者”）；右侧图标按钮：主题切换（保留现有 `aria-label` 语义“切换至深色/浅色主题”）与“收起为胶囊条”。不显示患者姓名、性别、年龄、就诊号、HIS 状态。
3. **分段导航**：当下运气 `/yunqi/current`、先天对照 `/yunqi/birth`、体质量表 `/yunqi/constitution`。
4. **下钻框架**：下钻页把分段导航换成“‹ 返回 + 标题/副标题”，标题栏高度不变；返回目标由路由定义，不依赖浏览器历史是否存在。
5. **路由**：保留现有全部路径与行为（含 `/` 重定向、年份校验、未找到页）。年度分析、指定时点作为下钻页（入口在 C3/C6 放置；本卡先让这些路由在新骨架中以下钻形式渲染现有内容）。问诊规划保留为路由，不出现在分段导航。路由标题与 `aria-current` 正确。
6. **收起态**：标题栏“收起”把面板切换为 400 × 64 胶囊条（`radius-full`、`shadow-float`），显示干支、年运三要素、当步客气与一个关系标签（数据来自当前视图已有的 ViewModel；本卡可先用当前年度摘要已有字段，缺失字段留到 C3）；点击整条展开，键盘可达，焦点回到展开按钮。收起状态为页面本地状态，不写 URL 或浏览器存储。
7. **页脚**：一行 `meta` 文案：“五步运为教学口径 · 待专家确认 · 辅助参考，不作诊断依据”。
8. **焦点与可访问性**：保留跳转到主内容的能力（可改为面板内的视觉隐藏链接）；切换分段后焦点到内容区；焦点环 2px `focus-ring` 偏移 2px。
9. 删除不再使用的旧 `AppShell`/`Navigation` 结构及其 demo 样式；保留其他页面仍在用的样式。
10. 同步改写受影响的单测与浏览器用例（导航、跳转链接、主题切换、未找到页）；更新 `docs/agents/workbench.md` 的导航表和 `apps/yunqi-workbench/README.md` 路由说明。

## 不做

不重做各视图内部内容（C3–C6）；不实现宿主窗口停靠或真实窗口尺寸变化（Tauri 阶段）。

## 验收标准

- 1440 × 900 与 400 × 860 视口下面板结构符合骨架表，内容区单独滚动，无横向滚动。
- 三段导航可用，`aria-current` 正确；下钻页显示返回 + 标题。
- 收起/展开可用，键盘可达，状态不进入 URL 或存储。
- 所有现有路由仍可访问，测试全绿（含浏览器）。

## 检查

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:coverage`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`
- `pnpm test:browser`
