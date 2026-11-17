# D4 本地验证记录（2026-11-17）

## 身份与范围

- 分支：`feat/workbench-ui-polish-d4`。
- 工作树：`.claude/worktrees/polish-d4`。
- HEAD：`4d8a312319935b1d66113d9d6f0dcbbc411c2162`；开始时工作区干净。
- 环境：Node `v24.18.0`，pnpm `10.32.1`。
- 未提交、未推送、未切换分支，未改 Git 配置；未改 Service、Domain、Contracts、Client、OpenAPI、规则与冻结文件、设计同步副本。
- 构建、单测和覆盖率对应下方 dirty 源码清单，不将 HEAD 单独作为构建来源证明。

## 完成状态

| 项目 | 状态 | 实现与边界 |
| --- | --- | --- |
| P1-6 关系说明 | DONE（实现） | 当下和先天关系出处复用 `RelationSourceLinks`；保留 API 书名号标题，整行链接，12px `ink-tertiary` 与 12px 内联外链图标；可访问名称包含“新窗口打开”；移除项目符号和关系块里的重复声明，页脚声明一次。API 交运口径继续在“其余阶段”的五步运全表内完整保留。 |
| P1-9 更多列表 | DONE（实现） | 卡片外四行按其余阶段、年度详情、指定时点、计算说明与版本排列；44px 局部令牌附 D4 来源；两项保持原生 details/summary，两项为 Link；SVG chevron、分隔线、焦点环。 |
| P1-10 原文页 | DONE（实现） | 阅读区用等量负 margin 抵消 4px 焦点安全内距，使卡片净边缘对齐 16px 面板安全线；声明保留在阅读滚动区外，改为和当下摘录卡一致的下沉提示块；两类原文出处链同步无常态下划线、hover/focus-visible 下划线，先天原文出处链同步。 |
| P1-11 胶囊 | DONE（实现） | 当前 ViewModel 干支用 44px accent/accent-on 宋体圆标；外留 8px。400×64 时胶囊本体适配为 384×48，较高视口仍为 64px 高；保留键盘恢复、会话、滚动和无补查行为。 |
| 截图、实际几何和全部浏览器门禁 | PARTIAL | 用例已同步，静态语法和发现通过；Chromium 无法在本沙箱启动，未运行浏览器、未生成本轮截图、未执行 axe，等待评审方本机运行。 |

## 检查结果

| 命令 | 状态 | 退出码 | 结果 |
| --- | --- | --- | --- |
| `pnpm --filter @yunqi/workbench test`（首轮） | FAIL | 1 | 360 通过、2 失败。新增测试错误地从 renderPage 返回值取 container，以及在多个原文出处中使用单元素查询；属于新增测试的查询错误，已修正，保留此失败记录。 |
| `pnpm --filter @yunqi/workbench test`（修正后） | PASS | 0 | 59 文件、362 单测通过。 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS | 0 | 生产源码类型通过。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS | 0 | 测试类型通过。 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS | 0 | 362 单测通过；语句 99.24%（660/665），分支 97.93%（521/532），函数 99.63%（276/277），行 99.51%（613/616）；未变更阈值或 exclude。 |
| `pnpm --filter @yunqi/workbench build` | PASS | 0 | Vite 8.1.5，163 模块；CSS `index-D7HWMWvX.css`，JS `index-OWyzoDTJ.js`。 |
| `pnpm test:workbench-governance` | PASS | 0 | 293 检查通过，生产边界检查通过。 |
| `pnpm test:time-governance` | PASS | 0 | 12 检查及固定时间治理通过。 |
| `pnpm test:project-guidance` | PASS | 0 | 15 检查及指引检查通过；新增本记录后另执行一次，结果见末尾。 |
| `node --check <下列每个浏览器文件>` | PASS | 每条 0 | 共 8 个文件，逐条运行。 |
| `pnpm exec playwright test --list` | PASS | 0 | 发现 9 文件、195 个配置用例；发现不代表执行通过。 |
| `git diff --check` | PASS | 0 | 无空白错误；新增本记录后另执行一次。 |
| `pnpm test:browser` | NOT_RUN | — | 按卡片约定，本沙箱无法启动 Chromium，由评审方本机运行。真实视口、截图、axe 和请求监控均未在本轮运行，不冒称 PASS。 |

逐条语法检查范围：

- `tests/browser/birth-assessment.flows.spec.mjs`
- `tests/browser/consistency-helpers.mjs`
- `tests/browser/learning.flows.spec.mjs`
- `tests/browser/panel-pill.visual.spec.mjs`
- `tests/browser/panel-shell.flows.spec.mjs`
- `tests/browser/ux-walkthrough.flows.spec.mjs`
- `tests/browser/workbench.flows.spec.mjs`
- `tests/browser/workbench.visual.spec.mjs`

没有启动浏览器或自有 HTTP/WS 服务，无服务清理事项。单测、治理断言、195 个参数化用例与临床/专家案例不是同一种样本。

## 设计选择与待决事项

