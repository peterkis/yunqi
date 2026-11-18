# F4 实现证据

2026-11-18；分支 `feat/prototype-finals`；基线 HEAD `79a8a96672d0ce5d51aeff84cd944e6d81add1d1`。
初始工作区仅有用户未跟踪补丁；本轮未提交、推送或切换分支。Node `v24.18.0`，pnpm `10.32.1`。

## 1. 完成内容

- **DONE：作答页结构实现。** `ConstitutionContext` 与九质进度合卡；先天栏覆盖无资料、单候选、多候选（完整候选 aria-label）；上下文详情及计算版本移至页底来源说明旁。`map-constitution` 按 DTO 题目归属计数、过滤性别分母，保留标准顺序；共享题分别计入、当前所属维度全部高亮，答完显示 ✓。
- **DONE：题头、选项与焦点修复实现。** `ConstitutionForm` 仅将题干和提示放入黛青题头；`ScaleOption` 可选程度圆点与完整可访问名称，选中实底；上一题、结束操作和性别确认逻辑保留。`constitution.css` 仅为题干取消 outline；`keepFocus` 原逻辑及其延时不抢焦点回归测试保留并通过。
- **PARTIAL：全部门禁验收。** 非浏览器检查通过；浏览器用例已同步，`constitution-questions`、`birth-assessment` 覆盖 400×860、1366×768、1920×1080（及其余现行矩阵），保留五档字号、axe、外网请求拒绝。实际截图、焦点、对比度及 axe 由评审方执行，未宣称浏览器通过。

## 2. 修改文件清单

以下 23 个实现、测试及说明文件，另加本证据文件，共 24 个文件：

```text
apps/yunqi-workbench/src/components/design/ScaleOption.test.tsx
apps/yunqi-workbench/src/components/design/ScaleOption.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionAssessmentPanel.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionContext.test.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionContext.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx
apps/yunqi-workbench/src/features/constitution/pages/ConstitutionPage.test.tsx
apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.test.ts
apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.ts
apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonNavigation.test.tsx
apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx
apps/yunqi-workbench/src/styles/views/constitution.css
apps/yunqi-workbench/src/test/learning-fixtures.ts
tests/browser/README.md
tests/browser/birth-assessment.flows.spec.mjs
tests/browser/constitution-actions.flows.spec.mjs
tests/browser/constitution-helpers.mjs
tests/browser/learning.flows.spec.mjs
tests/browser/visual-assertions.mjs
tests/browser/workbench.flows.spec.mjs
tests/browser/workbench.visual.spec.mjs
```

上述清单依序连接 `UTF8(路径) + NUL + 文件字节 + NUL` 的 SHA-256：
`75f0637f2fb867461e85acf177b2c8bb6d9c7e40b71e04721c7768497de49264`（不含本证据）。
用户 `0001-…F1-F5.patch` 保持未跟踪且未修改，交付时 SHA-256：
`da5d1d9e19d3af990bb2dd6915c9e0ee0efdddc79c191c74a7cfe30870af3337`。

## 3. 检查结果

先执行 `pnpm build`（0），再执行包内测试。首轮 Workbench 测试 **FAIL（1，7 项失败）**：一个字号继承写法、五个旧选项名称断言、一个旧上下文位置断言；`test:typecheck` **FAIL（1）**：测试查询元素类型。修正后再次构建并复跑通过，未删除测试或放宽阈值。

| 命令 | 最终结果 / 退出码 |
| --- | --- |
| `pnpm build` | PASS / 0；生产 CSS 检查通过 |
| `pnpm --filter @yunqi/workbench build` | PASS / 0（根 build 调用） |
| `pnpm --filter @yunqi/workbench test` | PASS / 0；65 文件、441 测试 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS / 0 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS / 0 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS / 0（根 coverage 调用） |
| `pnpm test` | PASS / 0；OpenAPI lint 有 3 条 warning |
| `pnpm typecheck` | PASS / 0 |
| `pnpm test:coverage` | PASS / 0；Workbench 语句 99.29%、分支 98.20%、函数 99.70%、行 99.60% |
| `pnpm test:workbench-governance` | PASS / 0 |
| `pnpm test:time-governance` | PASS / 0 |
| `pnpm test:project-guidance` | PASS / 0 |
| `pnpm contracts:check` | PASS / 0 |
| `pnpm schema:validate` | PASS / 0；6 测试 |
| `node --check`（逐个检查 `tests/browser/*.mjs`） | PASS / 0；19 模块 |
| `pnpm exec playwright test --list` | PASS / 0；225 用例、12 文件；仅清单发现 |
| `git diff --check` | PASS / 0 |
| `pnpm test:browser` | NOT_RUN / —；按通用要求，沙箱无法启动 Chromium，由评审方运行并生成截图 |

