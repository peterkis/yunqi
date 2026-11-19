# M1-e 第 4 项：路由私有接口（兜底方案，2026-11-19）

- 结论：不迁移。React Router 7.18.1 的 `<BrowserRouter>` 不处理 `navigate(..., { viewTransition })` 与 `<Link viewTransition>`，原生视图过渡只在数据路由（`createBrowserRouter` + `RouterProvider`）中生效（评审方核对已安装包源码）。迁移涉及路由入口、全部页内跳转与测试包装，用户决定按卡片兜底方案执行。
- 实现：保留 `apps/yunqi-workbench/src/app/PanelNavigation.tsx` 对 `UNSAFE_NavigationContext` 的拦截，产品代码不变；新增守护单测 `apps/yunqi-workbench/src/app/PanelNavigation.router-guard.test.tsx`（Codex 编写）：
  - 导出 `UNSAFE_NavigationContext`，`navigator.push` / `replace` 为函数；
  - 普通 `<Link>` 与 `useNavigate()` 在一级 tab 间跳转（push / replace，前进 / 后退）经过 PanelNavigation，区内跳转不触发；
  - 已安装 `react-router` 与 `react-router-dom` 版本为 7.18.1。
  失败信息均指向 `PanelNavigation.tsx` 与 M1-e 卡第 4 项。
- 变异核对（评审方）：临时让 PanelNavigation 直接返回 children（模拟上下文不再被使用），守护测试 8 项失败；恢复后 15 项全部通过。
- 检查：`pnpm build`、`pnpm typecheck`、`pnpm test`、`pnpm test:coverage`、`pnpm test:workbench-governance` 通过；本项无产品改动，浏览器沿用 `fix/motion-polish` 全量结果（438 passed）。
