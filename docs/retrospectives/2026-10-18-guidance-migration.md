# 2026-10-18 AGENTS迁移说明

## 目的和官方依据

原根AGENTS混合了通用底线、分支细节和路线信息。本次采用短入口与任务文档，将需要判断的审查事项单列；保留医疗、时间、规则/契约版本与专家状态，未降低冻结边界。

已检索并读取[OpenAI官方Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)：根到当前工作目录的指引组合生效，近目录约束更具体；默认合计预算32KiB。普通外部Markdown不参与自动发现，必须通过清晰任务指针显式读取。官方建议简明审查规则，格式与lint交给CI。本项目4KiB/70行根预算是本次本地设计选择，不是官方要求。

根入口保留通用边界、工作顺序和6个任务触发分支；详细要求进入docs/agents。codex目录保留适用提示词的范围说明和根入口链接。CODING_STANDARDS只保留跨文件职责、证据强度和授权判断；机械规则继续由原治理脚本执行。

## 原文保护

| 原文件 | 原行数 / 字节 | 当前去向 |
| --- | --- | --- |
| 根AGENTS.md | 802 / 20,270 | 35行 / 2,662字节的任务入口，细则见下表 |
| codex/AGENTS.md | 33 / 672 | 8行的子目录入口，规则/医疗/验证细节并入分类文档 |

[根原文](evidence/2026-10-18-agents-root-before.md)和[codex原文](evidence/2026-10-18-agents-codex-before.md)按原始字节保存，SHA-256记录在[迁移机器索引](guidance-migration.json)。这两份是历史参考，不是新的AGENTS自动作用域。未来升级要求追加迁移记录，不直接改历史原文。

## 章节去向

覆盖26组编号/独立边界；路线中Phase1–4子项归于第13组。映射说明所在位置，不能单靠“链接存在”宣称语义完全相同。

| 原条款 | 原文起始行 | 任务文档与段落 |
| --- | --- | --- |
| 1 | 5 | [输出边界](../agents/clinical-scope.md#输出边界) |
| 2 | 29 | [领域所有权](../agents/rules-and-time.md#领域所有权) |
| 2.1 | 31 | [领域所有权](../agents/rules-and-time.md#领域所有权) |
| 3 | 68 | [所有权](../agents/api-contracts.md#所有权) |
| 3.1 | 70 | [领域所有权](../agents/rules-and-time.md#领域所有权) |
| 3.2 | 105 | [冻结与升级](../agents/api-contracts.md#冻结与升级)、[检查与远端保护](../agents/api-contracts.md#检查与远端保护) |
| 3.3 | 163 | [依赖和导入](../agents/workbench.md#依赖和导入)、[职责所有权](../agents/workbench.md#职责所有权)、[当前导航和状态](../agents/workbench.md#当前导航和状态)、[c4内部只读模型](../agents/clinical-scope.md#c4内部只读模型) |
| 4 | 284 | [固定时间语义](../agents/rules-and-time.md#固定时间语义) |
| 4.1 | 290 | [固定时间语义](../agents/rules-and-time.md#固定时间语义)、[服务与前端时间](../agents/rules-and-time.md#服务与前端时间) |
| 4.2 | 349 | [固定时间语义](../agents/rules-and-time.md#固定时间语义) |
| 4.3 | 365 | [固定时间语义](../agents/rules-and-time.md#固定时间语义) |
| 4.4 | 405 | [未来持久化合同](../agents/rules-and-time.md#未来持久化合同) |
| 4.5 | 433 | [服务与前端时间](../agents/rules-and-time.md#服务与前端时间) |
| 5 | 454 | [五运六气](../agents/rules-and-time.md#五运六气) |
| 5.1 | 456 | [五运六气](../agents/rules-and-time.md#五运六气) |
| 5.2 | 476 | [五运六气](../agents/rules-and-time.md#五运六气) |
| 6 | 511 | [五运六气](../agents/rules-and-time.md#五运六气) |
| 7 | 564 | [输出边界](../agents/clinical-scope.md#输出边界) |
| 8 | 613 | [问诊目标与后续路线](../agents/clinical-scope.md#问诊目标与后续路线) |
| 9 | 647 | [领域所有权](../agents/rules-and-time.md#领域所有权) |
| 10 | 663 | [必须核验](../agents/rules-and-time.md#必须核验) |
| 11 | 703 | [git与远端](../agents/verification.md#git与远端) |
| 12 | 729 | [工作顺序](../agents/verification.md#工作顺序) |
| 13 | 748 | [问诊目标与后续路线](../agents/clinical-scope.md#问诊目标与后续路线) |
| final-principle | 785 | [输出边界](../agents/clinical-scope.md#输出边界) |
| phase3-e | 791 | [当前授权能力](../agents/clinical-scope.md#当前授权能力)、[专家与临床证据](../agents/clinical-scope.md#专家与临床证据) |

## 人工复核的保留项

- Domain纯度及规则文件→Domain→结构化结果→展示链；六气全称、火的两气区分、客主三层结构与中性解释。
- 固定北京时间、CalendarTime权威、Instant绝对表示用途、Provider边界、服务normalizer、前端localTime及未来四字段持久化合同。
- Service/Contracts/Client所有权、三个端点冻结投影、升级顺序、旧freeze与registry保护、quality-gates及远端保护要求。
- Workbench六包白名单、router精确版本、所有import形态与路径边界、Provider/query/component所有权、导航状态、C4内部type-only模型。
- 医疗禁止项、当前三项规则展示、C4零业务入口、问诊目标与后续阶段的独立授权、专家待冻结和临床材料缺口。
- 原工作顺序、60甲子/边界/六步属性测试、提交前缀及原始资料/历史证据保护。

新增经验以本次复盘为依据，主要改善证据与工具环境，不赋予新业务能力。原路线标题的“完成”按路线目标解释，避免把Phase4叙述成已上线；当前能力仍由实际代码和授权证明。

## 自动检查范围

pnpm test:project-guidance执行Node标准库检查与变异夹具：根预算、必需文档及任务链接、局部链接/锚点与路径逃逸、命令是否存在、原文哈希、26组覆盖、会话ID/父子关系/数量。它不读取CI机器上不存在的私人日志，也不尝试用关键字证明医疗语义。

门禁接入根test和quality-gates，并同步既有精确CI顺序测试。人工仍要核对语义强度、授权与来源；一次机械PASS不等于正式专家验收。实际命令、退出与文件保护见[验证记录](2026-10-18-validation.md)。

原时间治理要求长条款直接出现在AGENTS，迁移后首次CLI非零。现改为必须存在根指针，
分类时间文档继续包含全部既有标记，ADR仍单独检查；增加缺指针、缺文档反例，
不放宽Domain或前端任何时间能力禁令。
