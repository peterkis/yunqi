# D4 第 2 轮返工与验证（2026-11-17）

## 基线与结论

- 工作树 `.claude/worktrees/polish-d4`，分支 `feat/workbench-ui-polish-d4`，HEAD `4d8a312319935b1d66113d9d6f0dcbbc411c2162`。
- 在第一轮未提交改动上返工；未提交、未推送、未切分支、未改 Git 配置、运行时依赖、业务包、规则、契约或设计同步副本。
- 用户转述评审方第一轮浏览器结果：194 PASS、1 FAIL；失败为 summary 聚焦时 outline-width 3px。评审方退出码、trace 与完整 computed-style 快照未提供，此结果不是本轮执行结果。
- 第一轮实现证据已原字节从 `reviews/D4-validation.md` 迁到 [D4-validation.md](D4-validation.md)，SHA-256 `909e3ce4074f6f3d71342e7f217b6fdd85199cc77557e2145f23efdd8cc481c4`。其中第一轮尺寸选择和检查结果仅为历史记录；本轮尺寸以本文和当前代码为准。

## 三项返工

| 要求 | 状态 | 处理 |
| --- | --- | --- |
| 四行焦点环 | DONE（实现）/ PARTIAL（Chromium 复验） | 当前视图局部 `.current-more .current-more__row:focus` 明确设置 outline-width、style、color、offset，使用现有令牌实现 2px solid、偏移 2px。焦点浏览器测试及所有既有单测未改。 |
| 胶囊与宿主 | DONE（尺寸、令牌、文档）/ PARTIAL（完整阴影） | 本体固定 `panel-width` 400、`pill-height` 64，恢复 `shadow-float`；删除 min()/视口高度适配和 max-width 压缩。collapsed-pill 项目为 416×80，固定断言本体 400×64、圆标 44×44、四边至少 8px；400px 流程测试显式模拟宿主扩宽并恢复。 |
| 实现证据目录 | DONE | 原文件字节和哈希保持不变；本轮证据新增于 evidence/。reviews/ 仅剩既有 D1 两份评审结论。 |

同步文档：Workbench 约束、验证矩阵、设计目录本地说明和浏览器 README 均注明“宿主窗口 416×80 = 胶囊 400×64 + 四周各 8px 外边距”，窗口契约留给 Tauri 阶段，未实现 Tauri/宿主部署。

## 焦点诊断与证据限制

检查全部生产样式及第一轮构建 CSS，未发现把 summary/details 焦点环设置为 3px 的作者规则；原局部规则和全局规则都只覆盖 `:focus-visible`，且使用 outline 简写。原回归流程在点击导航后直接 `locator.focus()`，不能把这一操作等同于按 Tab 键。

