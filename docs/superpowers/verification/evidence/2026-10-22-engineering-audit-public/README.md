# 2026-10-22 工程审计：可公开证据

本页记录历史工程检查，基线为 `bbd2a696656afba39b914fe7b4fedeefa03c3be1`、规则 `YQ-MVP-RULES-1.1.0` 和当时的 API Contract `YQ-API-CONTRACT-1.1.0`。这些结果不代表当前版本已经重新验证，也不替代专家冻结或临床验收。

## 结果与限制

| 项目 | 历史结果 |
| --- | --- |
| 规则一致性 | PASS，8/8；边界循环包含相邻年重复检查，不能作为独立专家样本。 |
| 原始完整测试 | **FAIL**；OpenAPI lint 输出有效结果和 3 条 warning 后发生 `UV_HANDLE_CLOSING` 原生断言，子进程退出码 3221226505；根因未确认。后续单独检查通过不改变该轮 FAIL。 |
| HTTP 探针 | 首轮 **FAIL**，`ECONNRESET`，根因未确认；修订后独立一轮 PASS，1628 次请求、201 个年度及 1206 个步骤起点。计数不代表独立专家案例。 |
| 浏览器业务流程 | 17/17 PASS，单 worker、零重试；本轮 56 项视觉和可访问性场景 **NOT_RUN**。 |
| 其他未执行 | 独立 typecheck、覆盖率、独立节气天文核验、独立专家案例和临床 G1–G6 均为 **NOT_RUN**；原轮 Windows 符号链接权限导致的 SKIP 予以保留。 |

[机器摘要](summary.json)、[探针结果摘要](word-runtime-summary.json)、[初次探针失败](probe-initial-failure.json)、[浏览器逐项结果](browser-results.json)、[浏览器环境](browser-environment.json)、[HTTP 清理记录](http-cleanup.json)、[源码清单摘要](source-before-summary.json)、[构建清单](build-manifest.json)和[原文件保护记录](preservation.json)保留了对应检查的来源。

## 日志

- [原始完整测试的脱敏副本](logs/full-test.log.txt)；[规则一致性](logs/rule-consistency.log.txt)；[浏览器流程](logs/browser-flows.log.txt)。
- [探针首次失败](logs/word-runtime-initial-failure.log.txt)；[探针后续结果](logs/word-runtime-final.log.txt)。
- 单独复查：[契约](logs/contracts-check.log.txt)、[schema](logs/schema-validate.log.txt)、[OpenAPI lint](logs/openapi-lint-recheck.log.txt)、[OpenAPI check](logs/openapi-check.log.txt)、[项目指引](logs/project-guidance.log.txt)。

日志为公开派生副本：本机路径和未公开源文件哈希被替换为占位符，换行和末尾空行已规范，原始日志保留在本地。[清单](manifest.json)记录了原件与公开副本的 SHA-256；[整理过程检查](publication-review.json)保留首次失败及修正。两份原始失败日志逐字节相同，因此公开版仅保存一份；失败与后续通过是不同轮次。

## 截图与可移植性

浏览器结果中的 11 个截图引用已改为本目录相对路径，对应 10 个去重文件。1899 和 2101 的越界场景使用同一张字节相同的通用错误截图；两项测试上下文仍分开记录，不能仅凭该图片认定为两种不同视觉状态。

本机路径以 `<WORKSPACE>`、`<USER_TEMP>`、`<NODE_EXECUTABLE>` 等标记表示，回环地址是历史测试记录，不是现存服务链接。内嵌诊断保留于浏览器结果中。

院内原始材料、其文字提取、原始审计报告和标准 PDF 未包含在公开证据中，原件保留在本地；涉及这些输入的探针无法仅凭公开副本独立复跑。归档报告原文的相对链接属于原位置的历史文本，本页和本目录的链接为可公开入口。

运行 `node docs/superpowers/verification/evidence/2026-10-22-engineering-audit-public/verify.mjs` 可检查公开证据哈希、截图引用和关键历史状态。该检查不重新执行当年的产品测试。
