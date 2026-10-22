# 2026-10-18 指引与复盘验证

本轮整理项目复盘、精简指引并加入指引治理。产品运行时、规则、原始资料、已有浏览器
代码和历史证据受执行前哈希清单保护；另适配时间治理对文档位置的检查。

## 检查记录

环境：Windows PowerShell，Node 24.18.0。实际输出及SHA-256见
[机器摘要](evidence/2026-10-18-validation/summary.json)。

| 命令 | 结果 | 证据 |
| --- | --- | --- |
| pnpm test:project-guidance | 13通过，exit 0 | [最终日志](evidence/2026-10-18-validation/guidance-final.log.txt) |
| pnpm test:time-governance | 12通过，exit 0 | [最终日志](evidence/2026-10-18-validation/time-governance-final.log.txt) |
| pnpm test:contract-governance | 33通过，exit 0 | [日志](evidence/2026-10-18-validation/contract-governance.log.txt) |
| pnpm test:workbench-governance | 282通过、1既有SKIP，exit 0 | [日志](evidence/2026-10-18-validation/workbench-governance.log.txt) |
| git diff --check（8个本轮允许的已有文件） | exit 0，无空白错误；有本机LF/CRLF提示 | 本轮命令结果，文件范围见下节 |
| node scripts/check-project-guidance.mjs（文档收尾后） | exit 0，链接/锚点、原文与索引完整 | 机器摘要finalAudit |

四个最终治理命令合计340通过、1跳过；这不是完整业务测试或浏览器验收计数。
指引测试包含便携夹具与预算、缺文档/锚点、路径逃逸、缺命令、原文篡改、
覆盖缺失、重复ID、父链循环、绝对私人路径、缺CI/根test接线等反例。
既有Workbench符号链接权限SKIP保留，未删用例制造全绿。

## 初始失败与处理

初次时间治理的10个单元测试通过，但生产检查CLI仍非零，报告根AGENTS缺7个长条款标记；
见[初始失败日志](evidence/2026-10-18-validation/time-governance.log.txt)。
不能把单元通过记作命令整体通过。

原因是已有检查器把详细条款位置硬编码在根AGENTS。现根文件必须有时间文档指针，
分类时间文档保留全部原标记，ADR检查及Domain/前端能力检查保持原逻辑；
新增缺指针、缺文档反例，并把原缺持久化字段反例迁到新位置。复查12项及CLI均通过。
首次指引检查也[保留原输出](evidence/2026-10-18-validation/guidance-initial.log.txt)。

## 文件与条款保护

执行前快照纳入389份已有项目文件；本轮改8份，其他381份SHA-256全部一致，无缺失或意外变化。
逐文件摘要见[文件保护记录](evidence/2026-10-18-validation/workspace-preservation.json)。

8份允许修改的已有文件：

- AGENTS.md、codex/AGENTS.md、README.md：入口和分类导航。
- package.json、.github/workflows/ci.yml：新门禁接线。
- tests/yunqi-contract-governance.test.mjs：同步既有精确CI顺序断言。
- scripts/check-yunqi-time-governance.mjs、tests/yunqi-time-governance.test.mjs：
  实际发现文档位置耦合后增加的必要适配；不改运行时能力禁令。

新增分类指引、18条复盘/23会话索引、迁移映射/原文归档、审查标准和指引检查器/测试。
根AGENTS由802行/20,270字节变为35行/2,662字节；26组原条款有去向，
两份原AGENTS的完整字节及SHA-256保留。机械覆盖与链接通过不替代人工语义复核。

索引检查使用可移植相对源定位，不依赖CI机器能访问本机私人会话目录。
新增交付文件均经git check-ignore检查，未被忽略；381份保护文件在收尾再次核对一致。

## 范围

本轮不执行完整业务重建、浏览器、临床验收或远端CI。
当前专家状态仍待冻结，最新既有完整浏览器69/70，临床G1–G6 NOT_RUN。
未提交或推送。
