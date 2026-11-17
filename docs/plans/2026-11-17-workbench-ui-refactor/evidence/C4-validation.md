# C4 交付与验证记录

工作树：`/Users/petervans/Projects/YunQi/.claude/worktrees/ui-c4`。
分支：`feat/workbench-ui-refactor-c4`；起止 HEAD 均为 `502fccfc2ba47d75f7650310ea67d896145888d1`。
开始时工作区干净；本轮未提交、推送、切换分支或修改 Git 配置。

## 完成内容

| 验收标准 | 状态 | 实现与证据 |
| --- | --- | --- |
| 画板③结构；多候选、编辑隐藏、清空、重复提交的浏览器验证 | PARTIAL | 已实现 52px / 1fr / 1fr 五行对照、24px 干支、13px 年份、20px 标签、7px 圆点；全部候选及 API 左闭右开区间保留；相关单测通过，浏览器断言已迁移但未执行 |
| 无因果箭头、无综合结论；先天与当下为并列事实 | DONE | 组件仅使用 ViewModel；关系按 API 维度名称配对；语气与五行标识在纯 mapper 投影；只用导航 SVG 箭头 |
| 测试全绿 | PARTIAL | Workbench 234 项单测及所执行的类型、覆盖率、治理、构建检查通过；浏览器为 NOT_RUN |

公历日期、可选时刻只在页面内存中，提交后查询；输入变更立即隐藏结果，清空、重新提交、结束测评销毁答卷；
同一事件轮次及 pending 期间均阻止重复提交。原始 birth mutation 的 `gcTime: 0` 未变，新增测试验证卸载后 mutation cache 清空。

`/yunqi/birth/classics` 使用保持挂载的出生页响应，URL 不含出生资料；提供全年/出生阶段阅读、出处和长段展开。
多候选全部保留，默认范围为出生阶段；对照时的当下原文单独折叠保留。
下钻往返保留本次答卷，返回后恢复入口焦点；直接打开或刷新下钻无资料时不查询、不恢复出生数据。

## 修改文件清单

相对于仓库根目录；含本记录共 22 个文件。

| 文件 | 变更 |
| --- | --- |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.tsx` | 重构输入、候选表格、摘句、下钻及状态组合 |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.tsx` | 新增并列事实表及关系说明折叠 |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthClassicsView.tsx` | 新增出生范围原文阅读 |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthAssessmentSession.tsx` | 入口改为“同时测评体质”，保留量表及答卷生命周期 |
| `apps/yunqi-workbench/src/features/yunqi/birth/hooks/useBirthComparison.ts` | 新增 hook，组件仅消费 ViewModel |
| `apps/yunqi-workbench/src/features/yunqi/birth/presentation/map-birth-view.ts` | 新增纯展示投影，不计算领域关系或业务时间 |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonPage.test.tsx` | 改写表格、候选、输入及重复提交回归 |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx` | 迁移阅读入口；保留原答卷及旧评分隔离用例 |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx` | 新增下钻、隐私、完整原文和空状态回归 |
| `apps/yunqi-workbench/src/features/yunqi/birth/hooks/useBirthComparison.test.tsx` | 新增提交时机及 mutation 数据回收验证 |
| `apps/yunqi-workbench/src/features/yunqi/birth/presentation/map-birth-view.test.ts` | 新增关系乱序、未知值、五行标识、区间和原文投影验证 |
| `apps/yunqi-workbench/src/styles/views/birth.css` | 新增本视图样式；量表内部不改样式 |
| `apps/yunqi-workbench/src/main.tsx` | 仅追加出生样式 import |
| `apps/yunqi-workbench/src/app/AppRoutes.tsx` | 仅添加出生原文子路由，保留父页面挂载 |
| `apps/yunqi-workbench/src/app/routes.ts` | 仅添加出生原文下钻定义 |
| `apps/yunqi-workbench/README.md` | 仅追加新路由说明 |
| `docs/agents/workbench.md` | 仅追加新路由说明 |
| `tests/browser/birth-assessment.flows.spec.mjs` | 迁移阅读与入口，新增多候选、pending、编辑清空和刷新隐私流程 |
| `tests/browser/birth-helpers.mjs` | 新增按真实 API 核对五行表格及原文的共用断言 |
| `tests/browser/learning.flows.spec.mjs` | 仅迁移出生用例的旧选择器，保留并增强精度与时间断言 |
| `tests/browser/workbench.visual.spec.mjs` | 仅迁移出生相关视口、入口与几何断言，追加交界和原文状态 |
| `docs/plans/2026-11-17-workbench-ui-refactor/evidence/C4-validation.md` | 新增本记录 |

未修改 Service、Domain、Contracts、Client、OpenAPI、规则、冻结文件、运行时依赖或 `docs/design/` 同步资料。
未修改其他视图的组件与单测；共享浏览器文件的变更仅涉及出生用例。

## 最终检查

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS：51 个文件、234 项测试 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS |
| `pnpm --filter @yunqi/workbench exec tsc -p tsconfig.test.json --noEmit` | 0 | PASS：早期类型错误修正后复查 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS：语句 99.11%（561/566）、分支 97.24%（388/399）、函数 99.16%（237/239）、行 99.06%（528/533）；阈值及 exclude 未变 |
| `pnpm --filter @yunqi/workbench build` | 0 | PASS：158 modules；最终产物见下文 |
| `pnpm test:workbench-governance` | 0 | PASS：293 项及源码检查器 |
| `pnpm test:time-governance` | 0 | PASS：12 项及源码检查器 |
| `pnpm test:project-guidance` | 0 | PASS：15 项及链接/预算/来源检查器 |
| `node --check tests/browser/birth-assessment.flows.spec.mjs` | 0 | PASS：语法 |
| `node --check tests/browser/birth-helpers.mjs` | 0 | PASS：语法 |
| `node --check tests/browser/learning.flows.spec.mjs` | 0 | PASS：语法 |
| `node --check tests/browser/workbench.visual.spec.mjs` | 0 | PASS：语法 |
| `pnpm exec playwright test --list tests/browser/birth-assessment.flows.spec.mjs --project=flows-chromium` | 0 | PASS：发现 5 个流程；仅发现，不是浏览器执行通过 |
| `pnpm exec playwright test --list tests/browser/workbench.visual.spec.mjs --grep birth` | 0 | PASS：发现 40 个视口/状态组合；不是 40 个独立样本或已验证截图 |
| `git diff --check` | 0 | PASS |
| `pnpm test:browser` | — | NOT_RUN：用户说明当前沙箱不能启动 Chromium，由评审方本机运行；本轮未尝试启动浏览器 |

出生 visual 用例保留八个项目，只对出生状态设置迁移视口：400×860 浅/深、400×640 浅/深、1366×900，
并保留 390×844 与 320×800 的窄屏覆盖。其他视图的视口与用例不改。
表格列宽、字号、标签/圆点尺寸、五级字号、溢出、控制尺寸和 axe 检查均保留为待执行断言。
本轮无实际浏览器版本、截图、axe 或真实浏览器控件通过证据。

### 中间失败（保留）

| 命令 | 当轮退出码 | 当轮结果与后续修正 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench test -- src/features/yunqi/birth` | 1 | FAIL：实际执行全 Workbench，216 通过、1 失败；候选标题在表格和摘句重复出现，断言改为表格的 h3 |
| `pnpm --filter @yunqi/workbench test` | 1 | FAIL：230 通过、1 失败；hook 测试把 Query 的异步 reset 通知当作同步，改为等待通知；组件的编辑即时隐藏断言保留 |
| `pnpm --filter @yunqi/workbench exec tsc -p tsconfig.test.json --noEmit` | 1 | FAIL：新测试的三处 Testing Library `getByRole` 参数误写 `exact`，删除该不支持参数，精确名称匹配保留 |

