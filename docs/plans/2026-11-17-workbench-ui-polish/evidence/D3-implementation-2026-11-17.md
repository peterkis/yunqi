# D3 体质结果标题与操作区实现记录（2026-11-17）

分支：`feat/workbench-ui-polish`。基线 HEAD：`9bf4beeb6dd2117823f6458f4762bcbd0664229b`。
初始工作区只有未跟踪的 `docs/plans/2026-11-17-workbench-ui-polish/reviews/D4-review-1.md`，该文件未改动。
本轮未提交、未推送、未切换分支、未改 Git 配置；未修改 Service、Domain、Contracts、Client、OpenAPI、规则或设计同步副本。

最终 28 个变更源文件（含测试与说明，不含本报告）的路径与内容聚合 SHA-256：
`7e872f9ec9fb2a15311576a33000e898c52a6b21b2e798a61553cc4dd13473ce`。
算法：按路径排序，将每个文件的 `路径\tSHA256` 用换行连接后计算 SHA-256。最终检查时 28 个文件均无哈希漂移。

## 1. 完成内容

- **DONE（实现）结果标题**：`map-constitution.ts` 只投影 DTO 判定状态和有序 `matchedTypes` / `tendencyTypes`，不排序、不使用分数判定。平和质与基本是平和质沿用 DTO 原意，一种偏颇质用其名，多种用“偏颇质兼夹”；保留无明确类型的现有分支。
- **DONE（实现）单行与标签**：`ConstitutionResults.tsx` / `constitution.css` 使用 30px 设计档位和 `white-space: nowrap`，不截断、不省略；所有“是”和“倾向”各用一组中性 RelationChip，遵守对应 DTO 数组顺序。原始 `summary` 和 `boundaryNote` 各出现一次，位于“判定说明与边界”。九质分数与先天、当下并列信息继续保留。
- **DONE（实现）操作区**：`PanelView.tsx` 将当前可见会话的操作及可选下钻标题交给 `PanelShell`。出生表单的“查看对照”通过 `form` 关联，提交后切为“同时测评体质”；作答中左侧结束次按钮；结果左结束、右返回修改文字按钮。答完后的“查看结果”也位于操作区。旧内容流的对应按钮与结果错位标题已移除。
- **DONE（实现）独立与内嵌共用**：`ConstitutionForm.tsx`、`ConstitutionAssessmentPanel.tsx`、`BirthAssessmentSession.tsx` 共用规则。展开出生输入时由出生提交接管操作区；原文下钻释放操作区；结束、修改及旧评分响应隔离保留。结果使用 `PanelHeader` 下钻样式，不新增 URL 或业务路由。
- **DONE（补充）**：作答进度行只保留标准号与题数，性别版本和“更换”保留在眉标。
- **PARTIAL（验收）标题恒为一行 / 400×640 操作区固定可见**：实现和浏览器断言均已完成，真实 Chromium 几何、截图和 axe 未执行。
- **PARTIAL（验收）全部门禁绿**：本卡列出的非浏览器门禁全部 PASS；`pnpm test:browser` 为 NOT_RUN。

## 2. 修改文件清单

28 个源文件如下；另新增本报告，共 29 个本卡文件。原有 D4 未跟踪文件不计入。

