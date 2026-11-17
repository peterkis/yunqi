# C7 实现与验证记录（2026-11-17）

这是实施记录，浏览器尚未实跑，不是评审通过结论。
基线：`62df8ab3a95a47050b4909ca5ffed52e7b5eec6d`，分支 `feat/workbench-ui-refactor`，初始工作区干净。
Node `v24.18.0`，pnpm `10.32.1`；本次未运行git add/commit/push、切分支或修改git配置。
源码SHA-256与命令清单见[C7源码快照](C7-source-manifest.json)。快照不含本记录及清单自身，历史证据均保留。

## 1. 完成内容

| 验收项 | 状态 | 实现与证据 |
| --- | --- | --- |
| 新视觉矩阵和断言，删除旧矩阵 | DONE（代码）；浏览器实测待补 | `playwright.config.mjs` 使用400×860浅/深、400×640、400×64胶囊、1366×900工作站。四个面板项目各24态，胶囊两主题；`--list`为49+98=147例、9文件 |
| 原型七画板与下钻状态 | DONE（用例） | 当前、原文、出生对照、量表作答/完成/结果、胶囊、工作站及年度/指定时点/问诊规划/未找到；见[覆盖表](../../../../tests/browser/README.md#visual-states) |
| 布局、字号、焦点、按钮、axe及资源边界 | DONE（用例） | 截图统一调用五档字号门禁；每态控件尺寸与主按钮数量、键盘模态逐焦点2px环；900高两卡免滚动、640高固定区域；保留axe WCAG 2.1 A/AA，外部HTTP请求先拦截、全部外部请求尝试仍使诊断失败 |
| demo样式与闲置组件 | DONE | `global.css`从2282行缩为66行，仅共享reset、主题、规范时间、可访问隐藏工具；删除demo别名/容器断点/全局过渡及5个ui组件和8个脱离应用入口的demo组件。导入图、无引用扫描、字号源码测试通过 |
| 年度卡三栏与出生唯一主操作 | DONE | 岁运合并“水运太过”式单值，年度三栏保持单行；出生对照按钮在有结果时仍为主按钮，同时测评和内嵌查看结果为次按钮；独立量表仍有一个主按钮。单测及浏览器断言同步 |
| 文档及根测试接线 | DONE | 两份README、Workbench/验证指引与设计入口更新；`tests/browser-fixtures.test.mjs`接入根`pnpm test`，CI既有Run tests因此执行4条回归 |
| 全量门禁全绿 | PARTIAL | 非浏览器门禁均退出0；`pnpm test:browser`为NOT_RUN，不能宣称全绿 |
| reduced-motion清理后的回归及时序根因 | PARTIAL | C1/C5原期望与自动重试断言保留，4条合成夹具测试PASS；真实焦点/未找到直接加载样式时序需本机Chromium确认，根因仍未确认 |

### 旧组件测试迁移

未跳过或删除现有行为的断言；Workbench仍为59文件、352例。

| 旧测试 | 当前目标 |
| --- | --- |
| `ui/primitives.test.tsx` | `design/migrated-primitives.test.tsx`：InfoCard命名/内容、事实值和中性关系、SixQiTimelineItem受控展开 |
| `AnnualStageRail.test.tsx` | `stage-navigation-migration.test.tsx`：现行六步导航的API索引、状态、精确时刻、展开与滚动 |
| `YunQiYearSummaryPanel.test.tsx` | `annual-summary-migration.test.tsx`：现行年度卡两种岁运值和单值结构 |
| `LearningPanels.test.tsx` | CurrentClassicsPage原文/释义/出处/空态、CurrentYunQiPage交运时刻与口径、BirthComparisonTable日期精度 |
| `rule-traceability-panels.test.tsx` | DrilldownResultNotes说明/元数据分离和空说明 |

## 2. 修改文件清单

以下为实现快照的48项文件变更（D为删除，??为新增）；另新增本记录与`C7-source-manifest.json`两份交付资料。

| 状态 | 文件 |
| --- | --- |
| M | [DESIGN.md](../../../../DESIGN.md) |
| M | [README.md](../../../../README.md) |
| M | [apps/yunqi-workbench/README.md](../../../../apps/yunqi-workbench/README.md) |
| D | `apps/yunqi-workbench/src/components/ui/Badge.tsx` |
| D | `apps/yunqi-workbench/src/components/ui/Card.tsx` |
| D | `apps/yunqi-workbench/src/components/ui/DataLabel.tsx` |
| D | `apps/yunqi-workbench/src/components/ui/Panel.tsx` |
| D | `apps/yunqi-workbench/src/components/ui/TimelineItem.tsx` |
| D | `apps/yunqi-workbench/src/components/ui/primitives.test.tsx` |
| M | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx) |
| M | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx) |
| M | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthAssessmentSession.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthAssessmentSession.tsx) |
| M | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx) |
| M | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx) |
| M | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx) |
| D | `apps/yunqi-workbench/src/features/yunqi/components/AnnualStageRail.test.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/AnnualStageRail.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/CurrentStepCard.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/GuestHostRelationDetail.tsx` |
| M | [apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.test.tsx) |
| D | `apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/RuleExplanationPanel.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/TraceabilityPanel.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/YunQiTimeRange.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/YunQiYearSummaryPanel.test.tsx` |
| D | `apps/yunqi-workbench/src/features/yunqi/components/YunQiYearSummaryPanel.tsx` |
| M | [apps/yunqi-workbench/src/features/yunqi/components/rule-traceability-panels.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/rule-traceability-panels.test.tsx) |
| M | [apps/yunqi-workbench/src/features/yunqi/year-analysis/components/DrilldownYearSummaryCard.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/year-analysis/components/DrilldownYearSummaryCard.tsx) |
| M | [apps/yunqi-workbench/src/styles/global.css](../../../../apps/yunqi-workbench/src/styles/global.css) |
| M | [apps/yunqi-workbench/src/styles/panel-shell.css](../../../../apps/yunqi-workbench/src/styles/panel-shell.css) |
| M | [apps/yunqi-workbench/src/styles/views/current-yunqi.css](../../../../apps/yunqi-workbench/src/styles/views/current-yunqi.css) |
| M | [apps/yunqi-workbench/src/styles/views/drilldown.css](../../../../apps/yunqi-workbench/src/styles/views/drilldown.css) |
| M | [docs/agents/verification.md](../../../../docs/agents/verification.md) |
| M | [docs/agents/workbench.md](../../../../docs/agents/workbench.md) |
| M | [package.json](../../../../package.json) |
| M | [playwright.config.mjs](../../../../playwright.config.mjs) |
| M | [tests/browser/README.md](../../../../tests/browser/README.md) |
| M | [tests/browser/birth-assessment.flows.spec.mjs](../../../../tests/browser/birth-assessment.flows.spec.mjs) |
| M | [tests/browser/design-foundations.flows.spec.mjs](../../../../tests/browser/design-foundations.flows.spec.mjs) |
| M | [tests/browser/fixtures.mjs](../../../../tests/browser/fixtures.mjs) |
| M | [tests/browser/panel-shell.flows.spec.mjs](../../../../tests/browser/panel-shell.flows.spec.mjs) |
| M | [tests/browser/ux-walkthrough.flows.spec.mjs](../../../../tests/browser/ux-walkthrough.flows.spec.mjs) |
| M | [tests/browser/workbench.visual.spec.mjs](../../../../tests/browser/workbench.visual.spec.mjs) |
| ?? | [apps/yunqi-workbench/src/components/design/migrated-primitives.test.tsx](../../../../apps/yunqi-workbench/src/components/design/migrated-primitives.test.tsx) |
| ?? | [apps/yunqi-workbench/src/features/yunqi/components/annual-summary-migration.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/annual-summary-migration.test.tsx) |
| ?? | [apps/yunqi-workbench/src/features/yunqi/components/stage-navigation-migration.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/stage-navigation-migration.test.tsx) |
| ?? | [tests/browser/panel-pill.visual.spec.mjs](../../../../tests/browser/panel-pill.visual.spec.mjs) |
| ?? | [tests/browser/visual-assertions.mjs](../../../../tests/browser/visual-assertions.mjs) |

