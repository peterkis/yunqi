# 2026-10-22 提交前双轴审查

用户确认以 `origin/main` 的 `248623be3f0c3e8fc9ba6871bad869288e08941d` 为基点，
纳入当前安全修复、规则/契约 1.1、指引/验收以及医生操作走查 UI 改动。
先审查再提交；未因整理发布改变专家冻结或临床 Gate。

已提交部分命令：`git diff 248623be3f0c3e8fc9ba6871bad869288e08941d...HEAD`。
提交列表：`12ddb04 fix(security): close cloud findings and harden boundary controls`。
另使用独立临时 Git index 固定全部待提交内容，避免仅审 HEAD 漏掉工作区和新文件。
全量命令：`git diff 248623be3f0c3e8fc9ba6871bad869288e08941d 68d23d52805c40d9ea6c8312fd22c8eb89ef366a`。
该树包含 216 个待加入/修改文件，实际 Git 变更还包括既有安全提交。
修复后复核树为 `002f136903805632d0dc2fd8ec66bea74872a5e2`。
本报告及本轮审查证据是后续追加材料，不冒称包含于以上树中。

工具方法：用户指定的 `code-review` skill；Standards 与 Spec 两个独立子代理并行审查。
Standards 来源包括 `CODING_STANDARDS.md`、根 AGENTS、`docs/agents/*`、ADR-001/002 与包 README。
未发现 CONTRIBUTING.md 或 GLOSSARY.md。规格来源为当前规则表、契约 1.1、
已授权 Word 升级记录、既有 C3/C4/E1 规格、指引迁移说明及本轮九项 UX 走查记录。
GitHub 为仓库的现有 issue/PR 平台；本轮没有来源 issue，直接使用用户任务与仓库规格。

## Standards

初始审查未发现确认的规范违反，也没有值得单独报告的基线代码异味。
审查覆盖安全入口预算与错误响应、规则/Contract 版本与历史基线、Router/查询/展示所有权、
编辑后旧结果隐藏、医疗边界、浏览器 runner 与多轮证据分开记载。

补充审查核对修复后的 Git blobs：51 个证据/原始资料 blob 与当前原始字节一致，
两份归档与受保护原始资料共 13 个文件 SHA-256 匹配保护记录；变化仅为恢复原始换行。
`.gitattributes` 的 byte-preserving 范围限于历史证据和原始规格包，未改生产源码换行策略。
未发现 P0/P1/P2 回归。

限制：初次工作树哈希一致不能证明入库 blob 字节一致；已在补充审查补足。
该轴没有重新执行完整工程或浏览器验收。

## Spec

初始 **1 项 P1**：Git 入库转换破坏必须按原字节保存的历史证据。
依据为指引迁移说明“按原始字节保存，SHA-256记录在迁移机器索引”，以及原规则包 MANIFEST。
根 AGENTS 原文应为 20,270 字节 / `ba083ee521707ea7c5bcf54bdebd4b78c2f4ef47f1cd3da2d0efa10861749d32`，
初始树却为 19,468 字节 / `0b7520563b2bc9da3b42848e5adec0d7905d5bc8dafe95ab848cc28a51d01fe0`。
规则包 CSV 也从 10,114 变为 10,053 字节。这会让新检出环境的归档完整性门禁失败。

修复：对历史证据和原始规则包使用 Git `-text`，保留原字节；不修改历史清单或原始文件。
新增测试实际执行 `git add`、读取索引 blob、`checkout-index`，覆盖 `core.autocrlf=true/false`。
独立复核确认两份归档匹配迁移索引、原规则包 9 个文件全部匹配 MANIFEST，**P1 已关闭**。
未确认规则/契约 1.1、UTC+08、九项 UX 变更或只读医疗范围的其他遗漏、错误或范围扩张。

## 诊断与验证

诊断使用 `diagnosing-bugs` 的可重复失败回路：先比较文件与 Git blob，再导出候选树运行原检查器。
本地原文件与历史哈希一致，进入 Git 或检出后才产生差异，定位为换行转换；因此不改历史哈希。

| 检查 | 结果与原始证据 |
| --- | --- |
| Git 保真测试修复前 | 1 PASS / 1 FAIL，exit 1；[RED](evidence/2026-10-22-pr-review/git-preservation-red.log.txt) |
| 初始候选导出检查 | exit 1，Archive integrity mismatch；[日志](evidence/2026-10-22-pr-review/export-guidance-initial.log.txt) |
| 修复后 `pnpm test:project-guidance` | 15/15 PASS，exit 0；[日志](evidence/2026-10-22-pr-review/guidance-green.log.txt) |
| 修复后候选导出检查 | PASS，exit 0；[日志](evidence/2026-10-22-pr-review/export-guidance-green.log.txt) |
| 实际 Git blob 哈希 | 13/13 与保护记录一致；[结果](evidence/2026-10-22-pr-review/protected-git-bytes-green.json) |

产品源码与上一轮已验证内容一致；完整工程门禁及 Chrome 73/73 的既有本轮证据见
[业务走查报告](2026-10-22-ux-walkthrough.md)。本次新增的修复只影响证据入库/检出与相应回归。
远端 `main` 实查要求 `quality-gates`、strict up-to-date 且 enforce_admins=true；审批数为 0，
required_conversation_resolution=false。因此后续合并仍须主动检查当前 head 审查、CI 和未解决讨论，
不能把配置当成已经完成审查的证据。本报告时点尚未创建 PR。

暂存清单排除 `.artifacts/` 与 Vite 依赖缓存；原始资料、历史 FAIL/SKIP 和已引用的验收日志保留。
规则仍待正式专家冻结，临床 G1–G6 为 NOT_RUN。

双轴汇总：Standards 0 项；Spec 1 项 P1，已修复并独立复核关闭。
