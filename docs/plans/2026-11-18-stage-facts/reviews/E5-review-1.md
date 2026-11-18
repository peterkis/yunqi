# E5 评审（第 1 轮）：通过

- 评审人：Claude；日期 2026-11-18；对象：Codex 实现（未提交工作区），参考补丁 `source/0002-…patch`。
- 结论：**通过**。无返工、无评审方修改。

## 核对

- 令牌：`shadow-pill`（浅/深）、`pill-window-width` 424、`pill-window-height` 88，tokens.json 与 tokens.css 两主题同步；`shadow-float` 改为插件内弹层用途。
- 收起态：胶囊 400×64，边距 12/10/12/14 全走令牌；普通与 focus-visible 均为 `shadow-pill`。`html`、`body`、`.theme-root`、视口在收起态透明（补丁只处理了 `.theme-root`，Codex 补了 DEV 宿主 body 底色），展开后恢复。
- 展开态：左缘 1px `border-default` 内阴影，不改 16px 安全边距；`shadow-dock` 保留。
- 文档：设计 README“独立侧栏窗口（宿主契约）”表与 ⑥⑦ 行、超授权清单的 Tauri 条目（契约已确认，外壳另行排期）、1-layout、workbench/verification 指引、浏览器 README 同步；Codex 把补丁中“Web 层已按此实现并验收”改成准确的验收边界。
- 浏览器断言：424×88 下 3σ 包络四向 clearance ≥ 0、胶囊精确位置、宿主背景透明、无裁切祖先。

## 评审方本机门禁

`pnpm test:browser` 217 项 PASS；截图 `collapsed-pill-light/dark` 目检：阴影尾迹完整落在窗口内、无直角外露。Codex 报告 build、test、typecheck、coverage、project-guidance、workbench-governance、time-governance PASS。
