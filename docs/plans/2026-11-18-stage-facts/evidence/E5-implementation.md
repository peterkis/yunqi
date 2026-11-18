1. **完成内容**

   | 验收项 | 状态与结果 | 文件 |
   | --- | --- | --- |
   | 令牌 | DONE：浅/深 `shadow-pill`、424×88 窗口令牌同步；`shadow-float` 改为插件内浮动弹层用途。 | `tokens.css`、`tokens.json` |
   | 收起态 | DONE：胶囊保持 400×64，边距左/右12、上10、下14；普通及焦点态使用新阴影；视口、主题根、html/body 收起时透明。开发宿主 body 原有底色已覆盖。 | `panel-shell.css` |
   | 展开态 | DONE：左缘 1px 内阴影细线，保留 `shadow-dock` 和 16px 安全边距。 | `panel-shell.css` |
   | 文档 | DONE：宿主契约表、⑥⑦画板、Tauri 排期及设计/指引/验收说明同步。 | 下列设计、指引及浏览器说明文件 |
   | 浏览器验收 | PARTIAL：424×88、精确位置、四向 3σ clearance ≥0、透明背景与恢复、展开边距断言已补齐；发现数量仍为217，真实浏览器未运行。 | `playwright.config.mjs`、下列浏览器断言文件 |
   | 裸值治理 | DONE：新增尺寸、边距和阴影均通过令牌引用，原治理机制及覆盖率阈值保持。 | 两份 CSS 与令牌文件 |

2. **修改文件清单**

   共13个已有文件及1个新增证据文件：

   - CSS：`apps/yunqi-workbench/src/styles/panel-shell.css`、`apps/yunqi-workbench/src/styles/tokens.css`。
   - 设计：`docs/design/README.md`、`docs/design/design-system/1-layout.md`、`docs/design/design-system/tokens.json`。
   - 指引：`docs/agents/workbench.md`、`docs/agents/verification.md`。
   - 浏览器配置与说明：`playwright.config.mjs`、`tests/browser/README.md`。
   - 浏览器断言：`tests/browser/consistency-helpers.mjs`、`tests/browser/panel-pill.visual.spec.mjs`、`tests/browser/panel-shell.flows.spec.mjs`、`tests/browser/craft.flows.spec.mjs`。
   - 证据：[E5-implementation.md](/Users/petervans/Projects/YunQi/docs/plans/2026-11-18-stage-facts/evidence/E5-implementation.md)。

   原有未跟踪任务卡、参考补丁与原型哈希均未变；未提交、推送或切换分支。

3. **检查结果**

   | 命令 | 结果 | 退出码 / 说明 |
   | --- | --- | --- |
   | `pnpm build` | PASS | 0 |
   | `pnpm test` | PASS | 0；Workbench 420项通过 |
   | `pnpm typecheck` | PASS | 0 |
   | `pnpm test:coverage` | PASS | 0；Workbench 语句99.24%、分支98.04%、函数99.67%、行99.58% |
   | `pnpm test:project-guidance` | PASS | 0 |
   | `pnpm test:workbench-governance` | PASS | 0 |
   | `pnpm test:time-governance` | PASS | 0 |
   | `node --check <文件>`（逐文件） | PASS | 0；配置及19个浏览器模块，共20个文件 |
   | `pnpm exec playwright test --list` | PASS | 0；217项、12个文件 |
   | `git diff --check` | PASS | 0 |
   | `pnpm test:browser` | NOT_RUN | 无退出码；按 `_common.md`，沙箱无法启动 Chromium，交评审方运行 |

   基线：`feat/stage-facts` @ `d373bc4c8175a5c2dd09964f13bee63497c8511e`；Node `24.18.0`、pnpm `10.32.1`。13个已有文件均在允许范围内。
   源差异 SHA-256：`f0b5de3e7f375357214eb2b24ca26e27a7ebe81284b74089a09e0d48a9e251b7`（上述13个已有文件的 `git diff --binary`，不含本证据）。
   构建 CSS：`apps/yunqi-workbench/dist/assets/index-BRptMMNP.css`，SHA-256：`5b373879a4ca0cb5f3a242d06d25048668877f98f511f0392b4e0187babf9f37`；生产 CSS 排除 DEV 样式检查通过。

4. **与卡片/原始计划的差异及原因**

   按卡片实际提供的 `source/0002-standalone-sidebar-host-424x88.patch` 应用并补齐。额外覆盖开发宿主 body 底色及展开恢复，增强背景和安全边距断言；把补丁中的“已验收”改为准确的验收边界。功能范围符合 E5，Tauri 外壳另行排期。

5. **待决问题或风险**

   真实 Chromium 几何、阴影、主题截图和 axe 结果待评审方验证；原生透明窗口、AppBar、拖动及按显示器记忆位置仅形成宿主契约。
   计划 README 仍将 E4 列为“待用户/专家”，与当前 E4 提交状态不同；该文件不在 E5 修改范围，保留原样。

