# Workbench UI 收尾打磨（2026-11-17）

依据：[打磨清单原文](source-checklist.md)（对象 `main` @ d35f313）。沿用 [UI 重构计划](../2026-11-17-workbench-ui-refactor/README.md) 的工作流：
Claude 拆卡，本机派发 Codex CLI（`gpt-6.1-sol`、思考强度 max、fast 模式）实现，Claude 评审、返工直至验收，按卡在本地提交。
分支 `feat/workbench-ui-polish`；推送与 PR 需用户同意。

## 与清单的调整（Claude 评审，2026-11-17）

| 清单项 | 处理 | 原因 |
| --- | --- | --- |
| P0-1 “还有 N 天” | **本轮不做** | 与已确认决定冲突：UI 重构计划已记录“设计中的‘还有 N 天’不实现”；AGENTS.md 规定业务时间只展示 API `localTime`、不得重建。在 mapper 里由两个 `localTime` 字符串算天数，等于在 UI 实现历法差值。如需要，应由 Domain/Contract 提供（与 P1-7 同批，另行授权）。 |
| P0-1 节气名静态映射 | **本轮不做** | 六步与节气的对应是核心规则（`rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md`），在 UI 写静态表会形成第二份规则来源。当前契约未提供步的节气名；副标题改为 compact 起止时刻（`MM-DD HH:mm`）。节气名同样随契约变更提供。 |
| P0-2 第一眼取“转化分最高” | **改为不排序** | 量表规则（GB/T 46939-2025，Domain `assessment.ts`）只给“是 / 倾向”，不定义主次；按分数挑“主体质”是在 UI 新增判定规则，接近诊断排序。第一眼只放一行概括（平和质成立放“平和质”；一种偏颇质放其名；多种放“偏颇质兼夹”），下方按标准附录顺序用中性标签列出全部“是”和“倾向”，不重复。 |
| P0-4 “把规范同步到设计系统” | **只写本地文档** | `docs/design/design-system/**` 是字节保真同步副本，不改；新组件说明写入 `docs/agents/workbench.md` 与 `docs/design/README.md` 的本地扩展一节。 |
| P1-7 当步运关系 | **本轮不做** | Domain + 契约变更，需新契约 ID，另行授权排期。 |
| 1366×768、1920×1080 截图 | D1 加入视觉矩阵 | 后续卡沿用。 |

## 任务卡与波次

| 卡 | 内容 | 依赖 | 波次 | 状态 |
| --- | --- | --- | --- | --- |
| [D1](cards/D1-time-density.md) | P0-1 时间精度、P0-3 先天提交后信息密度、工作站截图矩阵 | — | 1 | 通过（2 轮，[评审](reviews/D1-review-2.md)） |
| [D2](cards/D2-form-controls.md) | P0-4 原生控件、P0-5 量表性别折叠 | D1 | 2 | 通过（2 轮，[评审](reviews/D2-review-2.md)） |
| [D4](cards/D4-consistency.md) | P1-6、9、10、11 一致性 | D1 | 2（与 D2 并行） | 通过（2 轮，[评审](reviews/D4-review-2.md)） |
| [D3](cards/D3-result-actions.md) | P0-2 结果标题、P1-8 主操作入操作区 | D2 | 3 | 通过（2 轮，[评审](reviews/D3-review-2.md)） |
| [D5](cards/D5-craft.md) | P2-12～17 工艺细节 | D3、D4 | 4 | 待派发 |

并行：D2 与 D4 各用工作树 `.claude/worktrees/polish-dN` 与分支 `feat/workbench-ui-polish-dN`，从 D1 验收提交切出；
D2 改先天表单与量表，D4 改当下页、原文页、胶囊与关系说明，文件基本不交叉。验收后按 D2 → D4 合并，每次合并后复跑全部门禁。

## 每卡验收（共同）

- 现有门禁全绿：`pnpm test`、`typecheck`、`test:coverage`、`test:project-guidance`、`test:browser`（axe 零违规、无外网请求、5 档字号断言）。
- 视觉矩阵补齐后，各卡对受影响页面提供 400×860、1366×768、1920×1080 首屏截图供评审对照。