- 声明选择固定在阅读滚动区外的方案，便于在长原文展开及滚动时始终同屏；保留原有 `toBeInViewport`，并增加 `ratio: 1` 的展开、滚动检查，未放宽旧断言。
- 两处下沉提示块共用 `surface-sunken` 背景和相同排版，保证放在页背景上也能看出提示块边界。
- 原型 64px 胶囊加上上下各 8px 不能装进 64px 视口，因此本体在该项目中缩至 48px。浮动阴影 `shadow-float` 的模糊范围也超出 8px，选用现有 `shadow-segment` 令牌，不引入裸阴影；浏览器用例同时检查外焦点环和阴影估计边界，最终画面待实机确认。
- 已按本地原型 ①②⑥⑦的源码核对结构，未取得本轮实际截图，不能声称已完成截图对照或视觉验收。
- 范围外观察：先天原文阅读区仍保留既有 `padding: var(--space-1)`（`birth.css`），该页本卡只同步出处链；未进行该页卡片对齐的实机测量或布局改动。
- 未运行仓库全量 CI/Service/Domain 等套件；本记录仅覆盖卡片列出的本地命令。工程检查不替代专家冻结或临床验收。

## 修改文件与源码哈希

以下 27 个实现/测试文件，加本记录，共 28 个文件。此表不计算本记录自身，避免自引用哈希。

清单摘要 SHA-256（按路径排序，对每行 `path + NUL + sha256 + LF` 求摘要）：`30e0d16c9f2bf62c001e315b44210cff0d6a674ba03d2ad68af66924da07705d`。

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
| [apps/yunqi-workbench/src/styles/panel-shell.css](../../../../apps/yunqi-workbench/src/styles/panel-shell.css) | `666f6c7dddd35446082b665e50e98eed9a330290221da5c8b38adfef3491b50b` |
| [apps/yunqi-workbench/src/styles/views/current-yunqi.css](../../../../apps/yunqi-workbench/src/styles/views/current-yunqi.css) | `5237308bd3d2795df8f88d2b6fd3e6d6fb438a7853754c9094056e290a06172d` |
| [apps/yunqi-workbench/src/styles/views/learning-reading.css](../../../../apps/yunqi-workbench/src/styles/views/learning-reading.css) | `878beeb5dc6ddc63086c4f12a335c08fe7cf9c38ffb23a25cc5126a01c66c939` |
| [apps/yunqi-workbench/src/test/learning-fixtures.ts](../../../../apps/yunqi-workbench/src/test/learning-fixtures.ts) | `c9ad02984a6d9db634e6b9cc4a2dd2be6c9566e40bd885740db69dfe558e88b0` |
| [tests/browser/birth-assessment.flows.spec.mjs](../../../../tests/browser/birth-assessment.flows.spec.mjs) | `a81ae0665707a5f6c6aa9e2741e0683a761e0798f24cd813982e5233db522ca6` |
| [tests/browser/consistency-helpers.mjs](../../../../tests/browser/consistency-helpers.mjs) | `eb1cf7754e72264654964ea5bb669eb5d4bf0f50b0ea268771fc7b28d12041d5` |
| [tests/browser/learning.flows.spec.mjs](../../../../tests/browser/learning.flows.spec.mjs) | `fb2d74570b53352fe729f5d9e2d176a3e3d0580bd7968fb9a956091a1596564c` |
| [tests/browser/panel-pill.visual.spec.mjs](../../../../tests/browser/panel-pill.visual.spec.mjs) | `2adb8710a68ea192fcdd75f7e51d91922d66f83049740c203cd48cc5cb056767` |
| [tests/browser/panel-shell.flows.spec.mjs](../../../../tests/browser/panel-shell.flows.spec.mjs) | `a78e07436df3d6e57d86de800075b2b454ba53937892298ff6ace0f3d2efd1b2` |
| [tests/browser/ux-walkthrough.flows.spec.mjs](../../../../tests/browser/ux-walkthrough.flows.spec.mjs) | `67337c88947b7aa4d5100b0761f1bc0104ef19916e02a2c038e3d3f61109ca79` |
| [tests/browser/workbench.flows.spec.mjs](../../../../tests/browser/workbench.flows.spec.mjs) | `67c10a183673dae51256fdd85a507c79525c856fa616cacefc68e9544c2ddc53` |
| [tests/browser/workbench.visual.spec.mjs](../../../../tests/browser/workbench.visual.spec.mjs) | `d86a7221a3e71194eed93f3b092c180e287cd440505567aa5e8e925505c083ad` |

本记录：[D4-validation.md](D4-validation.md)。

## 记录落盘后的核对

- `pnpm test:project-guidance`：PASS，退出码 0，15 检查及指引检查通过。
- `git diff --check`：PASS，退出码 0。
- 修改范围与哈希核对脚本：PASS，退出码 0；27 个源文件哈希无漂移，28 个修改文件与清单一致，无范围外文件和行尾空白。
- HEAD 与分支仍为本记录开头所列值。
