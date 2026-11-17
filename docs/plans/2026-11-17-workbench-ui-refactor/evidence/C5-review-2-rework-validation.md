# C5 评审第2轮小返工验证（2026-11-17）

## 基线与范围

- 主检出 `/Users/petervans/Projects/YunQi`，分支 `feat/workbench-ui-refactor`，HEAD `d7f076e`。
- 起始29个修改/未跟踪文件，本轮仅处理用户指定的第3、4项：焦点环自动重试断言、整组布局自动重试。
- 本轮只改3个测试文件并新增本记录；其他26个既有dirty文件的哈希保持不变，包含全部应用源码、样式、前轮评审及证据。
- 未运行 git add/commit/push、切换分支或修改Git配置；未修改任何运行时代码、设计令牌、规则、契约、依赖、覆盖率配置、治理脚本、Playwright整例retries配置或视口矩阵。
- 已重新读取 AGENTS.md、DESIGN.md、Workbench/验证指引、布局与硬约束；沿用前轮最小回归流程。

## 完成内容

| 必改 | 状态 | 改动 |
| --- | --- | --- |
| 3 焦点环 | DONE | 量表选项聚焦后改用 `toHaveCSS('outline-width', '2px')` 和 `toHaveCSS('outline-style', 'solid')` 自动重试，不再一次性读取 outlineWidth。2px/solid期望未改，没有新增固定等待。 |
| 4 面板布局 | DONE | `expectPanelLayout` 通过 `expect(async () => ...).toPass({ timeout: 10_000 })` 对每次完整测量执行原有全部13条期望；全部满足才返回该样本。10秒是现有 playwright.config.mjs 的断言预算，满足即返回，不是固定等待。原尺寸、位置、滚动、溢出期望与提示逐条相同，直接子元素选择器保留。 |
| 本轮浏览器验收 | PARTIAL | 脚本语法与发现通过；Chromium未启动，pnpm test:browser为NOT_RUN，由评审方运行。 |

## 问题观察与未确认根因

用户提供的第2轮独立验证为 **pnpm test:browser FAIL / 退出1：216通过、17失败**，本记录保留该结果，不将本地合成回归或用例发现冒称浏览器复跑。

- 其中16项，评审归因为一次性读取焦点环样式时取得过渡中值3px，与C1第2轮同类；本轮按要求改用自动重试的CSS断言，没有修改global.css或减少动态效果规则。
- 其中1项，评审观察到Vite开发态直接加载未找到页后，“标题可见”早于样式完全生效：即时测量有384px宽及876px文档高，等待后最终布局为400×860、body外边距为0。
- **该时序问题的具体原因，以及为何自本卡起出现，根因未确认。** 本轮未启动浏览器验证Vite机制，没有把“约默认8px外边距”推断为已确认根因，也没有把评审的800ms观察写成固定等待阈值。
- 本轮调整断言的就绪方式：在同一测量样本中等待现有全部期望满足。对持续不合格的尺寸仍报告失败；本轮不宣称应用布局或未知根因已经修复。

## 回归与失败保留

修复前先新增最小合成时序用例：首个样本宽384且文档高876；第二个样本宽恢复400、文档高仍为876；第三个样本全部满足。这样可验证重试涵盖整组期望，而非只等宽度。

- `node --test --test-name-pattern='retries the complete measurement' tests/browser-fixtures.test.mjs`：修复前 **FAIL / 退出1**，期望400、实得384；修复后 **PASS / 退出0**，1项。
- `node --test tests/browser-fixtures.test.mjs`：**PASS / 退出0**，4项；保留卡片页脚与面板页脚区分、持续错误footer=34失败、持续错误header=50失败，新增整组测量就绪回归。持续错误用例会耗尽自动重试预算，这是预期的拒绝路径。
- 夹具回归调用真实 `expectPanelLayout` 和真实DOM选择器，使用合成几何值与测量序列；不作为真实Vite加载、浏览器布局或未知根因的复现证据。
- 源码对比检查退出0：13条原布局期望及提示逐条相同；重试预算匹配现有断言配置；本轮没有新增固定等待。

## 检查结果

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `node --test tests/browser-fixtures.test.mjs` | 0 | PASS，4项夹具回归。 |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS，59文件/352项。 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS，语句98.52%（668/678）、分支97.32%（509/523）、函数97.90%（281/287）、行98.73%（622/630）；阈值和exclude未改。 |
| `pnpm test:workbench-governance` | 0 | PASS，293项及检查脚本。 |
| `pnpm test:time-governance` | 0 | PASS，12项及检查脚本。 |
| `pnpm test:project-guidance` | 0 | PASS，15项及文档预算、链接、命令和迁移完整性检查。 |
| `node --check tests/browser/fixtures.mjs` | 0 | PASS。 |
| `node --check tests/browser/workbench.visual.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser-fixtures.test.mjs` | 0 | PASS。 |
| `pnpm exec playwright test --list` | 0 | PASS，仅发现233项/8文件，不执行浏览器。 |
| `git diff --check` | 0 | PASS。 |
| `pnpm test:browser` | 无 | NOT_RUN：按用户要求由评审方本机运行；本轮没有浏览器截图、trace或axe结果。 |

## 差异与待决事项

- 本轮无产品视觉、交互或设计规范改动，只按第3、4项要求改写断言等待方式；第1轮已通过的选择器与空会话按钮行为保持。
- 待评审方复跑真实浏览器；不得将当前测试结果或用例发现记为233项浏览器通过。
- 开发态初始样式生效时序的具体根因仍未确认；没有扩大范围调查或顺手修改其他卡。

## 本轮文件与 SHA-256

下列3个测试文件为本轮被检查的最终版本；另新增本证据文件，不写入自身哈希。

| 文件 | SHA-256 |
| --- | --- |
| `tests/browser-fixtures.test.mjs` | `eccd96fc923a88fcbb07f12e131b4d2f4892abfce871c416dae999dfcd25b0df` |
| `tests/browser/fixtures.mjs` | `d7e57eaa96b4f955756ffd178d8399a99b5820759cc0cabf53a95067121b0fb6` |
| `tests/browser/workbench.visual.spec.mjs` | `e6f90ab5cdb9326d0544e3681c0f5fde8583c581a4b0022035721990f4b2fba6` |
