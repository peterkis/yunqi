# 通用要求（每张卡都适用）

你在 TCM YunQi Lab 仓库中工作，分支 `feat/stage-facts`。先读 `AGENTS.md`、`CLAUDE.md`、`CODING_STANDARDS.md`，
本计划 `README.md`（含“与原计划的调整”，优先于原始计划）与 `source-plan.md`，再读本卡“必读”。

## 规则

- 只做本卡范围内的事；发现超出范围的问题写进最终报告，不要顺手改。各卡允许修改的包在卡内写明，其余包不动。
- 不提交、不推送、不切换分支、不改 git 配置。不删除或改写历史证据、原始资料、旧规则版本文件、旧契约冻结文件和 `docs/design/` 下的同步文件。
- 不新增运行时依赖。
- 业务时间：Domain 禁止 Date/Temporal/Intl；不读本机时钟；固定北京时间 UTC+08。UI 只展示 API `localTime`（可截取子串），不做任何时间差运算。
- 医疗边界：只陈述生克方向，不加“相得/顺/逆”到五运主客运，不出现吉凶、疾病、治疗结论。
- 不得删除、跳过或放宽仍覆盖现有行为的测试；不降低覆盖率阈值，不加 coverage exclude。
- `pnpm contracts:generate` / `contracts:freeze` / `openapi:generate` 只有 E2 可用，且只为分配 1.3.0。

## 检查

按本卡“检查命令”运行。你的沙箱无法启动 Chromium：`pnpm test:browser` 记 NOT_RUN，由评审方运行；但浏览器用例仍须按新界面改写，
并至少 `node --check`。其他被沙箱阻止的检查同样记 NOT_RUN 并写明原因，不要伪造结果。

## 最终报告（最后一条消息，中文，按此结构）

1. 完成内容：按验收标准逐条 DONE / PARTIAL / NOT_DONE，并给出文件。
2. 修改文件清单。
3. 检查结果：每条命令及退出码（PASS / FAIL / NOT_RUN + 原因）。
4. 与卡片/原始计划的差异及原因。
5. 待决问题或风险。
