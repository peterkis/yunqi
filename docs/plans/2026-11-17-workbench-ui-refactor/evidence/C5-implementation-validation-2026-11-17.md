# C5 实现与本地验证（2026-11-17）

## 基线与范围

- 工作位置：主检出 `/Users/petervans/Projects/YunQi`；分支 `feat/workbench-ui-refactor`；起始 HEAD `d7f076e`，起始工作区干净。
- 本轮仅修改 C5 的量表视图、出生内同页测评组合、ScaleOption 键盘行为及对应测试。没有运行 git add/commit/push、切换分支或写 Git 配置。
- 未修改 Service、Domain、Contracts、Client、OpenAPI、规则文件、冻结文件、运行时依赖、覆盖率阈值或 exclude。
- 阅读了 AGENTS.md、DESIGN.md、Workbench/验证指引、设计硬约束、字号决定、ScaleOption/Button 规范、量表规则和既有会话实现。只读解包原型画板④⑤查看结构、样式与交互源码，没有运行 Chromium 或宣称实际查看了新界面截图。
- 原型原件 SHA-256 仍为 `4abb7ea27bb3d7fcca9c147def25d0e4eca0a3b1cc412efb848a5cd17f8c9a4a`；未改写设计同步文件、原件或旧证据。

## 按卡要求完成情况

| 要求 | 状态与证据 |
| --- | --- |
| 1 顶部摘要 | DONE：ConstitutionContext 和 mapConstitutionContext 只消费已有 ViewModel；当下及出生候选分别展示，时间交给 YunQiTimeDisplay 原样展示 localTime 与北京时间 UTC+08。 |
| 2 性别 | DONE：无默认性别；改变性别清空答案、结果和待跳题任务；结果后切换也由单测覆盖。 |
| 3 一题一屏 | DONE：一个题干、一个 radiogroup、五个 ScaleOption；当前/总数、13×2 格、标题档20宋体；数字1–5、160ms跳题、减少动态效果立即进入下一题、上一题。 |
| 4 完成与提交 | DONE：完成态单独出现查看结果和返回修改；题目按钮始终 type=button；未完成或未选性别即使直接 submit 也不评分，完整后仅显式提交才调用评分。 |
| 5 九质结果 | DONE：首眼30宋体判定和兼夹/倾向；说明平和质及30/40规则；保留全部九项 API 判定，颜色跟随状态，不以分数比较阈值；各条 role=img，含分数、满分、判定、刻度、原始分和条目数的 aria-label。 |
| 6 并列互参 | DONE：体质/先天/当下三行及指定边界说明；不建立因果箭头或生成综合结论；没有出生资料时明确标注。 |
| 7 操作与存储 | DONE：结束并销毁答卷为唯一的结束操作、次按钮；会话页脚声明；不实现 HIS、病历复制或一键填完。 |
| 8 同页会话 | DONE：BirthAssessmentSession 复用同一面板；保留改资料、清空、重新对照和结束的卸载销毁，及旧异步评分隔离；题库加载/失败/缓存刷新失败时仍可结束。 |
| 9 分层 | DONE：评分来自现有 API；hook 仅向组件暴露映射后的结果和状态，不暴露原始评分 DTO；UI 不计分、不反向计分、不做阈值判定。 |
| 10 测试迁移 | DONE（代码）：旧分组单测及 browser flows/visual 均迁移；量表原用例实际在 learning.flows 中，也一并更新，workbench.flows 增加完整键盘流程。运行浏览器部分为 NOT_RUN。 |
| 11 方向键 | DONE：Arrow/Home/End 只移动焦点；Space/Enter/数字才作答；保留键盘、跳题时序及方向键不作答单测，浏览器有超过160ms后仍未作答的断言。 |
| 12 字号 | DONE（源码）：只使用 type-scale.css 档位变量；C5 visual 状态显式调用共享 expectTypeScale，截图函数也继续执行共享检查；浏览器计算字号尚未实测。 |

卡片验收：键盘浏览器全链为 PARTIAL（用例已完成，未运行）；画板结构为 PARTIAL（源码重构与约束检查完成，未截图核验）；已运行的单测、类型、治理、覆盖率及构建为 PASS，不据此声称浏览器或专家验收通过。

