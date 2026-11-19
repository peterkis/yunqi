# E5 同五行、太少相同 实施证据

- 分支 `feat/learning-rules-1.3`，基线 `d0751ab15ec02796867d028b3f608caec73d1730`。评审方提供的 E5 卡 SHA-256 仍为 `b8156d6c96cab473f210448f7a195b024990c2bccd6ed27d97ec90ec62fb7dcb`。
- Node `v24.18.0`、pnpm `10.32.1`。生产构建产物 `index-BAswbPmJ.js`、`index-BhxS4Pam.css`。

### 分项摘要

| 验收项 | 实现和文件 |
| --- | --- |
| 领域 | `learning/rules.ts` 升至 `YQ-LEARNING-RULES-1.3.0`。`movement-relation.ts` 用同一替换表达式展开两种同五行标签，关系判定和结果结构沿用原实现。`movement-relation.test.ts`、`learning.test.ts` 和两个公共入口测试覆盖五行、太少及版本。 |
| 规则与历史 | 新增 [教学规则 1.3](../../../../rules/LEARNING_RULES_V1_3.md)，按用户转述记录 2026-11-19 专家答复。用 `calculateYearYunQi`、`buildMovementSteps` 与 tyme4ts 核对壬寅、丁未的逐步表。1.2 文档只加替代指向。根 README、相关包 README 与 `docs/agents` 的当前规则引用已同步，`tests/yunqi-rule-consistency.test.mjs` 校验版本和模板。 |
| 服务与契约 | `stage-facts-contract.test.ts` 核验壬寅五步标签、教学版本与 `x-yunqi-contract-id`。契约说明追加 E5 沿革。Service 继续映射 Domain 版本，OpenAPI 搜索无适用旧示例，schema、DTO、registry 和 freeze 沿用原基线。 |
| Workbench | `CurrentPeriodGrid.tsx` 和 `RelationChip.tsx` 仅为气运对称卡复用 F6 `SegmentedText`。标签由 DTO 提供，保持中性。组件、映射单测及教学夹具已同步。`stage-facts.flows.spec.mjs` 用真实 Service 重放 `2022-03-01T12:00:00+08:00` 的初运快照，检查中性标签、无“不和”、400 宽各分段和分段内文字的矩形数，以及展开后的教学版本。 |
| 计划及现场验证 | 阶段事实 README 登记专家确认和本卡待评审状态。[M1-e 院内现场表](../../2026-11-18-motion-flows/evidence/M1-field-check.md)列出六种环境，均为 NOT_RUN。 |

### 检查摘要

| 命令 | 退出码与结果 |
| --- | --- |
| `pnpm build` | 0，PASS |
| `pnpm typecheck` | 首轮 1，FAIL，契约 ID 断言误用了响应 DTO。改查 OpenAPI 扩展字段后重跑 0，PASS。 |
| `pnpm test` | 0，PASS。Domain 283、Service 272、Workbench 726 项通过。OpenAPI lint 保留 3 项既有警告。 |
| `pnpm test:coverage` | 0，PASS。Workbench 语句 99.02%、分支 97.53%、函数 99.59%、行 99.71%。 |
| `pnpm test:workbench-governance` | 0，PASS |
| `pnpm test:time-governance` | 0，PASS |
| `pnpm test:project-guidance` | 0，PASS |
| `pnpm test:rule-consistency` | 0，PASS |
| `pnpm contracts:check` | 0，PASS，契约无漂移 |
| `pnpm test:contract-governance` | 0，PASS |
| `pnpm schema:validate` | 0，PASS |
| `node --input-type=module`（2022 固定时点的 Fastify `inject` 检查） | 0，PASS，固定时钟的 `learning/current` 与浏览器夹具使用的 `learning/calculate` 响应相同。 |
| `node --check tests/browser/stage-facts.flows.spec.mjs` | 0，PASS |
| `node --check tests/browser/stage-facts-helpers.mjs` | 0，PASS |
| `pnpm exec playwright test tests/browser/stage-facts.flows.spec.mjs --project=flows-chromium --list` | 0，PASS，发现 4 项 |
| `pnpm exec playwright test --list` | 0，PASS，发现 444 项，仅为用例发现 |
| `pnpm exec playwright test tests/browser/stage-facts.flows.spec.mjs --project=flows-chromium` | 1，浏览器断言 NOT_RUN。Fastify 与 Vite 就绪并正常清理，Chromium 在 macOS `MachPortRendezvousServer` 注册时收到 `Permission denied (1100)`，用例均未进入页面。计划视口为 400×860。 |
| `pnpm test:browser` | 无退出码，NOT_RUN，由评审方本机运行。 |
| `git diff --check` | 0，PASS |
| `rg` 查找 `apps/`、`packages/`、`tests/`、`scripts/` 的旧标签 | 1，无匹配，排除构建产物及依赖目录。 |

浏览器启动及清理记录位于本地 `.artifacts/browser/2026-11-19T07-46-53-381Z-1d12a307/`。
