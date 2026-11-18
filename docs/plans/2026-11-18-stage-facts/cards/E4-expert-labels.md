# E4 专家标签落地：主客运关系，教学规则 1.2.0

> 本卡**覆盖** `_common.md` 中“不加相得/顺/逆到五运主客运”一条：专家已于 2026-11-18 答复，标签改为专家确认口径。其余通用要求不变。

## 依据

- 用户 2026-11-18 下达的计划“E4 结论与落地”一节（见 `source-plan.md` 末节）。
- 参考实现：`source/0001-E4-expert-labels-learning-rules-1.2.0.patch`（基于本分支，可 `git apply` 后在其上修正）。补丁是参考，不是验收标准；以下要求优先。

## 允许修改

`packages/yunqi-domain/**`、`packages/yunqi-service/README.md` 与 `packages/yunqi-service/tests/**`、`apps/yunqi-workbench/src/**`（仅关系标签语气与相关测试/夹具）、
`tests/browser/stage-facts-helpers.mjs`、新增 `rules/LEARNING_RULES_V1_2.md`、根 `README.md`、`docs/agents/README.md`、`docs/agents/rules-and-time.md`、`docs/agents/workbench.md`（局部）、
`docs/contracts/YQ-API-CONTRACT-1.3.0.md`（局部）、本计划 `evidence/`。
不改 Service schema/mapper、OpenAPI、Contracts、Client、freeze/registry；不改 `rules/LEARNING_RULES_V1.md`、`rules/LEARNING_RULES_V1_1.md`。

## 要求

1. 标签与语气（与补丁一致）：

   | direction / 情形 | traditionalLabel | Workbench 语气 |
   | --- | --- | --- |
   | HOST_GENERATES_GUEST | 相得 · 主生客 | favorable |
   | GUEST_GENERATES_HOST | 相得 · 客生主 | favorable |
   | GUEST_CONTROLS_HOST | 顺 · 客胜主 | favorable |
   | HOST_CONTROLS_GUEST | 逆 · 主胜客 | adverse |
   | NONE，太少不同 | 同属{element}运 · 太少不同 | neutral |
   | NONE，太少相同 | 主客同运 | neutral |

   `LEARNING_RULE_VERSION` → `YQ-LEARNING-RULES-1.2.0`。契约 1.3.0 结构不变（字段都是字符串），不得重新生成或冻结契约。
2. 新增 `rules/LEARNING_RULES_V1_2.md`（可用补丁内容），旧 1.0/1.1 文件原样保留。
3. **补丁遗漏，必须补齐**：
   - 不得提交补丁中的 `test-results/.last-run.json`（Playwright 本地产物，状态还是 failed）。若该目录会被生成，在 `.gitignore` 加 `test-results/`。
   - `packages/yunqi-domain/README.md` 中“来源及本轮增量见[教学规则 1.1]”改指 1.2（并保留对 1.1 的引用）。
   - `docs/agents/README.md` 第 16 行教学规则版本与链接、`docs/agents/rules-and-time.md` 第 8 行教学规则链接 → 1.2。
   - `docs/agents/workbench.md` 约 116 行“生用相合色，同五行和克用中性色” → 按上表更新（客胜主=顺相合、主胜客=逆相违、同五行中性）。
   - `docs/contracts/YQ-API-CONTRACT-1.3.0.md`：第 5、47、64、79、81 行一带描述教学规则 1.1.0 与旧中性标签；改为当前 1.2.0 与新标签，并注明“契约结构不变，标签来自教学规则 1.2.0 专家确认”。
   - `git grep` 全仓（排除 `docs/plans`、`docs/superpowers`、`docs/retrospectives`、旧规则文件、dist）确认不再有 `主运生客运|客运生主运|主运克客运|客运克主运|同属{element}'`（五运语境）与 `YQ-LEARNING-RULES-1.1.0` 的“当前版本”表述。旧版本作为历史说明出现可以保留。
4. Workbench：仅改 `visual-mappings.ts` 中运关系语气；说明句仍由 DTO 方向+五行拼接，不在 UI 写生克表。页脚“五步运为教学口径，待专家确认 · 辅助参考，不作诊断依据”不变（交运口径仍待确认）。
5. 医疗边界：标签只描述运气结构；文档写明“相违”只是颜色语气，不是风险等级，不推导吉凶、疾病或治疗。

## 检查命令

`pnpm build`、`pnpm test`、`pnpm typecheck`、`pnpm test:coverage`、`pnpm test:rule-consistency`、`pnpm contracts:check`、`pnpm test:contract-governance`、
`pnpm schema:validate`、`pnpm test:project-guidance`、`pnpm test:time-governance`、`pnpm test:workbench-governance`；浏览器 NOT_RUN（`node --check tests/browser/stage-facts-helpers.mjs`）。