[Selectors Level 4](https://drafts.csswg.org/selectors/#the-focus-visible-pseudo) 说明 `:focus` 始终匹配当前聚焦元素，而 `:focus-visible` 由浏览器启发式决定；[CSS UI](https://drafts.csswg.org/css-ui/#outline-width) 将 outline-width 初值定义为 medium。检查的 [Chromium 当前 UA 样式](https://raw.githubusercontent.com/chromium/chromium/main/third_party/blink/renderer/core/html/resources/html.css) 未给 summary 单设 3px。

据此，聚焦状态未命中作者 `:focus-visible`、环宽回退初值，是与评审现象一致的解释，而非已取得 Chromium trace 证明的唯一根因。修复将当前四行的所有聚焦状态明确覆盖为相同长属性（局部特异性也高于全局焦点规则），消除这一回退路径，不修改或放宽测试。

[CSS 探针](D4-focus-probe.mjs) 加载 main.tsx 的真实 CSS 导入，在最小 More DOM 上检查四行的实际聚焦计算样式；浅/深主题各四行。`--round-1` 回放前会校验重建的 current-yunqi.css 与本轮开始时 SHA-256 完全一致。

- 回放第一轮样式：FAIL，退出码 1；jsdom 返回 medium / none，后续聚焦项可见 `focusVisible: false`。
- 当前样式：PASS，退出码 0；8 次检查均为 2px / solid / 2px，包括 `focusVisible: false` 的状态。
- 最初临时探针同样失败；将变量替换为字面量的临时尝试仍失败，提示 jsdom 的简写计算限制。保留此探针限制，**不将 jsdom 的 medium 冒称为 Chromium 3px 的完整复现**。
- `tests/browser/ux-walkthrough.flows.spec.mjs` SHA-256 仍为 `67337c88947b7aa4d5100b0761f1bc0104ef19916e02a2c038e3d3f61109ca79`，与本轮开始时一致。

## 阴影测量口径与待决事项

按明确要求保留 416×80、400×64 和 shadow-float。窗口每边 8px 足以容纳本体和 2px 环宽＋2px 偏移，但不能容纳 `0 6px 20px` 的完整模糊尾部。本轮已向用户提出这一尺寸矛盾；未扩大已指定的宿主尺寸。

浏览器 helper 同时检查外层阴影的计算值等于 shadow-float，以及祖先 CSS 容器未设置会截断该阴影的 overflow；保留外扩范围诊断。模糊没有精确可见边缘，采用 sigma = blur / 2、3 sigma（即 1.5 × blur + spread）的保守估计。416×80 中本体位于 (8,8)，对应估计视口余量为左 -22、上 -16、右 -22、下 -28px。负数明确表示模糊尾部被视口截断；它们会随截图写入 pill-geometry，不伪装成非负或“完整阴影 PASS”。这是估计方法，不是本轮实际像素测量。

因此完整阴影与固定 416×80 两者尚不能同时宣称满足；是否扩大宿主，需要后续尺寸决定。实际截图和 axe 也等待评审方本机执行。

## 本轮检查

| 命令 | 状态 | 退出码 | 结果 |
| --- | --- | --- | --- |
| `node docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs --round-1` | FAIL（预期红灯） | 1 | 重建第一轮 CSS 哈希一致，CSS 探针失败；并非 Chromium 执行。 |
| `node docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs` | PASS | 0 | 浅/深各 4 行，共 8 次聚焦样式检查。 |
| `pnpm --filter @yunqi/workbench test` | PASS | 0 | 59 文件、362 单测通过；本轮未改既有单测。 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS | 0 | 生产类型通过。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS | 0 | 测试类型通过。 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS | 0 | 语句 99.24%（660/665），分支 97.93%（521/532），函数 99.63%（276/277），行 99.51%（613/616）；阈值和 exclude 未改。 |
| `pnpm --filter @yunqi/workbench build` | PASS | 0 | Vite 8.1.5，163 模块；CSS index-BOVCCNIf.css，JS index-DgyLgicF.js。 |
| `pnpm test:workbench-governance` | PASS | 0 | 293 检查及生产边界检查通过。 |
| `pnpm test:time-governance` | PASS | 0 | 12 检查及时间治理通过。 |
| `pnpm test:project-guidance` | PASS | 0 | 文档修改后先执行，15 检查及指引检查通过；记录落盘后复核见末尾。 |
| `pnpm exec playwright test --list` | PASS | 0 | 195 项、9 文件；发现不等于执行。 |
| `node --check <下列各文件>` | PASS | 每条 0 | 配置、三个胶囊浏览器文件、未改的焦点用例、CSS 探针逐条通过。 |
| `git diff --check` | PASS | 0 | 无空白错误。 |
| `pnpm test:browser` | NOT_RUN | — | 按卡片要求，本沙箱无法启动 Chromium，由评审方本机运行；本轮无截图、axe 或实际 CSS 几何验收。 |

语法检查文件：

- `playwright.config.mjs`
- `tests/browser/consistency-helpers.mjs`
- `tests/browser/panel-pill.visual.spec.mjs`
- `tests/browser/panel-shell.flows.spec.mjs`
- `tests/browser/ux-walkthrough.flows.spec.mjs`
- `docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs`

未启动 HTTP/WS 或浏览器进程，无自有服务清理事项；未运行整仓 CI/业务包测试。工程检查不替代专家冻结或临床验收。

## 本轮修改文件

- [apps/yunqi-workbench/src/styles/panel-shell.css](../../../../apps/yunqi-workbench/src/styles/panel-shell.css)
- [apps/yunqi-workbench/src/styles/views/current-yunqi.css](../../../../apps/yunqi-workbench/src/styles/views/current-yunqi.css)
- [docs/agents/verification.md](../../../../docs/agents/verification.md)
- [docs/agents/workbench.md](../../../../docs/agents/workbench.md)
- [docs/design/README.md](../../../../docs/design/README.md)
- [docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs](../../../../docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs)
- [docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-validation.md](../../../../docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-validation.md)
- [playwright.config.mjs](../../../../playwright.config.mjs)
- [tests/browser/README.md](../../../../tests/browser/README.md)
- [tests/browser/consistency-helpers.mjs](../../../../tests/browser/consistency-helpers.mjs)
- [tests/browser/panel-pill.visual.spec.mjs](../../../../tests/browser/panel-pill.visual.spec.mjs)
- [tests/browser/panel-shell.flows.spec.mjs](../../../../tests/browser/panel-shell.flows.spec.mjs)
- [docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-validation-round-2.md](D4-validation-round-2.md)

迁出旧路径（原字节迁移，不删除证据内容）：`docs/plans/2026-11-17-workbench-ui-polish/reviews/D4-validation.md`。

## 记录落盘后的核对

- `pnpm test:project-guidance`：PASS，退出码 0，15 检查和指引检查通过。
- `git diff --check`：PASS，退出码 0。
- 哈希、范围、原证据迁移和原测试不变检查：PASS，退出码 0；34 个文件哈希无漂移，当前累计 35 个未提交文件；本轮 13 个文件新增/修改/迁移。
- `ux-walkthrough.flows.spec.mjs` 及全部既有单测字节保持本轮开始时状态；HEAD、分支未变。

## 当前未提交文件哈希

第一轮未变文件与本轮增量合并列示；不计算本记录自身。下表是本轮源码/文档身份，第一轮证据中的旧哈希保持历史原样。

清单摘要 SHA-256（排序后的 path + NUL + sha256 + LF）：`9d20a1bac0d580eb3532876e4fba1de8b8fec2299207f428712f35dda0e62e73`。

| 文件 | SHA-256 |
| --- | --- |
| [apps/yunqi-workbench/src/app/App.test.tsx](../../../../apps/yunqi-workbench/src/app/App.test.tsx) | `d11293b1d81e027a72d79bb757802776d9c18607f1741702877907d47c09f89a` |
| [apps/yunqi-workbench/src/components/layout/PanelShell.test.tsx](../../../../apps/yunqi-workbench/src/components/layout/PanelShell.test.tsx) | `766b53fb37047991d2c6119222e9765a788c9a662fff8bce8d0a6663314be4e5` |
| [apps/yunqi-workbench/src/components/layout/PanelShell.tsx](../../../../apps/yunqi-workbench/src/components/layout/PanelShell.tsx) | `1d6f3f6e766842dc96de7db2ddaa9d1357f00018a962f60eeb0684b093fedd01` |
| [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthClassicsView.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthClassicsView.tsx) | `f5d1e975b42bb0b4801363d52d439f930527c3577e2d805f86e9b822032c5015` |
| [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx) | `3d8ea6d7132d4982e711df41e981ad290670655afa5fb582e5d88c278dcf5548` |
| [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx) | `34a4ed3add0b82e7c08569c903588acfc3fb872703f939f1c197ba17dad374f3` |
| [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.tsx) | `f4edfb2f4da9fd4ba6392cfcc20d9b01e48cbb48bfa568cb160bee337484d25c` |
| [apps/yunqi-workbench/src/features/yunqi/components/CurrentClassicsPage.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentClassicsPage.test.tsx) | `3c4e7c89923ee5b1c0b058309613a37d6cdff222b5b57d64eaa3b9e07acde9c0` |
| [apps/yunqi-workbench/src/features/yunqi/components/CurrentClassicsPage.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentClassicsPage.tsx) | `a996cefee472ed3b4c074676fd25f8b836796a8dfd715a59a941ab58ba4de0d3` |
| [apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.test.tsx) | `4d9b2a02c56e2240b3811b7d74575acdac7c7391339a3b8cbee75e214090c2a2` |
| [apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx) | `20e17eebd9a0e49d4a24fd46a50d3cf77f03e2b222d24e86cb7b4028b9361e35` |
| [apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiParts.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiParts.tsx) | `07f3aba6b491fecce5ce7dbba37cfb6b994c5486a01c74000f57164d88f69499` |
| [apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.test.tsx) | `43a83e00347213bd5bfdbd17723d02fe47ad02be9ab1e4651c4179024ce9acb2` |
| [apps/yunqi-workbench/src/features/yunqi/components/RelationSourceLinks.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/RelationSourceLinks.tsx) | `9e3c793fcfad76494ea376f97a3ab52fd6f7d92f7eb811e2f53fda39fb9cd7cd` |
| [apps/yunqi-workbench/src/main.tsx](../../../../apps/yunqi-workbench/src/main.tsx) | `ac863033c8e46d525434ea80e5ab794989c4af99dfcdd91b597c56fd09e20745` |
| [apps/yunqi-workbench/src/styles/panel-shell.css](../../../../apps/yunqi-workbench/src/styles/panel-shell.css) | `365c2a0fda42ce9e569c4b0a790f66dc1b20bbd9e67def0e2d12cfb6d16d73bc` |
| [apps/yunqi-workbench/src/styles/views/current-yunqi.css](../../../../apps/yunqi-workbench/src/styles/views/current-yunqi.css) | `433aa8241c91145be25b36c31648f36ad3c9e41711acf5b4a8dfb5c2d838adf1` |
| [apps/yunqi-workbench/src/styles/views/learning-reading.css](../../../../apps/yunqi-workbench/src/styles/views/learning-reading.css) | `878beeb5dc6ddc63086c4f12a335c08fe7cf9c38ffb23a25cc5126a01c66c939` |
| [apps/yunqi-workbench/src/test/learning-fixtures.ts](../../../../apps/yunqi-workbench/src/test/learning-fixtures.ts) | `c9ad02984a6d9db634e6b9cc4a2dd2be6c9566e40bd885740db69dfe558e88b0` |
| [docs/agents/verification.md](../../../../docs/agents/verification.md) | `7827eb91a1068344af7b58f5118da2c3e3fbc7d67ff01171d1691db688d9155c` |
| [docs/agents/workbench.md](../../../../docs/agents/workbench.md) | `e996ecf26a5493340419923eb34e761e54c2a018562c3f1aea0ff81baa26858b` |
| [docs/design/README.md](../../../../docs/design/README.md) | `9225a5f20510958ed7daa09cffaab9132b112e59d7eb2055edb71f90cf980588` |
| [docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs](../../../../docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-focus-probe.mjs) | `7a3636442a12a89dc07b679fc0db1abdbaf8dbd9bf20dcbcf6d635108e3b4d2e` |
| [docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-validation.md](../../../../docs/plans/2026-11-17-workbench-ui-polish/evidence/D4-validation.md) | `909e3ce4074f6f3d71342e7f217b6fdd85199cc77557e2145f23efdd8cc481c4` |
| [playwright.config.mjs](../../../../playwright.config.mjs) | `26fb10aeaa09d7bb20c343a214e9ac16964eb22abe90607b406e516c2c6773b3` |
| [tests/browser/README.md](../../../../tests/browser/README.md) | `39777c60d58aa9eb03f28967dfbf09a8bbb3ffcde66b30c673614c73dbffaeb6` |
| [tests/browser/birth-assessment.flows.spec.mjs](../../../../tests/browser/birth-assessment.flows.spec.mjs) | `a81ae0665707a5f6c6aa9e2741e0683a761e0798f24cd813982e5233db522ca6` |
| [tests/browser/consistency-helpers.mjs](../../../../tests/browser/consistency-helpers.mjs) | `8eac43ae4b49e6c37b1272923475ff0b2cfd08d198cdf0da0a3735fdad40c1f0` |
| [tests/browser/learning.flows.spec.mjs](../../../../tests/browser/learning.flows.spec.mjs) | `fb2d74570b53352fe729f5d9e2d176a3e3d0580bd7968fb9a956091a1596564c` |
| [tests/browser/panel-pill.visual.spec.mjs](../../../../tests/browser/panel-pill.visual.spec.mjs) | `4a156fd3af96937a5490b197cc6fc13a06fca574e3558f7bbf42d44d045d4964` |
| [tests/browser/panel-shell.flows.spec.mjs](../../../../tests/browser/panel-shell.flows.spec.mjs) | `78227a7fee5ee36a8c5342718ca4ada99371bd43173b575a26d9ccb3d0a7093f` |
| [tests/browser/ux-walkthrough.flows.spec.mjs](../../../../tests/browser/ux-walkthrough.flows.spec.mjs) | `67337c88947b7aa4d5100b0761f1bc0104ef19916e02a2c038e3d3f61109ca79` |
| [tests/browser/workbench.flows.spec.mjs](../../../../tests/browser/workbench.flows.spec.mjs) | `67c10a183673dae51256fdd85a507c79525c856fa616cacefc68e9544c2ddc53` |
| [tests/browser/workbench.visual.spec.mjs](../../../../tests/browser/workbench.visual.spec.mjs) | `d86a7221a3e71194eed93f3b092c180e287cd440505567aa5e8e925505c083ad` |
