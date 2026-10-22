# YunQi复盘索引

本目录保存项目会话中的错误、修复经验及验证边界。历史结果均带来源；当前规则与能力以
[项目指引](../agents/README.md)、版本化规则/契约及本轮实际检查为准。

| 入口 | 内容 |
| --- | --- |
| [2026-10-18深度复盘](2026-10-18-retrospective.md) | 按严重度排列的18条经验，含触发、原因、处理及剩余限制 |
| [来源与会话清单](2026-10-18-sources.md) | 23个会话的范围、父子关系、原始记录定位和持久化证据 |
| [会话机器索引](sessions.json) | session ID、源相对路径、格式、记录截止、SHA-256 |
| [AGENTS迁移说明](2026-10-18-guidance-migration.md) | 精简依据、26组条款去向、原文保护与检查范围 |
| [迁移机器索引](guidance-migration.json) | 原文哈希、章节覆盖和任务文档锚点 |
| [本轮验证记录](2026-10-18-validation.md) | 新门禁、CI接线及既有文件保护检查 |

## 按症状检索

优先级表示再次发生时的影响，不表示这些缺陷目前仍未修复。

| 优先级 | 编号 | 症状或关键词 |
| --- | --- | --- |
| 高 | [YQ-R01](2026-10-18-retrospective.md#yq-r01) | 专家待冻结、临床Gate、工程PASS、授权、医疗边界 |
| 高 | [YQ-R02](2026-10-18-retrospective.md#yq-r02) | 原始Word、来源冲突、R-08、R-21、R-12展示、规则版本、Contract |
| 高 | [YQ-R03](2026-10-18-retrospective.md#yq-r03) | 69/70、历史70/70、SKIP、NOT_RUN、循环次数、独立样本 |
| 高 | [YQ-R04](2026-10-18-retrospective.md#yq-r04) | 正则漏检、AST、动态import、赋值别名、局部遮蔽 |
| 高 | [YQ-R05](2026-10-18-retrospective.md#yq-r05) | README启动、Vite proxy、CORS、OPTIONS 404、真实HTTP |
| 高 | [YQ-R06](2026-10-18-retrospective.md#yq-r06) | AJV、coerceTypes、单元素数组、标量、冻结schema |
| 高 | [YQ-R07](2026-10-18-retrospective.md#yq-r07) | 慢滴连接、绝对deadline、回收、资源预算、503、loopback |
| 中 | [YQ-R08](2026-10-18-retrospective.md#yq-r08) | 构建SHA、dirty工作区、旧dist、runner、忽略build.log |
| 中 | [YQ-R09](2026-10-18-retrospective.md#yq-r09) | required、datetime-local、jsdom、焦点、窄屏、对比度、可访问名称 |
| 中 | [YQ-R10](2026-10-18-retrospective.md#yq-r10) | port:0、HMR、WebSocket、ws:false、故障注入ready |
| 中 | [YQ-R11](2026-10-18-retrospective.md#yq-r11) | 并发build、prebundle、91%commit、原生退出、自有进程 |
| 中 | [YQ-R12](2026-10-18-retrospective.md#yq-r12) | 独立oracle、负epoch、浮点毫秒、方向变异、天文准确性 |
| 中 | [YQ-R13](2026-10-18-retrospective.md#yq-r13) | 专家预期、原始输入、规范localTime、Demo反馈、完整SHA |
| 中 | [YQ-R14](2026-10-18-retrospective.md#yq-r14) | CI顺序断言、quality-gates、Action SHA、UV_HANDLE_CLOSING |
| 中 | [YQ-R15](2026-10-18-retrospective.md#yq-r15) | 审查选区、README、未跟踪文件、findings ID、云端关闭 |
| 低 | [YQ-R16](2026-10-18-retrospective.md#yq-r16) | jsonl.zst、cwd、Windows路径、phase、父子会话、授权来源 |
| 低 | [YQ-R17](2026-10-18-retrospective.md#yq-r17) | AGENTS过长、渐进披露、外部docs、链接预算、指引门禁 |
| 低 | [YQ-R18](2026-10-18-retrospective.md#yq-r18) | 大结果截断、字段投影、原始资料、清理归属、审批拒绝 |

## 维护

新增复盘用新日期文件，链接到原始操作和当时证据；不覆盖旧失败。
把可机械判断的问题接入现有检查器，把跨文件判断放入
[CODING_STANDARDS.md](../../CODING_STANDARDS.md)，按任务更新[详细指引](../agents/README.md)。
本索引不保存完整私人会话、患者资料或凭据；来源读取方法见[会话检索](../agents/history-and-evidence.md)。
