1. **完成内容**

   E2 契约实现 DONE；整仓门禁 PARTIAL。分支仍为 `feat/stage-facts`，HEAD 为 E1 提交 `74a2ced30be73b8f2a97cbbbdeb724a2f411a93a`；未提交、未推送。

   - DONE（要求1）：Service schema 补齐六值边界枚举、闭合且必填的进度/五运关系/边界标签；year 不带进度。文件：`src/schemas/{yunqi,learning,index}.ts`。
   - DONE（要求2）：mapper 直接复制 Domain 阶段事实，时间仍经 time-normalizer。文件：`src/mappers/yunqi-mapper.ts`、`src/services/learning-service.ts`。
   - DONE（要求3）：OpenAPI、生成类型、facade、registry 和新 freeze 均为 1.3.0；冻结投影覆盖全部8个业务端点。旧1.0/1.1/1.2 freeze 已与 E1 逐字节比较，一致。
   - DONE（要求4）：Service 2.3.0、Contracts/Client 1.3.0。Client transport 和方法签名无代码变化，随契约升 minor。
   - DONE（要求5）：新契约文档覆盖端点、字段含义、出生候选进度、闭合消费方迁移、教学 ruleVersion 1.1.0 及专家待确认状态。
   - DONE（要求6及补充）：更新 AGENTS、API 指引、根 README 和指引索引；Domain 入口版本为1.4.0，教学规则链接为 `LEARNING_RULES_V1_1.md`。
   - DONE（要求7）：真实 adapter 的各端点响应通过 schema；金标 `2026-11-18T08:44:00+08:00` 为五之气“秋分→小雪”、余4天、比例0.929；终运“客运生主运”、余63天、比例0.095。文件：`tests/stage-facts-contract.test.ts`、`tests/mapper.test.ts`、`tests/openapi-contract.test.ts`（均位于 Service）。

2. **修改文件清单**

   共31个文件；下列大括号表示逐个文件。

   | 范围 | 文件 |
   | --- | --- |
   | 根与文档 | `AGENTS.md`、`README.md`、`docs/agents/{README,api-contracts}.md`、`docs/contracts/YQ-API-CONTRACT-1.3.0.md`；本报告 [E2-implementation.md](/Users/petervans/Projects/YunQi/docs/plans/2026-11-18-stage-facts/evidence/E2-implementation.md) |
   | `packages/yunqi-service/` | `README.md`、`package.json`、`openapi/yunqi-service.openapi.yaml`、`src/schemas/{yunqi,learning,index}.ts`、`src/mappers/yunqi-mapper.ts`、`src/services/learning-service.ts`、`src/plugins/openapi.ts`、`tests/{mapper,openapi-contract,stage-facts-contract}.test.ts` |
   | `packages/yunqi-contracts/` | `README.md`、`package.json`、`src/index.ts`、`src/generated/openapi.ts`、`tests/contracts.typecheck.ts`、`contract/registry.json`、`contract/YQ-API-CONTRACT-1.3.0.freeze.json` |
   | `packages/yunqi-client/` | `README.md`、`package.json` |
   | Workbench（仅补夹具字段） | `apps/yunqi-workbench/src/test/{yunqi-fixtures,learning-fixtures}.ts` |
   | 契约治理 | `scripts/yunqi-contract-projection.mjs`、`tests/yunqi-contract-governance.test.mjs` |

