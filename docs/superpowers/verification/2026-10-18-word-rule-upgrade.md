# Word规则目标升级与验收 — 2026-10-18

本次R-08/R-21已按用户确认的Word目标完成规则、契约、Service与Workbench对齐。
完整质量回归787 PASS / 1 SKIP，类型、覆盖率、契约漂移与schema均通过。
**最终浏览器复验69/70：14个业务流程全部通过，55个视觉用例通过，1个因资源错误失败。**
因此不宣布本轮完整浏览器验收全通过。专家状态仍待正式冻结，临床验证未执行。
机器结论见[本轮summary.json](evidence/2026-10-18-word-upgrade/summary.json)。

## 范围与决定

承接[上一轮规则复核](2026-10-18-rule-consistency.md)，用户明确选择：
“以 Word 确认单为目标，完成必要的规则与契约版本升级，专家状态仍保留待冻结”。
本次解决此前待定的R-08和R-21；此前R-12岁运摘要修复与UI/浏览器验收改动继续保留。

| 条款 | 原实现 | 本次实现 |
| --- | --- | --- |
| R-08 | 1901–2099运气年 | 1900–2100运气年，包含两端 |
| R-21 | 客生主 | 传统描述为“客生主，相得”；结构化方向仍为GUEST_GENERATES_HOST |
| 规则版本 | YQ-MVP-RULES-1.0.0 | YQ-MVP-RULES-1.1.0 |
| 契约版本 | YQ-API-CONTRACT-1.0.0 | YQ-API-CONTRACT-1.1.0 |

原Word文件名为V1.0，正文为V1.1、待冻结。它是本次两项工程变更的目标依据，
不等于全部历史草案实现或后续问诊流程均已获准上线。
固定北京时间UTC+08、领域隔离、Service唯一schema来源、公共Contracts/Client边界继续有效。

## 结果与迁移

当前规则见[1.1.0规则表](../../../rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md)。
新契约、包版本选择和迁移影响见[Contract 1.1.0](../../contracts/YQ-API-CONTRACT-1.1.0.md)。
OpenAPI文档升至1.3.0；Domain为1.2.0、Service为2.1.0、Contracts/Client均为1.1.0。

新契约生成流程实际运行成功，并向registry追加新ID。
旧freeze文件完整保留。精确差异测试验证只改变Contract ID、OpenAPI文档版本，
以及年度path参数/两种结果DTO中的year上下界，未引入其他schema变化。

运气年范围对应 `[1900大寒实际交节时刻, 2101大寒实际交节时刻)`。
1900大寒前返回400，当刻开始返回200；2101大寒前仍返回2100年结果，当刻开始返回400。
无后缀、+08:00与等价Z输入的归属一致。内部使用相邻年节气不会扩大对外年度范围。

“客生主，相得”由Domain规则表产生，Service直接映射，前端从API DTO展示。
前端的方向标签仍为“客生主”；没有把传统描述合入枚举或在UI重新判断关系。
共享年份列表、URL校验与越界提示均采用新范围。

## 验证记录

| 检查 | 结果 |
| --- | --- |
| Domain全套 | 132/132 PASS；测试类型检查PASS |
| 文档与公共领域入口 | 5/5 PASS，201年干支、60年360步、36对完整关系字段 |
| 适配器性质测试 | 3/3 PASS，随机范围1900–2100并显式包含两端；测试类型检查PASS |
| 时间一致性 | 3/3 PASS；201年、4221次边界归属、12663次输入形式检查 |
| Service定向回归 | 49/49 PASS；含上下界三种输入、current及新文案真实API；类型检查与生产入口smoke PASS |
| 新契约精确差异 | 1/1 PASS；旧ID保留、新ID追加 |
| 完整质量回归 | 五条命令首次exit 0；787 PASS / 1 SKIP / 0 FAIL；类型检查、覆盖率、contracts:check PASS，schema 6/6 PASS |
| Chromium流程与视觉验收 | 最终单worker69 PASS / 1 FAIL / 0 SKIP：流程14/14，视觉55/56；失败项见下文，未标全通过 |

4221 = 201年 × 7边界 × 3时点；相邻年的大寒检查有重复，唯一边界测试瞬间为3621个。
12663次输入形式检查对应10863个唯一词形，不能写为同等数量的独立测试或专家案例。
使用真实历法适配器核对边界所有权，不声称独立验证了节气天文算法。
2101大寒提供能力另以tyme4ts直接字段及Python固定偏移epoch转换交叉检查，
该探针也只证明适配器/表示一致性。

本轮保留的RED与过程证据：

- Domain公开关系测试：期望“客生主，相得”而旧实现返回“客生主”，3 PASS/1 FAIL；修复后4/4 PASS。
- Service新增9例：旧范围/规则版本导致6 FAIL/3 PASS；更新后全部通过。
- 契约迁移测试首次因新ID冻结文件尚不存在而失败，生成后通过；此项是迁移就绪性RED，不冒称算法缺陷。
- 未为前端新增浏览器断言宣称执行过RED。

浏览器调试过程单独保留：

