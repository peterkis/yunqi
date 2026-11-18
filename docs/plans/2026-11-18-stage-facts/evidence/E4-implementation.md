**1. 完成内容**

| 验收项 | 状态与文件 |
| --- | --- |
| 标签、语气与版本 | DONE：`learning/rules.ts`、`movement-relation.ts` 落实六类标签，教学版本升至 `YQ-LEARNING-RULES-1.2.0`；Domain、Service 和 Workbench 回归断言同步。 |
| 新规则与历史保留 | DONE：新增 `rules/LEARNING_RULES_V1_2.md`，记录依据、原因和专家状态；1.0/1.1 规则文件哈希未变。 |
| 补丁遗漏 | DONE：补齐 Domain README、指引索引、时间指引、Workbench 指引及契约说明；`.gitignore` 加入 `test-results/`，未应用失败的本地产物。全仓检索结果见第 3 项。 |
| Workbench 展示 | DONE：运行时代码只改 `visual-mappings.ts` 的运关系语气；说明仍由 DTO 方向与五行拼接，页脚原文保持。 |
| 医疗边界 | DONE：新规则、Domain README、Workbench 指引及契约文档明确“相违”只是颜色语气，不是风险等级，不推导吉凶、疾病或治疗结论。 |
| 浏览器验收准备 | PARTIAL：`stage-facts-helpers.mjs` 已同步语气断言，语法和用例发现通过；实际浏览器、截图与 axe 未运行。 |

**2. 修改文件清单**

共 23 个文件；花括号逐项表示文件。

- `.gitignore`、`README.md`
- `packages/yunqi-domain/{README.md,src/learning/rules.ts,src/relation/movement-relation.ts,tests/learning.test.ts,tests/movement-relation.test.ts,tests/public-api.test.ts,tests/public-entry.test.ts}`
- `packages/yunqi-service/{README.md,tests/stage-facts-contract.test.ts}`
- `apps/yunqi-workbench/src/features/yunqi/presentation/{visual-mappings.ts,visual-mappings.test.ts}`
- `apps/yunqi-workbench/src/features/yunqi/{components/CurrentYunQiPage.test.tsx,birth/presentation/map-birth-view.test.ts}`
- `apps/yunqi-workbench/src/test/learning-fixtures.ts`
- `docs/agents/{README.md,rules-and-time.md,workbench.md}`
- `docs/contracts/YQ-API-CONTRACT-1.3.0.md`
- `rules/LEARNING_RULES_V1_2.md`、`tests/browser/stage-facts-helpers.mjs`
- [本报告 E4-implementation.md](/Users/petervans/Projects/YunQi/docs/plans/2026-11-18-stage-facts/evidence/E4-implementation.md)

基线：`feat/stage-facts`，HEAD `50b2c8f3960bd29e71a0951906a62f04b53dd8af`。原有 `source-plan.md` 改动、E4/E5 任务卡和两份补丁均按原字节保留；未提交、推送或切换分支。
22 个非证据修改文件按路径排序，以“路径 + NUL + 文件字节 + NUL”串接的 SHA256：`abcf257b613c202d0032496acbe7ea649c6adbbfd63cf2599ff5ed34459b1a88`。
本轮使用 Node `v24.18.0`、pnpm `10.32.1`，构建产物为 `index-BFeUcMLY.js`、`index-DDTgDD9l.css`。

**3. 检查结果**

| 命令 | 退出码与结果 |
| --- | --- |
| `pnpm build` | 0，PASS。 |
| `pnpm test` | 0，PASS；Domain 282、Service 272、Workbench 420 项通过，含其余包、治理、时区、生产入口及 OpenAPI 检查。 |
| `pnpm typecheck` | 0，PASS。 |
| `pnpm test:coverage` | 0，PASS；阈值和排除配置未改。 |
| `pnpm test:rule-consistency` | 0，PASS。 |
| `pnpm contracts:check` | 0，PASS；契约 1.3.0 无漂移。 |
| `pnpm test:contract-governance` | 0，PASS。 |
| `pnpm schema:validate` | 0，PASS。 |
| `pnpm test:project-guidance` | 0，PASS；指引编辑后及最终检查均通过。 |
| `pnpm test:time-governance` | 0，PASS。 |
| `pnpm test:workbench-governance` | 0，PASS。 |
| `node --check tests/browser/stage-facts-helpers.mjs` | 0，PASS。 |
| `pnpm exec playwright test --list` | 0，PASS；发现 217 项／12 文件，仅发现用例。 |
| `git diff --check` | 0，PASS。 |
| `git check-ignore test-results/.last-run.json` | 0，PASS；该产物未落盘。 |
| `pnpm test:browser` | 无退出码，NOT_RUN：按任务卡约定，沙箱无法启动 Chromium，由评审方运行。 |

覆盖率按语句／分支／函数／行排列：Domain `95.44/93.60/100/97.13%`，Client 全部 `100%`，Service `97.99/91.07/100/98.60%`，Workbench `99.24/98.04/99.67/99.58%`。
Domain 保留手写的 25 个五行有序对 oracle，并覆盖五行各自太少异同及主客互换；Service 新增 2022–2026 年真实 adapter 响应回归。测试与重复检查次数不代表独立专家或临床样本。

执行以下全仓检索：退出 0，PASS（逐项核对命中）；仅新规则文档的历史迁移说明、情形列和顺逆解释命中，不再将旧文案或 1.1.0 标作当前标签／版本。相同检索不带 `--untracked` 时退出 1，表示无匹配。

```sh
git grep --untracked -n -E "主运生客运|客运生主运|主运克客运|客运克主运|同属\{element\}'|YQ-LEARNING-RULES-1\.1\.0" -- . ':!docs/plans' ':!docs/superpowers' ':!docs/retrospectives' ':!rules/LEARNING_RULES_V1.md' ':!rules/LEARNING_RULES_V1_1.md' ':!**/dist/**'
```

范围与哈希核对通过：Service schema/mapper、OpenAPI、Contracts/Client、freeze/registry、历法、依赖、CI 和 `docs/design/` 均未改动。

**4. 与卡片／原始计划的差异及原因**

- 按 E4 和“追加”覆盖原计划的中性标签限制；仅应用 0001，排除 `test-results/*`，未应用 0002。
- 在参考补丁上补齐指定文档，并修正 Domain README 正文残留的“不用相得/顺/逆”；新增跨五行太少及真实 Service 标签回归，验证变更分支。
- 契约结构不变，未运行生成或冻结命令；保留“主客同运”和交运口径的待确认状态。

**5. 待决问题或风险**

- “主客同运”仍待专家单独确认；五步运交运口径及核心规则正式冻结状态未改变，工程通过不代表专家或临床验收。
- 实际浏览器、截图、字号布局与 axe 结果待评审方验证。
- 范围外文档待同步：Contracts README 的标签“仍待专家确认”描述、Contracts/Client README 的 1.1 规则链接；`docs/agents/api-contracts.md` 仍保留 E2 的 1.1.0 迁移描述。按本卡允许范围未修改。
- OpenAPI lint 保留 3 项警告：localhost server、health 缺少 4XX、YearParams 未引用；相关来源未改动。