## 最终检查

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS，59 文件、351 项。 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS，statements 98.52%（667/677），branches 97.30%（505/519），functions 97.90%（281/287），lines 98.72%（621/629）；原阈值90/90/90/85未改。 |
| `pnpm test:workbench-governance` | 0 | PASS，293 项及检查脚本。 |
| `pnpm test:time-governance` | 0 | PASS，12 项及检查脚本。 |
| `pnpm test:project-guidance` | 0 | PASS，15 项及 budgets/links/commands/migration integrity/session provenance 检查。 |
| `pnpm --filter @yunqi/workbench build` | 0 | PASS，160 modules；Vite产物与下方dirty源码清单对应，不能把起始HEAD当作提交后的构建证明。 |
| `node --check tests/browser/constitution-helpers.mjs` | 0 | PASS。 |
| `node --check tests/browser/workbench.flows.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/learning.flows.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/birth-assessment.flows.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/workbench.visual.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/design-foundations.flows.spec.mjs` | 0 | PASS。 |
| `pnpm exec playwright test --list` | 0 | PASS，仅列出233项/8文件，不执行浏览器、Service或axe。 |
| `git diff --check` | 0 | PASS。 |
| `pnpm test:browser` | 无 | NOT_RUN：按本卡沙箱无法启动 Chromium 的约束，由评审方本机执行。没有尝试绕过沙箱，没有截图、trace或axe结果。 |

本轮单测计数是工程断言数，不是独立样本、专家案例或临床验证。没有启动自有 Service 或浏览器监听器，无需终止既有进程。

## 保留的失败与修正

- 首轮 `pnpm --filter @yunqi/workbench test -- src/features/constitution src/features/yunqi/birth/components/BirthComparisonSession.test.tsx src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx src/components/design/ScaleOption.test.tsx` 退出1：该写法实际跑了当时全量58文件/347项，两项失败。一个断言把 Query 的 gcTime:0 清理任务也当成跳题任务；修正为推进0ms清理后检查跳题任务消失。另一个在异步 mutationFn 执行前检查调用数；修正为等待实际调用后验证仍只调用一次，没有放宽产品行为。
- 随后的定向 `pnpm --filter @yunqi/workbench exec vitest run src/features/constitution src/features/yunqi/birth/components/BirthComparisonSession.test.tsx src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx src/components/design/ScaleOption.test.tsx` 退出0，6文件/34项。
- 新增加载失败测试后，`pnpm --filter @yunqi/workbench test:typecheck` 曾退出1：测试 Promise 推断为 unknown；补齐题库返回值泛型后最终退出0。
- 新增缓存刷新失败测试时，定向 `pnpm --filter @yunqi/workbench exec vitest run src/features/constitution src/features/yunqi/birth/components/BirthComparisonSession.test.tsx` 及当轮全量 `pnpm --filter @yunqi/workbench test` 各退出1：测试错误地假设五分钟有效期内重新打开就会刷新，未触发预期错误。改为对本测试拥有的 QueryClient 显式 invalidate，再走真实重开/刷新路径；没有删除用例或放宽断言。该轮串联的覆盖率因前一条失败而未执行；之后定向5文件/28项及最终全量351项、覆盖率分别退出0。
- 最终检查前已经通过的中间快照（349、350项）仅属阶段结果，不用来冒充最终351项或浏览器验证。

## 与原型的差异与待决事项

- 字号遵循本地五档决定：题干20代替原型19，结论30；其余正文14、小字12，不照搬原型的11/12.5/13等字号。
- 性别由医师手动选择，保留可切换控件及来源折叠；不展示原型的 HIS 身份、年龄、自动填入、演示填满或复制病历。
- 结果是当前路由内的下钻状态：隐藏作答区，保留返回修改和公共分段导航；出生内测评继续在原对照页复用，未新增结果路由或改共享路由表。与画板⑤替换全局标题栏/导航的外壳存在差异。
- 互参按本卡要求使用三行，原型的三列改为纵向以容纳所有候选；独立量表没有先天输入时不编造先天资料。出生候选完整快照和区间收进 details，摘要保留全部候选。
- 结果说明采用同义的中性文案，避免把API边界声明中的疾病措辞直接呈现为本界面的视觉语言；不改变任何判定。
- 待本机运行 pnpm test:browser 复核真实键盘、400×860/640、深浅主题、字号、焦点环、无横向溢出与axe。当前不能宣称视觉或完整可访问性验收完成。
- 正式专家冻结/临床验收状态未改变；未发现并顺手修改其他卡功能。

## 修改文件及 SHA-256

以下24个源码、样式和测试文件为最终被检查的dirty文件；另新增本证据文件（不把自身哈希写入自身）。

