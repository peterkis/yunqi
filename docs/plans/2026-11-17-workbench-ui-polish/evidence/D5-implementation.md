# D5 工艺细节实施记录

任务：[D5 卡片](../cards/D5-craft.md)。基线 HEAD：`0ce0c2d69f56f946d724b920c441a8c790449fe7`；分支 `feat/workbench-ui-polish`；初始工作区干净。
本轮未提交、推送、切换分支或修改 Git 配置。Node `v24.18.0`，pnpm `10.32.1`。

## 1. 完成内容

| 验收项 | 实施状态 | 对应实现与证据 |
| --- | --- | --- |
| P2-12 等宽数字 | DONE | `global.css` 的 `time, .num` 统一等宽数字；日期输入、出生摘要与年份、年度选择、分数、题目数量与进度使用 `.num`。DateField、InfoCard、结果单测同步断言；浏览器基础、量表 helper 与 D5 用例增加计算样式检查。 |
| P2-13 当前段内进度 | NOT_DONE（按卡片条件不做） | 只读核对 Contract 1.2.0 的 `YunQiCalculationDto`、`SixQiStepDto`、`YunQiLearningDto` 及 mapper，均无可直接使用的段内比例字段。保留整段当前态，无时间差或比例计算，无契约修改。 |
| P2-14 动效 | DONE | `views/craft.css` 的本地令牌为 140ms / ease-out，注释引用 D5。覆盖路由与局部分段、选项、原生 details、自定义阶段详情及面板/胶囊/出生表单到达态。reduced-motion 取消过渡、动画和滚动动效；未过渡 outline，C1/C5 的原有精确焦点环重试断言保留。 |
| P2-15 中文标点 | DONE | QuoteBlock 保留全角引号，应用 `text-spacing-trim: trim-start`；InlineText 只将展示分隔符的普通空格替换为 U+202F 窄空格。书名号内的中点、原文、API 原始字符串与关系色映射不变。旧名称单测按新展示更新。 |
| P2-16 按钮焦点 | DONE | 图标按钮的底色反馈限定为 `:focus-visible`，按钮非键盘焦点取消 outline；新增浅/深主题鼠标点击与真实 Tab/Shift+Tab 断言，覆盖鼠标仍位于按钮上的情形。 |
| P2-17 开发态宿主区 | DONE | `main.tsx` 仅在 `import.meta.env.DEV` 内动态导入 `dev-host.css` 并标记 body；中性底色使用 `--surface-sunken`，外层透明以显露宿主区域。每次生产 build 自动扫描所有产物 CSS，拒绝开发态规则泄漏。 |
| 全部门禁绿 | PARTIAL | 本卡可执行检查均通过；Chromium 按任务约束未启动，真实渲染、axe 与截图验收仍为 NOT_RUN。 |

## 2. 修改文件清单与源哈希

以下 49 个实现、测试、说明文件构成本轮待交付源清单；另新增本记录，共 50 个文件。
表中为文件 SHA-256。按路径排序后的 UTF-8 JSON 源清单（ensure_ascii=false、indent=2、末尾换行）SHA-256：
`2bdcb608a9dfbdfce753049e30f5f3c748199c1589d2b797c48e0a6ebbcc2c00`。
本记录不计入自身的源哈希。

