# C2 评审 · 第 1 轮（2026-11-17）

结论：**返工**（2 项必改）。

## 独立验证（评审方本机）

`pnpm test:browser` FAIL 1：117 通过、16 失败，均为 `workbench.visual` 的 `annual-result` 与 `inquiry`，
在全部 8 个视口项目中稳定复现（非偶发）。

## 通过项

- 面板骨架、三段导航（仅活动项 `aria-current`）、下钻“返回 + 标题”、固定返回目标、路由标题与 `document.title`。
- 标题栏无任何患者身份，状态行“教学参考 · 本次会话不关联患者”；页脚声明正确。
- 收起为胶囊条时路由保持挂载，表单草稿不丢失；收起/展开焦点往返正确；状态不进入 URL 或存储。
- 旧 `AppShell`/`Navigation` 已删除；`expectPanelLayout` 断言骨架几何，断言强度合理。

## 必改

1. **文档整体出现纵向滚动**（`annual-result`，1440×1000 下 `documentElement.scrollHeight` 为 1046）。
   评审方实测：年度六步列表中 3 个 `.visually-hidden`（`position: absolute`）在面板内没有定位祖先，
   相对初始包含块定位，底边落在 1046px，撑高了文档。修复：让内容滚动容器 `.panel-shell__content`（及面板）成为包含块
   （`position: relative`），使绝对定位后代被约束在滚动区内；不要逐个修改 visually-hidden 用法。
   增加单测或浏览器断言覆盖“滚动区内的绝对定位元素不撑高文档”（例如在任一长内容页断言文档高度等于视口高度）。
2. **可滚动内容区不可通过键盘访问**（`inquiry`，axe `scrollable-region-focusable`，serious，目标 `#workbench-content`）。
   `<main tabIndex={-1}>` 内容溢出时，若内容里没有可聚焦元素（问诊规划页即如此），键盘用户无法滚动。
   修复：内容滚动区可被 Tab 聚焦（`tabIndex={0}`），并具备可访问名称（随当前路由标题）与可见焦点环；
   保留切换视图后把焦点移到内容区的行为与跳转链接。更新受影响单测；问诊页“无交互元素”的断言保持（`main` 自身不算后代）。
   axe 断言保持零违规，不加排除。

## 留给后续卡

- C3：`panel-summary.ts` 中关系语气按 API 展示文案 `label` 映射，且是 C2 局部表。C3 的穷举关系映射应成为唯一来源，
  胶囊条改用它；不要保留两份映射。
- C3/C6：年度分析、指定时点目前只能通过 URL 进入（按卡片约定）；C3/C6 必须补上界面入口并恢复浏览器用例中的点击进入路径。

# C2 评审 · 第 2 轮（2026-11-17）

结论：**通过**。`.panel-shell__content` 成为包含块并有年度长页面回归；内容滚动区 `tabIndex={0}`、名称随路由标题。

独立验证（评审方本机）：`pnpm test:browser` PASS（135 通过，含全部视口 axe 零违规）；Workbench 单测、类型、测试类型、
覆盖率，Workbench 治理、时间治理、项目指引，`git diff --check` 均退出码 0。