## 3. 检查结果

| 命令 | 结果 | 退出码 / 范围 |
| --- | --- | --- |
| `pnpm test` | PASS | 0；最终源码复跑亦0，Workbench352/352，根Node入口明确执行4条browser fixture回归 |
| `pnpm typecheck` | PASS | 0 |
| `pnpm test:coverage` | PASS | 0；Workbench语句99.22%、分支97.99%、函数99.62%、行99.50%；阈值/排除未变 |
| `pnpm schema:validate` | PASS | 0 |
| `pnpm contracts:check` | PASS | 0 |
| `pnpm test:project-guidance` | PASS | 0 |
| `pnpm test:browser` | NOT_RUN | 无退出码；本卡已明确沙箱不能启动Chromium，留评审方本机执行 |
| 每个浏览器模块的 `node --check <file>` | PASS | 全部0；14个tests/browser模块 + playwright.config.mjs + tests/browser-fixtures.test.mjs，共16个 |
| `pnpm exec playwright test --list` | PASS | 0；147 tests in 9 files，只是发现用例 |
| `pnpm exec playwright test --list --project=flows-chromium` | PASS | 0；49 tests in 7 files |
| `pnpm exec playwright test --list --grep @visual` | PASS | 0；98 tests in 2 files |
| `git diff --check` | PASS | 0 |
| 导入图、旧变量/断点/过渡、保护范围扫描 | PASS | 0；docs/design、packages、rules、.github、pnpm-lock.yaml无差异 |