3. **检查结果**

   本机 Node `v24.18.0`、pnpm `10.32.1`。修改文件（不含本报告）的 SHA-256：`8da6247dce397f4a266ad05de9b315e0c0cbb8ae375b1b0aa1749266587f75b1`，按排序后的相对路径、NUL、文件字节、NUL依次计算。

   | 命令 | 结果 / 退出码 | 摘要 |
   | --- | --- | --- |
   | `pnpm openapi:generate`（内部执行 `pnpm contracts:generate`） | PASS / 0 | 生成1.3.0 OpenAPI与类型 |
   | `pnpm contracts:freeze` | PASS / 0 | 只追加1.3.0 |
   | `pnpm build` | PASS / 0 | 全部包构建通过 |
   | `pnpm test` | FAIL / 1 | Domain 278、adapter 37、Client 10、Service 267通过；Workbench 392通过、4失败，均为旧契约ID断言 |
   | `pnpm typecheck` | FAIL / 1 | 首轮新增Service测试辅助函数的可选payload类型错误已修复；复跑仅余Workbench旧ID的TS2322 |
   | `pnpm test:coverage` | FAIL / 1 | Domain/Client/Service达到原阈值；Workbench同4个失败，未获得其完整覆盖率结论 |
   | `pnpm contracts:check` | PASS / 0 | 生成漂移、冻结及历史基线检查通过 |
   | `pnpm test:contract-governance` | PASS / 0 | 45项；保留历史测试，新增差异白名单与变异检查 |
   | `pnpm schema:validate` | PASS / 0 | 6项通过 |
   | `pnpm test:project-guidance` | PASS / 0 | 15项及链接、预算检查通过 |
   | `pnpm test:time-governance` | PASS / 0 | 12项通过 |
   | `pnpm test:browser` | NOT_RUN / 无 | 按任务卡，本沙箱不启动Chromium，交评审方运行 |
   | `pnpm --filter @yunqi/service exec vitest run tests/mapper.test.ts tests/openapi-contract.test.ts tests/stage-facts-contract.test.ts` | PASS / 0 | 21项通过 |
   | `pnpm --filter @yunqi/service test:typecheck` | PASS / 0 | 测试辅助函数修正后通过 |
   | `pnpm --filter @yunqi/workbench test:typecheck` | FAIL / 1 | `src/test/contract.typecheck.ts:12`仍要求1.2.0 |
   | `pnpm test:workbench-governance` | PASS / 0 | 293项通过 |
   | `pnpm test:time-purity` | PASS / 0 | Domain与Service时间纯度通过 |
   | `pnpm --filter @yunqi/service test:timezone` | PASS / 0 | 时区独立性通过 |
   | `pnpm --filter @yunqi/service smoke:production-entry` | PASS / 0 | 生产入口通过 |
   | `pnpm --filter @yunqi/service openapi:lint` | PASS / 0 | 保留3条警告：localhost server、health无4xx、YearParams未引用 |
   | `pnpm --filter @yunqi/service openapi:check` | PASS / 0 | 生成物检查通过 |
   | `node --check tests/yunqi-contract-governance.test.mjs`；逐文件 `node --check` 浏览器目录17份mjs | PASS / 均0 | 仅语法检查 |
   | `pnpm exec playwright test --list --reporter=list` | PASS / 0 | 发现11份文件、208个用例；未执行浏览器 |
   | Node内联字节/范围校验；`git diff --check` | PASS / 均0 | 旧freeze字节一致，Domain无差异，修改范围、分支及HEAD符合约束 |

   覆盖率按语句/分支/函数/行：Domain 95.43/93.51/100/97.12%，Client均100%，Service 97.99/91.07/100/98.60%。未改阈值、exclude或跳过测试；以上为工程检查，不是专家或临床案例数。

4. **与卡片/原始计划的差异及原因**

   按README调整表采用六值边界枚举，并将气进度放在 `YunQiCalculationDto`，因此learning/出生候选的facts也带出。OpenAPI文档版本依既有升级先例由1.4.0升至1.5.0；业务契约为1.3.0。

   全仓门禁未全绿：Workbench旧ID断言超出E2“仅为类型检查补夹具required字段”的修改授权，按通用要求保留并报告，未改页面、mapper、组件或这些断言。

5. **待决问题或风险**

   - 后续卡需同步Workbench的 `App.test.tsx:49`、`CurrentYunQiPage.test.tsx:163`、`rule-traceability-panels.test.tsx:34`、`TimeAnalysisPage.test.tsx:86` 和 `src/test/contract.typecheck.ts:12` 中的旧ID；当前整仓测试、类型和覆盖率仍为FAIL。
   - 静态检索还发现Workbench README、`tests/browser/{workbench,ux-walkthrough}.flows.spec.mjs`引用旧ID；这些文件超出本卡范围。浏览器实际结果仍为NOT_RUN。
   - 闭合校验消费方及精确教学版本检查/缓存须按新契约迁移；教学标签仍待专家确认。