1. 默认2-worker首轮68 PASS / 2 FAIL，56个视觉用例全部通过。失败为指定时点恢复和
   防重复提交用例在输入框出现前超时；截图全白，启动脚本/CSS尚未完成，
   诊断记录无业务POST、无pageerror或console error。不能算为已执行的提交断言失败。
2. 原样重复这两个用例各3次，5 PASS / 1 FAIL；失败是Node worker原生退出
   `3221226505 (0xC0000409)`，未确认底层根因。
3. 曾尝试`server.ws:false`关闭测试环境的固定WebSocket端口，定向复验0/6，
   出现资源不足/启动超时及`WebSocket closed without opened.`。该方案不被接受，
   其失败记录保留，改为验证WebSocket与已拥有的随机HTTP端口共用。
4. 最终测试环境将`server.ws.server`绑定到已创建的HTTP server，继续使用随机端口，
   保持hmr:false/watch:null。POST等待拦截只在输入可编辑后安装，防重复业务断言保留。
   独立代码复核无确认缺陷。带完整项目配置的两次独立探针握手/端口断言通过，
   但未自然退出，已保留并只终止其自有进程；它们不能整体计作生命周期PASS。
   简化transport-only探针自然exit 0，只证明传输层。实际两个浏览器场景随后
   单worker 2/2 PASS、CLI自然exit 0且端口清理通过。

独立只读资源快照显示主机提交内存占用约91%。先前验收的自有端口和worker均已退出，
没有据进程名终止其他任务。资源紧张与原生退出/启动超时之间仅是可能关联，
不能声明已证明同一根因。后续本机验收采用单worker，保持70个场景、原断言、
原超时和零自动重试；该结果不作为默认2-worker在当前负载下稳定的证据。

最终完整轮使用 `pnpm exec playwright test --workers=1`，运行217.74秒，
69 PASS / 1 FAIL / 0 SKIP / 0 FLAKY。唯一失败是737px平板明亮主题的not-found页面：
浏览器报告`net::ERR_INSUFFICIENT_RESOURCES`，`/src/components/ui/Panel.tsx`未加载，
“页面未找到”标题没有挂载，该用例的完整视觉/可访问性检查未完成。
其余7个视觉项目均7/7，737px项目6/7；所有14个流程均通过。
本轮`cleanupPassed=true`，无清理错误，未通过增加重试或放宽断言刷成全绿。
CLI自然退出，exit 1；55次实际axe扫描无违规，失败页面的axe检查未执行。

新2025客生主关系、1900/2100成功页、1899/2101越界提示五张截图均已实际查看，
符合新范围、分别显示方向/传统描述及1.1.0追溯标识的目标。
原始默认轮的56个视觉PASS属于原测试环境下的历史结果，不能补算进最终单worker轮。
剩余验收项是资源充足条件下的一次完整浏览器复验；当前证据不支持归因产品规则缺陷，
也不能证明主机原生退出或资源故障已被消除。

Workbench覆盖率为语句98.83%、分支92.95%、函数100%、行98.82%；Service为
97.97%、92.30%、100%、98.94%。保留1项Windows符号链接权限SKIP和3个既有
OpenAPI warnings。五条完整质量命令均无失败或重试，也未遇到此前Windows Redocly退出异常。

证据摘要：

- [Domain、规则表与性质测试](evidence/2026-10-18-word-upgrade/domain-summary.json)
- [201年时间与边界](evidence/2026-10-18-word-upgrade/time-summary.json)
- [Service与实际HTTP响应](evidence/2026-10-18-word-upgrade/service-summary.json)
- [完整质量回归与覆盖率](evidence/2026-10-18-word-upgrade/quality-summary.json)
- [浏览器各轮结果、探针限制和截图](evidence/2026-10-18-word-upgrade/browser-summary.json)
- [最终本机浏览器HTML报告](../../../.artifacts/browser/2026-10-18T00-22-34-654Z-befc9834/report/index.html)
- [契约8处差异与版本迁移](evidence/2026-10-18-word-upgrade/contract-migration.json)
- [独立只读复核](evidence/2026-10-18-word-upgrade/review-summary.json)
- [原始资料与历史文件保护](evidence/2026-10-18-word-upgrade/source-preservation.json)
- [主机资源只读快照](evidence/2026-10-18-word-upgrade/host-resource-summary.json)

可重复执行：

```text
pnpm test:rule-consistency
pnpm contracts:check
pnpm test
pnpm typecheck
pnpm test:coverage
pnpm schema:validate
pnpm test:browser
```

## 来源保护和验收边界

已对原始Word/规格包、旧规则表、旧Contract文档、旧freeze、之前验收报告及证据
建立42文件的SHA-256保护记录；首次及收尾检查全部保持不变。
此前报告中的“待确认”和旧计数是当时状态，本次以追加报告记录用户决定和新结果。

专家规则状态继续为**待正式冻结**；临床G1–G6仍为**NOT_RUN**。
本次完成的是已授权规则目标的工程实现一致性验证，不代表临床可用性、
独立天文准确性、专家签署、真实医院流程或生产部署验收。
没有新增患者档案、问诊记录、HIS/EMR、持久化或医疗推断功能。
