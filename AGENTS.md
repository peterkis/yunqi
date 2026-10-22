# TCM YunQi Lab

面向院内医生的五运六气规则学习、计算和只读展示原型。输出限于理论说明、规则解释、线索整理和教学提示；禁止自动诊断、辨证、处方、治疗建议及疾病因果推断。

## 工作约定

- 先读任务对应文档、理解规则并说明修改计划，再编辑；完成后执行相关检查并报告结果。
- 核心计算只消费版本化规则，经纯 `packages/yunqi-domain` 输出结构化结果；规则变更须更新版本、说明、测试、原因和专家状态。
- 当前规则 `YQ-MVP-RULES-1.1.0`，API Contract `YQ-API-CONTRACT-1.1.0`。规则仍待正式专家冻结，工程通过不能替代专家或临床验收。
- 业务时间固定北京时间 UTC+08，历法权威为 `YunQiCalendarTime`；UI直接展示API `localTime`。不得用Date、Temporal、Intl、IANA或DST重建业务时间。
- 保留原始资料、历史证据和无关工作。遵守用户授权范围；提交、推送、发布或清理按本次授权执行。

## 按任务读取

编辑前必须读取匹配条目；详细约束和来源由下列文档继续导航。

| 任务 | 必须读取 |
| --- | --- |
| 规则、Domain、历法、时间或未来持久化 | [规则与时间](docs/agents/rules-and-time.md)、[当前规则表](rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md) |
| Service、OpenAPI、DTO、Contracts、Client | [API边界](docs/agents/api-contracts.md)、[当前契约](docs/contracts/YQ-API-CONTRACT-1.1.0.md) |
| React、路由、状态、展示、依赖 | [Workbench约束](docs/agents/workbench.md) |
| 问诊模型、患者信息、临床验证或后续阶段 | [医疗与阶段范围](docs/agents/clinical-scope.md) |
| 测试、CI、浏览器、证据、交付 | [验证与交付](docs/agents/verification.md) |
| 修改指引、做复盘、查历史错误 | [指引索引](docs/agents/README.md)、[会话与教训索引](docs/retrospectives/README.md) |

## 检查入口

命令定义以 [package.json](package.json) 和 [CI](.github/workflows/ci.yml) 为准。
指引变更先跑 `pnpm test:project-guidance`；代码变更按任务文档选择门禁。
`quality-gates` 必须保留时间、契约漂移、测试、类型、覆盖率及schema检查；工作流存在不等于远端保护已经启用。

## Code Review Rules

审查前读 [CODING_STANDARDS.md](CODING_STANDARDS.md)。优先检查授权、规则与契约一致性、医疗边界和证据可信度；机械约束由CI执行。
报告确认缺陷与证据限制，保留FAIL、SKIP、NOT_RUN和未确认根因；检查次数不得冒称独立样本或专家案例。
