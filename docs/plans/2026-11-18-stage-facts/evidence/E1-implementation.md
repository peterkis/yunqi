1. 完成内容

   - DONE A1：新增冻结的主客运关系函数与 `MovementRelationResult`，只比较五行生克，不含 `qiRelation`。
   - DONE A2：新增中性标签表，教学规则升级至 `YQ-LEARNING-RULES-1.1.0`。
   - DONE A3：五步 `MovementStep` 均带 `relation`。
   - DONE B4：六步均带闭合类型的 `startTerm/endTerm`，直接派生自 `STEP_BOUNDARY_TERMS`；核心规则仍为 `YQ-MVP-RULES-1.1.0`。
   - DONE B5：交运偏移提为单一冻结常量，时刻与标签同源；1900–2100 年气、运边界与改动前逐毫秒一致。
   - DONE C6：新增纯阶段进度函数，覆盖三位小数、0.999 上限、固定北京时间日差、冻结结果及无效区间。
   - DONE C7：两个有日期计算入口带 `currentStepProgress`，Learning 带 `currentMovementProgress`；其余步不带进度。
   - DONE C8：公开新函数、类型、常量，同步公共入口与类型测试；Domain 升至 `1.4.0`。
   - DONE D9：新增教学规则 1.1，保留 1.0，更新指定指引链接，记录原因、专家状态、E4 三问及现行旋转口径的评审发现。

   金标：2026-11-18 08:44 北京时间，五之气“秋分→小雪”，进度 **0.929 / 剩余4日**；终运主太羽、客少商，为“客运生主运”，进度 **0.095 / 剩余63日**。五种方向、阶段起点、结束当日、跨年大寒及毫秒边界测试通过。这些是工程回归结果，不是专家或独立天文验收。

2. 修改文件清单

   以下 Domain 路径均相对 `packages/yunqi-domain/`：

   - 文档与版本：`README.md`、`package.json`。
   - 源码：`src/types.ts`、`src/index.ts`、`src/calendar/time.ts`、`src/calendar/stage-progress.ts`、`src/relation/movement-relation.ts`、`src/liuqi/six-qi.ts`、`src/learning/rules.ts`、`src/learning/movements.ts`、`src/learning/calculate-learning.ts`、`src/services/calculate-yunqi.ts`。
   - 测试：`tests/learning.test.ts`、`tests/public-api.test.ts`、`tests/public-entry.test.ts`、`tests/movement-relation.test.ts`、`tests/stage-progress.test.ts`、`tests/fixtures/stage-facts-2026.ts`。
   - 规则与指引：[LEARNING_RULES_V1_1.md](/Users/petervans/Projects/YunQi/rules/LEARNING_RULES_V1_1.md)、[rules-and-time.md](/Users/petervans/Projects/YunQi/docs/agents/rules-and-time.md)。
   - 证据：本计划 `evidence/E1-*`，含本报告、原始检查日志、改前边界、校验脚本及状态清单。20 个实现/规则文件的完整路径与 SHA-256 见 [E1-state.json](/Users/petervans/Projects/YunQi/docs/plans/2026-11-18-stage-facts/evidence/E1-state.json)，命令日志索引见 [E1-checks.jsonl](/Users/petervans/Projects/YunQi/docs/plans/2026-11-18-stage-facts/evidence/E1-checks.jsonl)。

3. 检查结果

   | 命令 | 结果 / 退出码 |
   | --- | --- |
   | `pnpm build:contract-source` | PASS / 0 |
   | `pnpm --filter @yunqi/domain test` | PASS / 0，278 项测试 |
   | `pnpm --filter @yunqi/domain typecheck` | PASS / 0 |
   | `pnpm --filter @yunqi/domain test:typecheck` | PASS / 0 |
   | `pnpm --filter @yunqi/domain test:time-purity` | PASS / 0 |
   | `pnpm --filter @yunqi/domain test:coverage` | PASS / 0，基线及补充检查 |
   | `pnpm test:rule-consistency` | PASS / 0 |
   | `pnpm test:time-governance` | PASS / 0 |
   | `pnpm test:project-guidance` | PASS / 0 |
   | `pnpm test` | PASS / 0，初轮及最终轮均通过，下游无序列化失败 |
   | `pnpm typecheck` | PASS / 0，初轮及最终轮均通过 |
   | `pnpm test:coverage` | PASS / 0，初轮及最终轮均通过命令门禁；覆盖率比较见下文 |
   | `node docs/plans/2026-11-18-stage-facts/evidence/E1-verify-boundaries.mjs` | PASS / 0，201 年边界回归及真实适配器金标 |
   | `node docs/plans/2026-11-18-stage-facts/evidence/E1-verify-scope.mjs` | PASS / 0，白名单、历史文件及覆盖率比较 |
   | `node --check docs/plans/2026-11-18-stage-facts/evidence/E1-verify-boundaries.mjs` | PASS / 0 |
   | `node --check docs/plans/2026-11-18-stage-facts/evidence/E1-verify-scope.mjs` | PASS / 0 |
   | `git diff --check` | PASS / 0 |
   | `pnpm test:browser` | NOT_RUN / 无退出码；任务卡指定沙箱无法启动 Chromium，交评审方运行。E1 无界面或浏览器用例改动。 |

   Domain 最终覆盖率：语句 **95.43%**、分支 **93.51%**、函数 **100%**、行 **97.12%**，均不低于基线。首轮命令退出 0，但行覆盖率 96.88% 低于基线 96.94%，该“不下降”验收项曾为 **FAIL**；补充次年大寒当刻进入新年的断言后通过。初轮日志原样保留，未降低阈值或添加排除项。

4. 与卡片/原始计划的差异及原因

   按 README 调整表使用六气边界的六值闭合类型，并新建教学规则 1.1 文件；与 E1 卡片无范围偏离。六气新增字段只是派生投影，核心规则版本不变。进度接入从权威本地日期字段构造规范 instant，保留既有日历归属行为。

   分支保持 `feat/stage-facts`，HEAD 保持 `bc86e17d64e4e0af5f9abbfaec93ce1914d21046`；未提交、推送或切换分支，未运行契约生成/冻结命令，未修改下游包、旧规则及历史证据。

5. 待决问题或风险

   - E2 的 API 投影/契约及 E3 的界面仍待后续任务；E4 三问仍待用户或中医专家确认，工程结果不替代专家结论。
   - 根 `README.md` 与 `docs/agents/README.md` 仍列 Domain 1.3.1 和教学规则 1.0；超出 E1 白名单，已保留，需后续同步。
   - OpenAPI lint 保留 3 个警告：`no-server-example.com`、`operation-4xx-response`、`no-unused-components`；对应文件本卡未修改。

   同内容报告已写入 [E1-implementation.md](/Users/petervans/Projects/YunQi/docs/plans/2026-11-18-stage-facts/evidence/E1-implementation.md)。