| 文件 | SHA-256 |
| --- | --- |
| `apps/yunqi-workbench/src/components/layout/PanelShell.test.tsx` | `51a46c95b6149353864a4e3f3213c04b32fc3ee575856768bbca72eca8dd858e` |
| `apps/yunqi-workbench/src/components/layout/PanelShell.tsx` | `8e3c190cc6e147a9c15627321661a57f0ab3b7746d7711addd7c540e2575cb3d` |
| `apps/yunqi-workbench/src/components/layout/PanelView.tsx` | `139df84c114ece427e1394d38c6c1ab54c673b5f3dd17049280692e8bea9c944` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionAssessmentPanel.tsx` | `0ddb43aa1105ca0ba152b4ebf48fbb181ee1e953f5376debdd59c10697c1d9de` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx` | `2a3b5e5c2d812c0b797449c16b52b555116e27a920aa8f999b40a545ecce6a25` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx` | `52c447229584a7a0c1030b57ad1ec303c260ac4eb16dc1d60bf3ddccc8c855fe` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx` | `04c9821dd1d60a64d99066c6571ebf8637720fd41152f43b9f3a46cb67864d67` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx` | `2babbfb8a6551368fe84f269b27df8568a5ae8b93526df258b5c53ae0f7e0c2b` |
| `apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.test.ts` | `412eb785ecfbb63531c7a35c2f65ddd1fab782b3cb9376b90713a6b1b38bf4aa` |
| `apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.ts` | `d73ae1b7af1ae4f755b6a7612559a499fa846c30c2527ebbcadb48f9d991d7be` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthAssessmentSession.tsx` | `5ea4ec2e3f105ad69a62114c700345f50ec61e8c1a0c6104415e31797e8a6de1` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx` | `1ac90f68b059a212fe5e6df518a69a63765e000242491e20d674106b527836a6` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx` | `4fcc355d5effc8a000d977405b968b38fd98d73e6cee3d1a3f19305b09be587a` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx` | `0de563398c316ab9dff5a92c3828a6648b95e70fc2b293adcf77d0333687a7df` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx` | `9ef8a5315d7e6622ef8ce52e419ebc9883aea55c4b7359417c587a977129a565` |
| `apps/yunqi-workbench/src/styles/views/birth.css` | `24c98004bdf3e993adabe8d67e46094c584bd64e8c3b027bdcefaecabfe20e3a` |
| `apps/yunqi-workbench/src/styles/views/constitution.css` | `a61ca96c8f96364d2b565c7bdbae00e94630812696d77722ed662817f0f5946c` |
| `apps/yunqi-workbench/src/test/learning-fixtures.ts` | `0971ae72d96e259fe3eb0adf6542a98e8e6704228c492524dd1442f74cf00510` |
| `apps/yunqi-workbench/src/test/test-utils.tsx` | `02bc51b3d8ec9c313572ea858ca7d2e5e0047b2cb5cc25e25458b52eecf58e95` |
| `docs/agents/workbench.md` | `b8ba7ad6a1bdc24a3f97757eb55fbcc1da975ed5c0b6e4fa54563ac574e8d7b2` |
| `tests/browser/README.md` | `3083d06b2c5ae1d41f47affa2e1fe39b30413e751302311905d044dcff599820` |
| `tests/browser/birth-assessment.flows.spec.mjs` | `333ec2c331c9d72af879f59024fa55574888b23513107991f4f77baf025a4ff3` |
| `tests/browser/constitution-actions.flows.spec.mjs` | `98ae20946383ec593d97549f5e616998c5c76e0ffbb3febb9ef1cf658931bb53` |
| `tests/browser/constitution-helpers.mjs` | `c1f5af5bbfac0db00971fc059f755d4288a3ab934e13fc61acd4d64a5b94f2f8` |
| `tests/browser/learning.flows.spec.mjs` | `7fe3f3c32cc706bf889fd4b0cab37e9ed9f2d3ef19fa1e19c1b219c5cf29a409` |
| `tests/browser/ux-walkthrough.flows.spec.mjs` | `8531b7079ac636760c7edcebf97bae8909c08962517847850ee058c9e82c311e` |
| `tests/browser/workbench.flows.spec.mjs` | `a04ed9807caa153f37ca0a7e269e73da35edc97a39bce8bad4ecb15c88cb0f0e` |
| `tests/browser/workbench.visual.spec.mjs` | `3577b7241e991c6591bb4a2548165efbb72268c9cd0137b77eab015ca750f1ed` |

## 3. 检查结果