| 文件 | SHA-256 |
| --- | --- |
| `apps/yunqi-workbench/src/components/design/ScaleOption.test.tsx` | `4016bc9f5163e12283956dff3a1dc9a3d3948801dc7632385c82d7ece8f4ff44` |
| `apps/yunqi-workbench/src/components/design/ScaleOption.tsx` | `f6c9577e8717d0f09c5f2b9da4a5f160291579023880f5fbd5c4c9b0af2aded9` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionAssessmentPanel.tsx` | `a41a308b2b573869f48391e3a59376c209e6fadec31046869d4a61a3d1b2e1cf` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionContext.tsx` | `69bc9b06323194753c33a802eb9ce91d0475e4dfa1843dc7c1d3145ebc6ea41d` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx` | `7a33781d718b40eab00e8355189e04485e9069906e0e2eedf09e9c2b7fe3f667` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx` | `edc94f0c1a8036bc784ef6647dc7e0e22a2e3b5a30e6ff89f2d27abaa6b8f8fc` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx` | `7daa76f6b7937f227f2cd7333b19ff8888ab194fe8daf966c1bda6379c3e95e0` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx` | `f14cffa1672002950ddde0bff01ab645638350f7957335094d998162e6ca5486` |
| `apps/yunqi-workbench/src/features/constitution/hooks/useConstitution.ts` | `9d9cf5a375aad7b26fa2aafbd3d09e82bbcf0116ffdac120942e558731b2c700` |
| `apps/yunqi-workbench/src/features/constitution/pages/ConstitutionPage.test.tsx` | `0b48f65a2f53534ebe87f833eef86cf3ba0b0b9119289c3694400ba5b1e05233` |
| `apps/yunqi-workbench/src/features/constitution/pages/ConstitutionPage.tsx` | `afba904b8ea974c0dd4cc00637c4a672a5d9494f5508d97af6b8c797d2194d33` |
| `apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.test.ts` | `928159f83fc61649c37fb5ed8fdf78d7f81deecd93b48d0ab9cbaaa6810b423b` |
| `apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.ts` | `5f6aeb9fb537db428330f4fa495574e2f45996d9b28fa88dad61deb8c0ca9788` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthAssessmentSession.tsx` | `9c69d95ed028967f522fd3979f80470bc8eb1918eb04665afb1f5d952124bf8c` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx` | `e47c27abf833d70e150ae98ff15c23f5e3a0c466520cab694789c56c7b5bad4d` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx` | `ca1fcc38685416b2a6f96f0d759e42fa9ad3eaf4f710eb1a36bcd1c56ee6583d` |
| `apps/yunqi-workbench/src/main.tsx` | `056a0ceaec0bfcd07d150d383f8823c8862a1334ffc7b9f9886517fcf49983ce` |
| `apps/yunqi-workbench/src/styles/views/constitution.css` | `2125ec5d4756958d5c07517670eab30c755028b46527f60b889b6aa6c993742a` |
| `tests/browser/birth-assessment.flows.spec.mjs` | `ef840d16583ab9785d4da2ca4061a9cae8da716de5a22761c091a90a9febfca1` |
| `tests/browser/constitution-helpers.mjs` | `6e24a7730e0b0596c36aefcbb7f5a29a76514905500b39412afe5f17e1c09d66` |
| `tests/browser/design-foundations.flows.spec.mjs` | `c972c9be32a0ceeb5a0a7df7a896979168a1e5fbf5f80163621a665b84f2190b` |
| `tests/browser/learning.flows.spec.mjs` | `13fb589c6b7bf39ffc3fa77f7052e2b01845ec8e0d7fc00ac0841319bc07b3b7` |
| `tests/browser/workbench.flows.spec.mjs` | `7d198b2e7d43eb285c57b209ee9477a2234914501e9d60323451989f1e7c4fd0` |
| `tests/browser/workbench.visual.spec.mjs` | `cea1eaf44e6068328ece3f7dd01dc2f9e6bf8ddb2abefd7136b95072d8dd67cc` |

## 最终构建产物

| 文件 | 字节 | SHA-256 |
| --- | --- | --- |
| `apps/yunqi-workbench/dist/index.html` | 563 | `4231bfba18fb152f57571d5b50ce8388f5f06cae7879a22de96d34a061f5bf7c` |
| `apps/yunqi-workbench/dist/assets/index-CySJyDQV.css` | 86794 | `8ba3b504662681aeff4bad3850c774d43974b094da87c140a247d7f33f354bef` |
| `apps/yunqi-workbench/dist/assets/index-SdCSoel0.js` | 346705 | `958706718fb741e2ace1474287fb26d1b2dd6596e01367313342977d1adcff4e` |