原始日志保存在本机忽略目录 `.artifacts/c7/2026-11-17-8pd6uqxe`，不作为可移植仓库证据；本文件保留可复现命令、退出码、失败与限制，源码清单单独版本化。
首轮`pnpm --filter @yunqi/workbench test`退出1（351通过、1失败及1个未捕获错误）：新迁移测试的全页文本选择器命中多处，另一个新测试未模拟jsdom不提供的scrollIntoView。
修正为现行区域内查询与目标元素滚动模拟，并保留滚动调用断言后，复跑退出0（352通过）；此后完整根测试和覆盖率也通过。首轮失败日志一并保留。

## 4. 与设计规范或原型的差异及原因

- 字号按本地`type-scale.css`五档决定，未改同步令牌或设计原件。
- 400×64视口会裁切胶囊外侧焦点环，增加同色2px内描环；原2px outline/offset与浮影保留，供本机截图确认。
- 原型工作站画板为1440×900示意；按C7验收要求使用1366×900，只验证浏览器右侧布局。
- HIS患者资料、病历复制、宿主停靠、演示一键填完均未实现，沿用本轮授权范围。

## 5. 待决问题或风险

1. 评审方需在本机运行`pnpm test:browser`。本轮没有新截图、axe扫描结果或实际浏览器PASS，147是发现数。
2. C1/C5焦点环回归与未找到页首次样式应用是否随demo CSS清理消失尚未确认；保留精确期望的重试门禁，不追加固定等待或重试次数。
3. 范围外既有问题：`apps/yunqi-workbench/src/features/yunqi/birth/presentation/map-birth-view.ts`仍定义`elementNames`、`qiElements`、`comparisonTones`，与映射只用`visual-mappings.ts`的要求不一致。本卡未改mapper或关系映射，需后续单独收敛。
4. 工程检查不替代专家规则冻结或临床验收；本轮未复核远端分支保护或CI运行。