最终成功运行不替代上述失败记录。没有跳过用例、放宽业务断言或降低覆盖率门槛。

## 与原型的差异及原因

- 出生资料手动输入，增加明确提交、清空与“知道出生时刻”，不接 HIS；这是授权范围要求。
- API 关系名称沿用“出生 / 当前”，不把 API 原文改写为演示数据中的“先天 / 当下”；列头仍按画板③。
- 采用真实响应的年份、完整规范区间与当前快照；相较静态原型需要更多纵向空间，所有候选均可滚动查看。
- 为满足单屏最多五级字号，表格值、输入和本卡按钮统一 13px，关系方向说明 12px；保留 24px 干支、13.5px 摘句、12px 标签与 11px 元信息。尺寸仍通过本视图令牌实现。
- 当前基线仅含 C1/C2，尚无 C3 的原文页可直接导入。本卡复用已有 QuoteBlock，按画板②的紧凑范围分段和下钻结构实现出生阅读；合并 C3 时应核对共享阅读壳的复用方式。
- 同页量表内部仍是现有分组作答样式；本卡仅改入口和外部单列布局，C5 负责内部改造。

## 待决问题与证据限制

- 评审方仍须运行 `pnpm test:browser` 并查看画板③及出生原文的实际浅/深主题截图。不能据单测或 `--list` 宣称浏览器或视觉验收通过。
- C3/C5 并行合并时，需核对路由定义、入口样式 import、共享浏览器文件的局部增量；C5 的一题一屏改造还需迁移同页测评的旧分组操作。
- 工程检查不能代替规则专家确认、临床验收或完整 WCAG 审计。

## 源与构建快照

本记录加入前的 21 个新增/修改文件按路径排序，以 UTF-8 路径、NUL、文件字节、NUL 依次拼接后计算 SHA-256：
`a4f7170777be74ea8ccdcd85b3e5e1e8c13ebc0a51ca634cfd9ec07b8f58c21b`。
本记录不纳入自身哈希；清单即上文除本记录外的文件。

最终构建：

- `apps/yunqi-workbench/dist/assets/index-C0rcUbZf.js`：338.19 kB，SHA-256 `949e8f0c871dcb1a3fa7cfabd64d1dc21172f97844dcb506a6a308b5bef1f6ef`。
- `apps/yunqi-workbench/dist/assets/index-DP-d8HNV.css`：63.34 kB，SHA-256 `bb9c5b63e417cdf757bdc4428868b1bfeb4c4aad4acccaf2152fe4fbd2b4e521`。

构建与浏览器未并行；本轮没有启动 Service、HTTP、WebSocket 或浏览器进程，因此没有本轮监听端口待清理。