以下为最终源文件的相关检查；语法与发现清单仅证明用例可解析、可发现，不证明浏览器断言已通过。

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS：61 个文件、388 项测试 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS：语句 99.23% (776/782)、分支 97.98% (632/645)、函数 99.67% (307/308)、行 99.57% (705/708)；阈值与 exclude 未修改 |
| `pnpm --filter @yunqi/workbench build` | 0 | PASS：Vite 8.1.5，166 模块；产物 `index-BB_rD19i.css`、`index-D2Yk4_Ej.js` |
| `pnpm test:workbench-governance` | 0 | PASS：293 项，最终源文件复核通过 |
| `pnpm test:time-governance` | 0 | PASS：12 项，最终源文件复核通过 |
| `pnpm test:project-guidance` | 0 | PASS：15 项及指引完整性检查 |
| 对 `tests/browser/` 全部 `.mjs` 逐个执行 `node --check <文件>` | 0（每个） | PASS：15 个模块 |
| `pnpm exec playwright test --list` | 0 | PASS：204 项 / 10 个文件，其中 58 项流程/基础/检查器用例、146 项视觉/可访问性用例 |
| `node --test tests/browser-fixtures.test.mjs` | 0 | PASS：4 项合成几何回归；不等于实际 CSS 验收 |
| `git diff --check` | 0 | PASS |
| 28 个源文件 SHA-256 比对 | 0 | PASS：无漂移 |
| `pnpm test:browser` | — | NOT_RUN：按本卡约定，沙箱无法启动 Chromium，由评审方在本机运行 |

中间结果保留：

- 首轮 `pnpm --filter @yunqi/workbench test src/features/constitution src/features/yunqi/birth/components src/components/layout` **FAIL，退出 1**：65 项中 63 PASS / 2 FAIL。其一为新增断言误将合成问卷标准名写为正式标准号；其二为 jsdom 的折叠说明 Tab 焦点与预期不同。改为使用合成问卷的原始标准名，并在单测从内容末尾实际链接验证 Tab 进入操作区，Chromium 用例继续逐步断言折叠 summary 的完整顺序。
- 同一局部命令复跑 **PASS，退出 0，65/65**。随后增加操作区所有权回归，最终全量与覆盖率均 **388/388 PASS**。这些次数不相加为独立样本。
- 早期全量为 **387/387 PASS**；补充“出生输入展开时接管操作区”用例后最终为 **388/388 PASS**。

浏览器用例已覆盖：独立与内嵌各 1/2/7 种偏颇质的真实 Service 评分响应；标题元素与文字 Range 均一个 rect、高度不超过行高、无省略与横向溢出；匹配 chip 数等于 `matchedTypes` 数，顺序与中性样式一致；400×640 操作区完全在视口内，滚动内容不改变其位置；内容 → 操作区 → 页脚的 DOM 与键盘顺序。视觉矩阵仍保留 400×860 浅/深、400×640、工作站等既有状态以及焦点、字号、axe、外部请求检查。

## 4. 与设计规范或原型的差异及原因

- 按本卡及计划调整，不按转化分挑“主体质”；多种“是”概括为“偏颇质兼夹”。
- 单一“是”的标签行标为“是”，多种才标“兼夹”；两者都列出 DTO 的全部 `matchedTypes`，满足 1/2/7 种的标签计数，也避免把单一体质称作兼夹。
- 完成态的“查看结果”也移到底部，内嵌完成态与独立量表使用同一主按钮规则；开始入口已交还操作区，因此不会同时保留两个主按钮。
- 按卡要求保留 DTO 的 `boundaryNote` 原文，可在说明区展开。实际 DTO 含“不等同于……个人疾病风险”的否定性边界句；没有据此增加风险分级、风险视觉或推断。
- 原型中的 HIS、病历复制、宿主停靠、“演示：一键填完”等未实现；`docs/design/` 同步文件保持原样。

## 5. 待决问题或风险

- 评审方仍需在本机执行 `pnpm test:browser`，检查真实单行高度、400×640 操作区、完整键盘顺序、浅/深主题对比度、截图与 axe。当前没有 D3 浏览器运行产物，不能宣称视觉或完整可访问性验收已通过。
- 新增六条最小高度流程使用固定问卷答案，通过真实 Service 返回值断言 1/2/7 种命中；它们是 UI 回归用例，不是专家案例或临床独立样本。
- 本次未改规则，现有专家待冻结状态保持不变；工程门禁不替代专家或临床验收。
