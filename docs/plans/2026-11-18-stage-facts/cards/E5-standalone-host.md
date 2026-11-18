# E5 独立侧栏窗口宿主契约：收起态 424×88 透明窗口

## 依据与授权

- 用户 2026-11-18 确认：运气通是**独立侧边栏程序**，不嵌入门诊工作站页面；收起态采用 424×88 透明窗口与 `shadow-pill`。本卡只做 Web 层与设计/验收文档，**不实现 Tauri 外壳**。
- 参考实现：`source/0002-standalone-sidebar-host-424x88.patch`（应在 E4 之后可直接 `git apply`）。补丁是参考，以下要求优先。

## 允许修改

`apps/yunqi-workbench/src/styles/**`、`docs/design/README.md`、`docs/design/design-system/1-layout.md`、`docs/design/design-system/tokens.json`、
`docs/agents/workbench.md`、`docs/agents/verification.md`、`playwright.config.mjs`、`tests/browser/**`、本计划 `evidence/`。
不改 Domain、Service、Contracts、Client、React 组件逻辑；不动 `docs/design/prototypes/` 原型文件。

## 要求

1. 令牌：`shadow-pill`（浅 `0 2px 8px rgba(29,35,32,0.14)`，深 `0 2px 8px rgba(0,0,0,0.50)`）、`pill-window-width` 424px、`pill-window-height` 88px；tokens.json 与 tokens.css 两主题同步；`shadow-float` 改为“插件内浮动弹层”用途。
2. 收起态：外边距左右 12（`space-3`）、上 10（`space-2_5`）、下 14（`space-3_5`）；胶囊 400×64 不变、`shadow-pill`（含 focus-visible 组合）；宿主背景透明（`.panel-viewport--collapsed` 与收起态下 `.theme-root`）。核实 `html`/`body` 是否另有底色会在收起态露出；若有，同样在收起态下透明，并说明。
3. 展开面板：左缘 1px `border-default` 以 inset 阴影实现，不改变 16px 安全边距；`shadow-dock` 保留（仅浏览器宿主可见）。
4. 文档：补丁中 docs/design/README.md 的“独立侧栏窗口（宿主契约）”表、⑥⑦行、超出授权清单的 Tauri 条目更新；1-layout.md、workbench.md、verification.md、tests/browser/README.md 同步。workbench.md 是规模受限指引，保持精简并通过 `pnpm test:project-guidance`。
5. 浏览器验收：`collapsed-pill` 项目改为 424×88；`expectPillGeometry` 期望 `shadow-pill`；在 424×88 下阴影 3σ 包络的四向 viewport clearance 全部 ≥ 0；胶囊位置 x12/y10/right12/bottom14；`panel-shell.flows` 收起后宽度 `max(424, …)`。
   README 中测试数量如有变化需同步（当前 217）。
6. 不改 CSS 裸值治理：所有新值走令牌。

## 检查命令

`pnpm build`、`pnpm test`、`pnpm typecheck`、`pnpm test:coverage`、`pnpm test:project-guidance`、`pnpm test:workbench-governance`、`pnpm test:time-governance`；
浏览器 NOT_RUN（对改动的 spec/helper `node --check`）。
