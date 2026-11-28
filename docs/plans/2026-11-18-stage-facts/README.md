# 阶段事实补全：当步运关系、节气边界、阶段进度（2026-11-18）

依据：[原始计划](source-plan.md)（基线 `main` @ fff024f）。授权：用户 2026-11-18 下达，本计划即排期依据，含 Domain、教学规则版本、契约 1.3.0 与 Workbench 变更。
工作流同 [UI 收尾打磨](../2026-11-17-workbench-ui-polish/README.md)：Claude 拆卡，本机 Codex CLI（`gpt-6.1-sol`、思考强度 max、fast 模式）实现，
Claude 评审、返工直至验收，按卡在分支 `feat/stage-facts` 本地提交；推送与 PR 需用户同意。

## 与原计划的调整（Claude 评审，2026-11-18）

| 项 | 处理 | 原因 |
| --- | --- | --- |
| `startTerm`/`endTerm` 的类型 | 用六气边界节气的闭合枚举（`STEP_BOUNDARY_TERMS` 的 6 个值），不用 Domain 的 9 值 `SolarTerm` | 六气边界只可能是这 6 个；9 值枚举会把五运用的芒种、处暑、立冬也放进契约，投影过宽。 |
| `currentStepProgress` 的位置 | 加在 `YunQiCalculationDto` 上 | 该 DTO 由 calculate、current 返回，也作为 learning/出生对照的 `facts` 复用，故这些端点同样带出；含义始终相对本次输入时刻，契约文档写明。year 端点无输入时刻，不带。 |
| 教学规则文档 | 新建 `rules/LEARNING_RULES_V1_1.md`，1.0 文件原样保留 | 与 `CLASSICAL_READING_V1_1.md`、`PHASE1_IMPLEMENTATION_RULES_V1_1.md` 先例一致，保留历史版本。 |
| E3“先天对照‘所处运’改用 DTO 关系” | **不改为主客运关系** | 现行该行已来自 DTO（出生客运 × 当前客运的 `comparisons`），并非 UI 自算；`LEARNING_RULES_V1.md` §1 规定三种关系不能混算，把主客运关系放进“出生与当前”行会混层。E3 只核实，不改。 |
| E4 专家确认 | 专家三问由用户/专家回答；2026-11-18 答复后按用户补丁派 Codex 落地（第二轮） | 属专家结论，工程不能替代；落地只做工程实现。 |

**评审发现（供 E4）**：按现行规则，客运是主运五项按岁运所在项旋转（[教学规则 1.0](../../../rules/LEARNING_RULES_V1.md) §2），
所以客运与同元素主运的太少总相同——E4 第 3 问“主太羽、客少羽”在现行口径下不会出现；且同一年五步的主客运偏移恒定，五步关系方向相同
（岁运木→同五行，火→主生客，土→主克客，金→客克主，水→客生主）。

## 任务卡

| 卡 | 内容 | 依赖 | 状态 |
| --- | --- | --- | --- |
| [E1](cards/E1-domain.md) | Domain：A 当步运关系、B 边界节气标签、C 阶段进度；教学规则 1.1.0 | — | 通过（1 轮，[评审](reviews/E1-review-1.md)） |
| [E2](cards/E2-contract.md) | Service schema/mapper、OpenAPI、freeze 1.3.0、契约文档、Contracts/Client | E1 | 通过（1 轮，[评审](reviews/E2-review-1.md)） |
| [E3](cards/E3-workbench.md) | 当下页运关系、阶段副标题、进度分割、治理断言 | E2 | 通过（1 轮，[评审](reviews/E3-review-1.md)） |
| [E4](cards/E4-expert-labels.md) | 专家结论落地：主客运标签，教学规则 1.2.0（契约 1.3.0 不变） | E1–E3、专家答复 | 通过（1 轮，[评审](reviews/E4-review-1.md)） |
| [E5](cards/E5-standalone-host.md) | 独立侧栏窗口宿主契约：收起态 424×88 透明窗口、`shadow-pill` | — | 通过（1 轮，[评审](reviews/E5-review-1.md)） |
| [E5-same-state-label.md](cards/E5-same-state-label.md) | 专家确认同五行、太少相同的标签，教学规则 1.3.0 | E4、M1-e、专家答复 | 待评审 |

串行执行；每卡验收后本地提交并复跑门禁。

## 完成状态（2026-11-18）

E1–E3 均已验收并提交在 `feat/stage-facts`。最终门禁（评审方本机）：`pnpm test`、`typecheck`、`test:coverage`、`contracts:check`、
`test:contract-governance`、`schema:validate`、`test:project-guidance`、`test:time-governance`、`test:workbench-governance`、`test:browser`（217 项）全部通过。远端 CI 待推送后运行。

未做：收起态胶囊第二行“还有 N 天”（可选项，未实测不实现）。E4 专家三问与 Tauri 阶段胶囊阴影已在第二轮处理，见下节。

## 第二轮（2026-11-18）：E4 落地与 E5 宿主契约

用户转来专家答复与独立侧栏窗口方案（两份补丁原样存于 [source/](source/)，摘要见 [source-plan.md](source-plan.md) 末节）。
E4、E5 各 1 轮通过并本地提交。评审方门禁：E4 后全部门禁及 `test:browser` 217 项 PASS；E5 后 `test:browser` 217 项 PASS，Codex 报告其余门禁 PASS。

同五行、太少相同的标签已于 2026-11-19 由 [E5](cards/E5-same-state-label.md)确认。
五步运交运口径仍待专家确认，Tauri 外壳（透明窗口、AppBar、拖动与位置记忆）另行排期。
