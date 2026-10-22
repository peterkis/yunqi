# 项目指引索引

根 [AGENTS.md](../../AGENTS.md) 是任务入口；匹配任务后读取本目录的详细约束。
这些文档承接原AGENTS要求，不赋予新业务或医疗能力。

| 主题 | 入口 | 权威来源 |
| --- | --- | --- |
| 领域、规则、时间、未来持久化 | [rules-and-time.md](rules-and-time.md) | [规则表](../../rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md)、[ADR-001](../architecture/adr/ADR-001-fixed-beijing-time-semantics.md) |
| DTO所有权、契约、服务及客户端 | [api-contracts.md](api-contracts.md) | [ADR-002](../architecture/ADR-002-yunqi-contract-freeze.md)、[Contract 1.1.0](../contracts/YQ-API-CONTRACT-1.1.0.md) |
| React依赖、路由、Provider、展示 | [workbench.md](workbench.md) | [Workbench README](../../apps/yunqi-workbench/README.md)、[治理脚本](../../scripts/check-yunqi-workbench-governance.mjs) |
| 医疗边界、问诊、Phase3-E | [clinical-scope.md](clinical-scope.md) | [临床验证入口](../clinical-validation/phase3-e/README.md) |
| 相关检查、浏览器、交付证据 | [verification.md](verification.md) | [根命令](../../package.json)、[CI](../../.github/workflows/ci.yml) |
| 历史会话与常见错误检索 | [history-and-evidence.md](history-and-evidence.md) | [复盘索引](../retrospectives/README.md) |
| 审查中的判断事项 | [CODING_STANDARDS.md](../../CODING_STANDARDS.md) | 本项目规格、当前差异和实际证据 |

## 使用和维护

- 当前用户明确授权、适用AGENTS、版本化规则/契约及其架构决策共同确定本轮范围。
  旧附件背景、历史草案和过去PASS不能覆盖当前事实；冲突须说明采用依据。
- 当前规则状态仍以 [RULE_FREEZE_NOTE.md](../../rules/RULE_FREEZE_NOTE.md) 为准。
  API工程冻结、专家规则冻结和临床Gate是不同状态。
- 改动规则或契约版本时，同步当前入口与生成物；保留旧版本和迁移影响。
- 更新指引后执行 `pnpm test:project-guidance`。根文件预算为4KiB/70行，是本项目约定。
  链接、命令、来源索引及原文覆盖映射由检查器验证；语义强度仍需人工复核。
- 原文归档及条款去向见 [迁移映射](../retrospectives/2026-10-18-guidance-migration.md)。

## OpenAI官方依据

2026-10-18读取 [Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)。
官方说明根到当前目录合并指引、近目录约束具有更高优先级、默认合计预算32KiB；
审查规则应简明，格式和lint交给CI。外部普通Markdown不会自动加载，因此根文件提供明确任务触发入口。
本次采用“小根文件＋按任务读取”的项目设计，没有把4KiB预算冒称为OpenAI硬性要求，也没有修改全局Codex配置。
