# C7 浏览器验收矩阵迁移、demo 样式清理、文档收口

## 目标

完成验收体系向新设计的迁移，移除 demo 残留。

## 必读

- `tests/browser/README.md`「UI refactor migration」表、`playwright.config.mjs`、`tests/browser/*.spec.mjs`
- `docs/agents/verification.md`「UI重构期间的门禁」
- `apps/yunqi-workbench/src/styles/global.css`

## 要求

1. **视觉项目矩阵**：替换为 panel 400 × 860 浅/深、panel 400 × 640（最小高度：内容滚动，标题栏与页脚固定）、collapsed pill 400 × 64、workstation 1366 × 900（面板停靠右侧）。删除 320–1440 响应式矩阵。
2. **视觉状态**：覆盖原型七个画板对应状态 + 下钻页（年度、指定时点、问诊规划、未找到）。
3. **布局断言**：工作站高度 ≥ 900 时全年与此刻两卡无需滚动可见；图标按钮 ≥ 32 × 32；量表选项与主按钮 ≥ 40 高；可聚焦元素有可见 2px 焦点环；400px 下无横向滚动；保留 axe WCAG 2.1 A/AA 扫描与外部请求拦截。
4. **demo 清理**：删除 `global.css` 中不再被引用的 demo 规则与变量（cinnabar、paper 等）、旧 `src/components/ui` 中不再使用的组件；确认无引用后再删。
5. **文档**：更新 `tests/browser/README.md`（覆盖表、矩阵、测试数量）、`docs/agents/verification.md` 与 `workbench.md` 中“重构期间”的过渡性描述改为现状、`apps/yunqi-workbench/README.md` 与根 `README.md` 的工作台能力描述。
6. 全量门禁通过。

7. 字号断言覆盖新矩阵的全部视觉状态；删除 demo 规则时确认无 5 档以外字号残留。

8. 视觉收口：年度卡三栏的值（如“土运 / 太过”）在 400px 下应单行，按设计“水运太过”式单值呈现。

9. 出生对照“查看出生与当前运气”是该视图唯一主操作，改为主按钮样式；全应用核对每个视图最多一个黛青实底按钮。

## 验收标准

- 新矩阵与断言落地，旧矩阵移除；测试数量与覆盖说明更新且可由结果复现。
- 无未使用的 demo 样式与组件。
- `pnpm test`、`pnpm typecheck`、`pnpm test:coverage`、`pnpm test:browser` 全绿。

## 检查

- `pnpm test`、`pnpm typecheck`、`pnpm test:coverage`、`pnpm schema:validate`、`pnpm contracts:check`
- `pnpm test:project-guidance`、`pnpm test:browser`