构建和聚合检查串行执行；浏览器验收 runner 未启动，无该 runner 的服务清理项。测试及覆盖率为工程回归，非独立专家或临床案例。

## 4. 与设计规范或原型的差异及原因

- 按通用要求映射既有字号：题干 20、已答数 14、提示及元信息 12；九格间距用既有 4px 令牌代替参考稿 5px，不新增档位。
- 上下文复用本次快照的完整摘要及先天候选；题目、分母、进度来自真实问卷，不照抄参考稿示例值。黛青题头和选中项按 F4 的明确要求实现。

## 5. 待决问题或风险

- 浏览器视觉、实际焦点、两主题对比度、axe 与无外网请求的实测仍待评审；三档作答截图尚未生成。
- OpenAPI lint 的 3 条 warning 为 localhost server、health 缺少 4XX 响应、未使用的 YearParams；本卡未修改 OpenAPI。F5 结果实现、计分、题目顺序及专家状态未变。

## 返工 1

2026-11-18；分支仍为 `feat/prototype-finals`，HEAD 仍为 `79a8a96672d0ce5d51aeff84cd944e6d81add1d1`；Node `v24.18.0`、pnpm `10.32.1`。本轮开始时保留已有 F4 未提交改动及未跟踪资料，以文件内容快照核对本轮差异。

**评审反馈（保留初始失败）：** 评审方执行 `pnpm test:browser`，结果为 **224 passed、1 failed**。失败用例为 `tests/browser/birth-assessment.flows.spec.mjs:193` 的 `birth comparison retains every real boundary candidate, its canonical interval and one shared questionnaire`，旧第 219 行在 aside「本次测评对照背景」中点击「本次对照快照与候选区间」超时。F4 已将该折叠项移至页底，测试的查找范围未同步。

**修改与排查：** 本轮仅修改上述浏览器测试及本证据文件。折叠项改从页底 `.constitution-notes` 展开，所有候选的数量、可见性及 `from.localTime` / `until.localTime` 精确边界均在该区域检查；aside 检查改为候选数量摘要。保留一份问卷、一次问卷请求、零额外当下查询，以及清空和存储隔离断言，未调整超时或重试。

已检索 `tests/browser`（含 helpers）与 `apps` / `packages` 单测中的两个折叠项文案及相关上下文、候选和时间详情选择器；仅发现本用例一处旧查找范围，其点击、候选计数与逐候选定位已一并改写。其余单测已从页面或页底详情取值，无需修改；原有“aside 内不存在计算详情”的否定断言保留。

首轮单测日志显示 65 文件、441 测试通过，但终态查询返回 `Unknown process id`，未取得该轮退出码；直接复跑同命令，确认 441 测试通过且退出码 0，下表记录复跑结果。

| 命令 | 本轮结果 / 退出码 |
| --- | --- |
| `node --check tests/browser/birth-assessment.flows.spec.mjs` | PASS / 0；本轮唯一改动的测试文件 |
| `pnpm --filter @yunqi/workbench test` | PASS / 0；65 文件、441 测试 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS / 0 |
| `git diff --check` | PASS / 0 |
| `pnpm test:browser` | NOT_RUN / —；按本轮要求由评审方复验 |

返工后测试文件 SHA-256：`22f5cb0e4eb8dd46342773bc19fa7724814ff7fc9984dc14758ca8f4e6f28b85`。与本轮开始快照相比，业务源码及其他已有文件内容未变；原始失败和此前证据保留。浏览器完整通过仍待评审方复跑确认；本轮未提交或推送。