| 状态 | 文件 | SHA-256 |
| --- | --- | --- |
| 修改 | [apps/yunqi-workbench/package.json](../../../../apps/yunqi-workbench/package.json) | `7b58b5242ecd40de3a70212848434318f9e218d14ec78ff7d31c113ab1c05a56` |
| 新增 | [apps/yunqi-workbench/scripts/check-production-css.mjs](../../../../apps/yunqi-workbench/scripts/check-production-css.mjs) | `4cffd8ffc857a7643210f0b10edbd613d0585decb99c79c6c6faeb3912fd1550` |
| 修改 | [apps/yunqi-workbench/src/app/App.test.tsx](../../../../apps/yunqi-workbench/src/app/App.test.tsx) | `8222310abdec96db0a199562c233e7362865aa792dd81b0aa06df7dec595528b` |
| 修改 | [apps/yunqi-workbench/src/app/AppRoutes.test.tsx](../../../../apps/yunqi-workbench/src/app/AppRoutes.test.tsx) | `78587a4de2582f733d76e52d1f8854a0536d2520af1262568cb61cd998369a19` |
| 修改 | [apps/yunqi-workbench/src/components/design/DateField.test.tsx](../../../../apps/yunqi-workbench/src/components/design/DateField.test.tsx) | `38564f002c200cc512e3abfd5aa879aca460723a238fd0a25a9fd1aa781057f5` |
| 修改 | [apps/yunqi-workbench/src/components/design/DateField.tsx](../../../../apps/yunqi-workbench/src/components/design/DateField.tsx) | `a761f3f4f7424e3aab09d92d5392a99a7f2d0c8b6873ccfa58947a261a63b4f7` |
| 修改 | [apps/yunqi-workbench/src/components/design/InfoCard.test.tsx](../../../../apps/yunqi-workbench/src/components/design/InfoCard.test.tsx) | `29af9a675a3d7e8bbb45b341ba0408efb51b250ac10659de19dac94ef059cd97` |
| 修改 | [apps/yunqi-workbench/src/components/design/InfoCard.tsx](../../../../apps/yunqi-workbench/src/components/design/InfoCard.tsx) | `ed34733718d194345edea33e9a02d0f3971532e6ab3ae854eb79f5b4745dd438` |
| 新增 | [apps/yunqi-workbench/src/components/design/InlineText.test.tsx](../../../../apps/yunqi-workbench/src/components/design/InlineText.test.tsx) | `b01228565c2ea805a9dfa17c31676fbba8fa13b147386bb78cf3ac6d9fe96cbe` |
| 新增 | [apps/yunqi-workbench/src/components/design/InlineText.tsx](../../../../apps/yunqi-workbench/src/components/design/InlineText.tsx) | `67c396c939d20a05743e3e88ad71bf56c7b9cf3bd4f4978860bf22ebf4f05430` |
| 修改 | [apps/yunqi-workbench/src/components/design/PanelHeader.tsx](../../../../apps/yunqi-workbench/src/components/design/PanelHeader.tsx) | `e515d086d34e1881b5c220ca1ab39cde5ca7eb1000177f8749bc6428370c1779` |
| 修改 | [apps/yunqi-workbench/src/components/design/QuoteBlock.tsx](../../../../apps/yunqi-workbench/src/components/design/QuoteBlock.tsx) | `cbf729fe965c3159d2424f7d584ef20c69509fdc802e3bf8a90db5f7e3724ce1` |
| 修改 | [apps/yunqi-workbench/src/components/design/RelationChip.tsx](../../../../apps/yunqi-workbench/src/components/design/RelationChip.tsx) | `3a438b72c8e7da1ae1cee82d375a02958dcb657b0de56926c45802084e0dfd40` |
| 修改 | [apps/yunqi-workbench/src/components/design/ScaleOption.tsx](../../../../apps/yunqi-workbench/src/components/design/ScaleOption.tsx) | `5ab98118cb2d83aaf7fbafc19b2808b8d2e68b4f40d9d80f1230e9905bfac1cc` |
| 修改 | [apps/yunqi-workbench/src/components/feedback/FeedbackStates.tsx](../../../../apps/yunqi-workbench/src/components/feedback/FeedbackStates.tsx) | `600758587d98c6cc7810d68c4573512356d373818ab7be65a10d846bf66de86b` |
| 修改 | [apps/yunqi-workbench/src/components/layout/PanelShell.tsx](../../../../apps/yunqi-workbench/src/components/layout/PanelShell.tsx) | `47a1e35cb2ecc2088f534f3726a60bc40c1491fc6abdd96df27b1f366b0abd7a` |
| 修改 | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionAssessmentPanel.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionAssessmentPanel.tsx) | `208144578c0c6abdd4bdea403fdb5c66a2fc2b19d715a0d3fde6a057e7ab6e26` |
| 修改 | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionContext.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionContext.tsx) | `dd093a755caa3ace8b822bf1d6f06f18a89b36516c4f26146a08ae7e75021aa9` |
| 修改 | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx) | `3c594a44782e70156cd2b9f273b52f4630fb6a3a1053a34250002e780f7de764` |
| 修改 | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx) | `889804f400a7c754737f2d5a054aec674157c1ce53564869bcb2d5c31fbbccc8` |
| 修改 | [apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx](../../../../apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx) | `5813213bb03fa69efe1f9768de20ad58b716366073dcb5b2f86bb74892d4a26a` |
| 修改 | [apps/yunqi-workbench/src/features/inquiry/components/InquiryCapabilityCard.tsx](../../../../apps/yunqi-workbench/src/features/inquiry/components/InquiryCapabilityCard.tsx) | `2cef6900b7fdc0d07988081cf379d67c231ee1d2aaac4d96385e9e01720bd804` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx) | `bedcb77ad393194edcbc2283b9a5ba602178dc2b194e4b6f1b60bfee336f490b` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx) | `19a43977a6334ff4af7d3fe1bd53e08fb1344208c6fb70a44e889887f7261951` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.tsx) | `cc0d2e976c1d82edfff45796bf7e08d211a056f5388cca1def33c749db34cf5b` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.test.tsx) | `b001627d6d60df181c5bc0dad668f634d42efa22c5bcce192233fdc823c6e604` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx) | `291b73e324e543d507c2fea4a1cbe72d92db86d43fa27d3353612d0a5e7dbfea` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiView.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiView.test.tsx) | `85d9c4fcbc3ace0008845f932a12306c7e754d6628ac23c7621166c61a4eb085` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.test.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/components/LearningPanels.test.tsx) | `4c553c80a0af65535708ea0380250299deaf837ceb1f57c8e8ffa5299ed10c4a` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/time-analysis/components/TimeAnalysisForm.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/time-analysis/components/TimeAnalysisForm.tsx) | `0a350e74c054f0fb4025ffdee6731e88a207c944e288b72873188fcfdaba68c8` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualSixQiSelector.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/year-analysis/components/AnnualSixQiSelector.tsx) | `a4d9f19f4f0aedd1e7ecb1bdce8deb5ee0a2bd1a2de0b15fff6ec90b6a98ece3` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/year-analysis/components/DrilldownYearSummaryCard.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/year-analysis/components/DrilldownYearSummaryCard.tsx) | `6828b5d090ac1e3773df3dca0ab90548bd7da0602adfb822da00ed1519aafbd1` |
| 修改 | [apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearSelector.tsx](../../../../apps/yunqi-workbench/src/features/yunqi/year-analysis/components/YearSelector.tsx) | `32ba0a069c2e3113875d67798360323e4a9896cfa826c248e288ad33daaf5cce` |
| 修改 | [apps/yunqi-workbench/src/main.test.tsx](../../../../apps/yunqi-workbench/src/main.test.tsx) | `1564f9cc1f1d0c8240a7ce6a5ee4be5c37c3fcc837a2e44bd68e628fc9bdc0f7` |
| 修改 | [apps/yunqi-workbench/src/main.tsx](../../../../apps/yunqi-workbench/src/main.tsx) | `b522dcf27e20475086e539fb16a97511eabfdb57cf9bf60b0a96044c90dabfce` |
| 修改 | [apps/yunqi-workbench/src/styles/design-components.css](../../../../apps/yunqi-workbench/src/styles/design-components.css) | `448a34cf92dc3c74f2afb43980b954cb394ce57bfc32259f7b55498e93717f8c` |
| 新增 | [apps/yunqi-workbench/src/styles/dev-host.css](../../../../apps/yunqi-workbench/src/styles/dev-host.css) | `a5b1e82e83c891afa8d998ccbc4ffab06650ac88323bc2b9a887dccffc6e3fa5` |
| 修改 | [apps/yunqi-workbench/src/styles/global.css](../../../../apps/yunqi-workbench/src/styles/global.css) | `04b731cace6eaadae7ce214c471a1d0404f13d26c233de498caad1f9de277933` |
| 新增 | [apps/yunqi-workbench/src/styles/views/craft.css](../../../../apps/yunqi-workbench/src/styles/views/craft.css) | `7e4587aafbd0d5b388ca0c0f90d3b4a9f31867cebb15375167cd0ae4f78f1228` |
| 修改 | [apps/yunqi-workbench/src/test/design-foundations.tsx](../../../../apps/yunqi-workbench/src/test/design-foundations.tsx) | `eb4baed8a609f9ffd0c0a4211a19e428ae8dcf8475a527ed0739770b8f081638` |
| 修改 | [tests/browser/README.md](../../../../tests/browser/README.md) | `a3b9943bc10109f5c38d27b158b790e2a84899b8a90097407ac3799f27e258ad` |
| 修改 | [tests/browser/constitution-helpers.mjs](../../../../tests/browser/constitution-helpers.mjs) | `42f000a55979c7188d3c2c0ebf8756e2a6d9fbca7b25ffbe414dadb524345460` |
| 新增 | [tests/browser/craft.flows.spec.mjs](../../../../tests/browser/craft.flows.spec.mjs) | `077e54649bde5f433e22bb014e06e87efc076f1a32ac9904a47ff145e3fd8e1d` |
| 修改 | [tests/browser/design-foundations.flows.spec.mjs](../../../../tests/browser/design-foundations.flows.spec.mjs) | `a3cfe9a5edb214dd330a0b18341d349b9ad92fc2e74a3d2357685e1d542e7b9c` |
| 修改 | [tests/browser/fixtures.mjs](../../../../tests/browser/fixtures.mjs) | `e615d3a9526d707877b3575d0070b47745490d7062ddc60a2df0b5d6e1aa5ae9` |
| 修改 | [tests/browser/learning.flows.spec.mjs](../../../../tests/browser/learning.flows.spec.mjs) | `c5c6ef88f221ca650dcf3b7e9e9e67153d130429a8c53e575338b10fdbd1cd41` |
| 修改 | [tests/browser/ux-walkthrough.flows.spec.mjs](../../../../tests/browser/ux-walkthrough.flows.spec.mjs) | `aa200321bb052cf198350d66a6a6e219de424dc324114332ee5158f218f67e3d` |
| 修改 | [tests/browser/workbench.flows.spec.mjs](../../../../tests/browser/workbench.flows.spec.mjs) | `9f26fa319ec783e0b3ca918f148c591effd017308c0c4f27a52c00fafba3b1d4` |
| 修改 | [tests/browser/workbench.visual.spec.mjs](../../../../tests/browser/workbench.visual.spec.mjs) | `b458169b06a1b9c1f7b51563848c9eb7318f0073fe80a71ab8594dfb296b2228` |
| 新增 | [本实施记录](D5-implementation.md) | 不自引用哈希 |

## 3. 检查结果

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench test`（首次） | 1 | FAIL：62 文件中 7 个文件、10 个用例失败，386 个通过。旧可访问名称仍使用普通空格，包含等待旧名称的超时；未删除、跳过或放宽断言。 |
| `pnpm --filter @yunqi/workbench test`（修正后及最终复跑） | 0 | PASS：62 文件、396 用例。 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS：396 用例；语句 99.23%（781/787）、分支 98.01%（642/655）、函数 99.67%（309/310）、行 99.57%（710/713）。原阈值和 exclude 不变。 |
| `pnpm --filter @yunqi/workbench build` | 0 | PASS：最终 CSS 61.13 kB、JS 357.32 kB；自动检查 1 个 CSS 文件，未发现 `workbench-dev-host` 规则。 |
| `pnpm test:workbench-governance` | 0 | PASS：293 用例及生产源码检查。 |
| `pnpm test:time-governance` | 0 | PASS：12 用例及时间治理扫描。 |
| `pnpm test:project-guidance` | 0 | PASS：15 用例及链接、预算、来源检查。 |
| `node --check <tests/browser 下每个 .mjs>`（逐文件调用） | 0 | PASS：全部 17 个浏览器模块，含新增 craft 用例和所有已改写 helper。 |
| `node --check apps/yunqi-workbench/scripts/check-production-css.mjs` | 0 | PASS。 |
| `pnpm exec playwright test --list` | 0 | PASS：208 项 / 11 文件；62 flow/foundation/oracle + 146 visual/accessibility。只证明发现与解析成功，未执行浏览器断言。 |
| `git diff --check` | 0 | PASS。 |
| `pnpm test:browser` | 无 | NOT_RUN：用户明确本沙箱无法启动 Chromium，由评审方在本机运行；未尝试启动、未生成本轮浏览器截图或 axe 结论。 |

最终构建产物 SHA-256：

- `dist/assets/index-CEWbJ1fd.css`：`c061df5ba061555a2eba4866d7d21952f4157ca770cf47b016e85a084f74b919`
- `dist/assets/index-Bv-0rK9p.js`：`6687b2f024d90718d418130fee02a77c257edd51fc79de95aaebc3c20230e0ee`
- `dist/index.html`：`531bee23430bf4d5d49575fe418059cba1e01186a54bede6365fd8739f7072c6`

本机详细命令日志、源清单与构建清单位于 `.artifacts/d5-craft-SOZ3ie/`（Git 忽略的本机缓存）；本记录保留可移植的结果摘要与源/产物哈希。
所有次数均为工程测试或断言数量，不代表独立专家或临床案例。

## 4. 与设计规范或原型的差异及原因

- 当前段保持整段实色：契约无比例，按 D5 规定不在展示层计算。
- 没有上游 motion 令牌，使用本地 140ms / ease-out 令牌并注明 D5 来源；未修改令牌 JSON 或 `docs/design/` 同步文件。
- 图标按钮的底色反馈从上游 Button 的 hover 改为键盘 `:focus-visible`，遵从 D5 对主题按钮鼠标点击后不留底色的要求。
- 面板、胶囊及出生输入的展开/收起由到达态淡入表达，离开态仍立即隐藏或卸载，保留既有焦点、会话和宿主尺寸行为；原生 details 与自定义阶段详情有双向过渡。
- 不支持 intrinsic-size interpolation 的浏览器保留原生瞬时 details 行为；不支持 text-spacing-trim 时保留完整引号并使用浏览器默认排版。

## 5. 待决问题或风险

- 浏览器验收未完成。评审方需运行 `pnpm test:browser`，核对浅/深主题焦点、普通与 reduced-motion、数字排版、原文引号、全部既有视觉矩阵、axe 及请求约束；本轮不宣称其通过。
- 若要实现当前段内比例，需要后续独立授权提供 API 字段，本卡不改变 Service、Domain、Contracts、Client、OpenAPI、规则或冻结文件。
