# 2026-11-16 医生反馈实施结果与验收报告

**报告状态：本轮工程验收完成，待科室规则与使用验收。** 第1、2、3、5项已实现；第4项完成出生与当前运气对照，生日断体质及个体易患病推断未实现。产品代码为 `72a861b`，该提交关联的CI 43已成功，完整浏览器验收108项通过、0失败、0跳过、0不稳定项；本报告与证据归档提交在其后，不改变产品源码。

## 1. 范围、基线与交付身份

- 授权与设计依据：[五项反馈实施计划](../../plans/2026-11-16-clinician-feedback.md)。工程测试、规则专家冻结与临床验收分别记录。
- 原 `main` 基线：`bbd2a696656afba39b914fe7b4fedeefa03c3be1`。
- 功能候选：`6565d9b4d6548268d9d50edad05f0c5aff2edc03`；出生边界修复：`1d96d87b8620a021e4ce39e850803c20d1a29fe2`。
- 当前修复候选：`72a861ba0e55e6c5b25b5b860dd50622e1553fae`，分支 `feat/clinical-learning-workbench`。
- Linux 已保存的完整源码/构建清单绑定 **1d96d87**，不能冒称覆盖72a861b；见[该轮清单](evidence/2026-11-16-clinician-feedback/linux-source-build-manifest.json)。
- Windows `D:\Projects\YunQi` 已核验为72a861b，tracked状态为空；294项源码、198项构建文件实际哈希及31项原有未跟踪文件保护记录见[Windows清单](evidence/2026-11-16-clinician-feedback/windows-source-build-preservation.json)。31项前后哈希全部一致，原PDF、旧专家报告及历史证据未被替换。
- Windows测得Node `v24.18.0`；Linux完整门禁清单为Node `v24.22.1`、pnpm `11.25.0`。仓库声明的pnpm版本仍以根package.json为准，环境差异未隐去。

## 2. 五项需求完成度

| 用户反馈 | 本轮结果 | 边界与验收重点 |
| --- | --- | --- |
| 1. 默认只突出全年与当前阶段 | 已实现：年度中运、司天、在泉与当前运/气聚焦展示，全年六气明细按需展开 | 五步运与六步气分别计算，不能共用阶段索引；展开后可查看全年六气时间轴，五运仅展示当前阶段 |
| 2. 增加简单理论提示 | 已实现：年度相临五分类、当步生克方向、主胜客/客胜主及君相火特例，附依据 | 年度司天—中运与当步主客气分开；“顺逆”等标签不表示疾病严重度 |
| 3. 加入当年及阶段原文 | 已实现：10种岁运、6种司天之政、36种司天×阶段，共52条经典摘录及来源 | 按实际条件匹配，原文与阅读释义分开；没有宣称已对应用户未指定版本的某本教材全文 |
| 4. 先天运气、体质与易患疾病 | **部分实现**：公历出生日期、可选时刻、出生/当前并列、同维度五行关系、交界日全部候选 | **未实现生日直接判定先天体质或预测个体易患疾病**；九种体质由独立量表评估，后续扩展需明确、可追溯的科室规则 |
| 5. 体质量表并看运气 | 已实现：正式2025版题库、每组最多6题、26题完整作答、九质分数、倾向及兼夹结果，旁侧保留当前运气 | 无默认答案；缺答不计分；性别改变清空旧答卷；原始分与未舍入分数可复核 |

例：2026丙午中运水太过、少阴君火司天，年度关系为“不和”；2026-11-16五之气主阳明燥金、客少阳相火，当步为“顺·客胜主”。两个结论比较对象不同，可同时成立。

## 3. 版本、架构及接口

| 层次 | 当前版本或职责 |
| --- | --- |
| Domain | `1.3.0`；纯TypeScript计算，教学与量表独立模块 |
| Service | `2.2.0`；日期归一化、出生候选组织、TypeBox校验与OpenAPI唯一来源 |
| Contracts / Client | 各`1.2.0`；生成DTO与类型化客户端，React不重复声明契约或计分 |
| API / OpenAPI | `YQ-API-CONTRACT-1.2.0`；文档`1.4.0`，规范`3.1.0`，路径仍为`/api/v1` |
| 规则 | 核心`YQ-MVP-RULES-1.1.0`；教学`YQ-LEARNING-RULES-1.0.0`；经典`YQ-CLASSICAL-READING-1.0.0`；量表`YQ-CONSTITUTION-1.0.0` |

原年度、当前、指定时点三个API保持既有schema；新增学习当前/指定时点、出生对照、取量表、评估量表五个端点。路径、请求及迁移要求见[Contract 1.2.0](../../contracts/YQ-API-CONTRACT-1.2.0.md)，历史1.0.0/1.1.0冻结保留。

Workbench沿`Client → Contracts`消费API，经纯presentation mapper交给组件；Domain不读取系统时钟。Service统一使用固定北京时间UTC+08和真实节气，UI展示API的`localTime`，没有按浏览器时区或历史夏令时重算。

## 4. 量表来源与教学口径

用户原件已在Windows只读核对：`GB/T 46939—2025`，2025-12-31发布、2026-04-01实施；19页、427650字节。整件SHA-256：`9395f4e137971be3d2950fcd267f7c09b8c40eafefc54093fbdb0e892109fa5b`。

PDF第12–15页对应印刷页6–9，含第5章及完整附录A。逐题核对27个独立问题、每人26个适用输入、29个分量表计分条目、平和质3个反向项、男女湿热分支、五档选项、公式及30/40/60阈值，与实现一致。原件未改写、未作为新产品文件加入仓库。

先前设备离线和`read_file`解析失败均保留；改用`pdfinfo`/`pdftotext`及`pdftoppm`，对字体映射警告和提取乱码通过逐页视觉核对补充确认。详情见[量表规则与原件记录](../../../rules/CONSTITUTION-GBT46939-2025.md)，不能将工程核对写成科室认可。

转化分按`100 × (原始分 - 条目数) / (4 × 条目数)`计算，判定前不四舍五入。平和质结合其他八质阈值处理；兼夹和同分均保留，不强制选最高的一种。近一年自报体感不等于出生禀赋或疾病诊断。

五步运采用`TERM_OFFSET_TEACHING_V1`：大寒开始；春分后13日、芒种后10日、处暑后7日、立冬后4日交运，保留交节钟点，止于次年大寒。它是明确标识的现代教学工程口径，**待科室确认**，不冒称古代73日5刻法或实际年长五等分；详见[教学规则](../../../rules/LEARNING_RULES_V1.md)。

## 5. 工程验证与失败历程

证据集中在[本轮目录](evidence/2026-11-16-clinician-feedback)。各轮统计独立，参数化断言、复核探针和临床样本不混计。

| 轮次 / 代码 | 实际结果 | 可复核证据 |
| --- | --- | --- |
| 早期开发 | Domain公开导出预期失败、Service时间纯度门禁失败；一次覆盖率执行中断，均不记通过 | [Domain失败](evidence/2026-11-16-clinician-feedback/linux-01-domain-failure.txt)、[纯度失败](evidence/2026-11-16-clinician-feedback/linux-02-time-purity-failure.txt)、[中断记录](evidence/2026-11-16-clinician-feedback/linux-02-interrupted-coverage.txt) |
| Linux浏览器初尝试 | 20项启动失败，浏览器未进入流程；日志含`socket() failed: Operation not permitted`；cleanup=true | [原始结果](evidence/2026-11-16-clinician-feedback/linux-browser-blocked-results.json)、[环境](evidence/2026-11-16-clinician-feedback/linux-browser-blocked-environment.json) |
| 6565d9b候选 | `pnpm test`、`typecheck`、`test:coverage`、`schema:validate`、`contracts:check`全部退出0；随后独立复核仍发现P2 | [五项门禁结果](evidence/2026-11-16-clinician-feedback/linux-03-candidate-results.json)及同目录`linux-03-candidate-*`原始日志 |
| 1d96d87修复 | 上述五项Linux门禁全部退出0；Domain212、adapter37、Client10、Service254、Workbench126项通过 | [结果](evidence/2026-11-16-clinician-feedback/linux-04-reviewed-results.json)、[完整测试日志](evidence/2026-11-16-clinician-feedback/linux-04-reviewed-full-test.txt)及同轮其他日志 |
| 1d96d87 Windows完整浏览器 | **107通过、1失败**，0跳过、0重试，cleanup=true；唯一失败为量表翻页流程 | [Windows首轮摘要](evidence/2026-11-16-clinician-feedback/windows-01-browser-summary.json) |
| CI run43787542905 / 1d96d87 | 同样**107通过、1失败**，该轮不是通过 | [CI摘要](evidence/2026-11-16-clinician-feedback/ci-42-browser-summary.json)、[错误上下文](evidence/2026-11-16-clinician-feedback/ci-42-browser-error-context.md)、[失败截图](evidence/2026-11-16-clinician-feedback/ci-42-browser-failure.png) |
| 72a861b翻页修复 | 针对性组件测试**5/5通过**，保留原超时和重试配置 | [focused日志](evidence/2026-11-16-clinician-feedback/linux-05-pagination-focused.txt) |
| 72a861b Windows新增流程复测 | 当前教学、出生对照、量表三流程**3/3通过**，20.6秒，0重试、cleanup=true；实际Chrome`157.0.8103.39` | [本轮摘要](evidence/2026-11-16-clinician-feedback/windows-02-browser-summary.json)、[源码与构建身份](evidence/2026-11-16-clinician-feedback/windows-source-build-preservation.json) |
| CI run43789009725 / 72a861b | **PASS**；全部quality-gates成功，完整浏览器**108通过、0失败、0跳过、0不稳定项**，132.1秒，2 workers，cleanup=true | [GitHub运行](https://github.com/peterkis/yunqi/actions/runs/43789009725)、[完整日志](evidence/2026-11-16-clinician-feedback/ci-43-quality-gates.txt)、[浏览器摘要](evidence/2026-11-16-clinician-feedback/ci-43-browser-summary.json)、[环境](evidence/2026-11-16-clinician-feedback/ci-43-browser-environment.json) |

`pnpm test`包含构建、真实代理、规则/时间一致性、包测试、依赖与时间治理、生产入口、OpenAPI及项目指引检查；覆盖率和类型另外执行。上述“门禁通过”只绑定各行明确的提交，不自动覆盖后续代码。

CI 43实际使用Node `v22.23.4`、锁定pnpm `10.32.1`及bundled Chromium `156.0.8078.4`。PR head为完整`72a861ba0e55e6c5b25b5b860dd50622e1553fae`；GitHub测试检出的是该head与基线的虚拟合并提交`311da6f046a408c2bb84358dcd217dddef154e8e`，并非已合并main。其包测试为Domain212、adapter37、Client10、Service254、Workbench127项，另有schema6项；覆盖率检查复跑不重复计作新增用例。

该轮覆盖率（语句/分支/函数/行）分别为Domain `95.12/92.94/100/96.93%`、Client `100/100/100/100%`、Service `97.95/90.99/100/98.57%`、Workbench `98.75/93.60/98.88/98.71%`，均通过仓库原门槛。浏览器覆盖真实Service流程、键盘操作、8种视口/主题组合和已执行的axe规则；不等于完整WCAG认证或临床验证。

### 两个真实缺陷及修复依据

1. **出生日期上界P2**：今天时刻不详时，右开上界直接截在now会遗漏当前毫秒，交节当刻漏新候选、零时出现空区间。1d96d87改为`min(次日零时, now + 1毫秒)`并按上界前1毫秒采样；保持左闭右开、拒绝未来，DTO及冻结schema未变。
2. **量表按钮提前提交**：React复用同位置无key按钮，把正被点击的`type=button`切换成`type=submit`，尚未主动提交便触发缺答提示并回首组。72a861b为“下一组”和“生成结果”赋不同稳定key；测试改为有界5组循环，逐组断言组号、无提前错误、主动提交前零POST，未增加timeout/retry。

[Standards与Spec独立只读复核](evidence/2026-11-16-clinician-feedback/reviews.md)均确认P2及第4项覆盖限制；修复后P2关闭，后续UI修复也获独立认可。Standards的8次API请求、Spec的5场景探针为分开的复核，不是专家案例。

出生回归的初始`11 failed / 68 skipped`及即时254通过、按钮身份回归的初始RED只存于对话工具记录；没有另存原始日志，不杜撰可下载证据。Spec首次探针曾因构造不完整Instant失败，纠正后才完成有效探针。后续落盘复测不能抹去这些过程。

**Windows修复后3项通过不能与旧轮107项相加宣称同一轮108通过；Linux启动失败也不能改记为浏览器通过。**

## 6. 用户操作验收路线

按[根README](../../../README.md#workbench-development)构建并分别启动Service与Workbench；下列为科室复查路线，不冒充已经由医生完成的验收记录。

| 顺序 | 操作 | 预期可观察结果 |
| --- | --- | --- |
| 1 | 打开“当前五运六气” | 首屏看到年度中运、司天、在泉及当前运/气；其他阶段默认折叠，展开后完整可读 |
| 2 | 展开关系依据、经典摘录和交运口径 | 年度与当步关系分开；可读原文、释义并打开来源；明确看到教学口径待确认 |
| 3 | 打开“出生运气对照”，填普通生日，时刻保持不详，提交 | 出生区间与请求时当前快照并列；不把午夜取样点显示为已知出生时刻 |
| 4 | 用年度API显示的大寒交节日期复查，再改为已知交节时刻 | 整日输入保留交界候选，精确时刻唯一归属；修改输入隐藏旧结果；未来日期拒绝；“清空本次资料”清除输入与结果 |
| 5 | 打开“体质测评”，选择性别，不作答翻至最后一组 | 全程保持0/26、翻页不提交；主动生成结果后提示缺题并定位首个缺题组 |
| 6 | 完整答26题后生成结果，再改答案、切性别或清空 | 显示九质原始分/转换分、倾向/兼夹，并能同时看当前运气；旧结果失效，性别改变清空答卷 |
| 7 | 键盘操作、窄屏和深色复查；回看年度/指定时点/问诊入口 | 焦点可追踪、控件可操作、原有路由可恢复；问诊仍是规划入口，不新增病历采集 |

## 7. 隐私、限制与科室待确认事项

生日和答案只经POST进入本次计算；五个新端点均`Cache-Control: no-store`，不保存数据库、浏览器存储或URL，不建立姓名/身份证/病历关联，不回显详细答案。编辑、清空及离开页面使旧会话资料失效；量表缺答或异常值由服务拒绝。

仍需科室确认：五步运交运算法、年度/客主术语与君相火特例的教学表达、经典采用版本与摘录范围、量表适用人群/代答与结果解释、真实流程可用性。若继续第4项，须先明确出生辨体或病候线索的具体出处、适用条件和验证方法，不能从五行关系直接推导个人病种。

当前没有自动诊断、辨证、处方、方药剂量、治疗建议、患者档案或个体疾病概率。独立代码复核、量表原件一致和工程通过均不改变规则待专家冻结、临床Gate待真实材料验证的状态。

## 8. 页面实查与交付入口

Windows本地预览连接真实Fastify与历法适配器，使用真实当前时钟。已实查当前页、示例生日`1990-05-20`的时刻不详对照及量表入口/首组，最后清空量表选择并返回当前页。自动填充生日后原生值可见，但提交后输入回空并报错；经原生日期键盘确认后返回正确并列结果。这一差异仅在自动填充中出现，未确认常规输入存在产品缺陷。全页截图调用超时，保留成功的可见视口截图，CI截图另有完整页面。过程与图片哈希见[本机预览清单](evidence/2026-11-16-clinician-feedback/windows-preview-manifest.json)。

| 页面证据 | 环境与可见状态 |
| --- | --- |
| [本机当前页](evidence/2026-11-16-clinician-feedback/windows-preview-current.jpg) | Chrome157，1665×919可见视口；查询北京时间2026-11-16 10:04:23.840，真实当前年度/运/气 |
| [本机体质量表](evidence/2026-11-16-clinician-feedback/windows-preview-constitution.jpg) | 同一浏览器、1665×919可见视口；男分支0/26，第1组，右侧保留当前运气；未填写答案 |
| [CI出生对照结果](evidence/2026-11-16-clinician-feedback/ci-43-desktop-birth-result.png) | Chromium156，1440×1000视口、1440×1699全页；固定当前时间2024-01-20 22:07:22，仅为可复现测试 |
| [CI量表作答](evidence/2026-11-16-clinician-feedback/ci-43-desktop-constitution-questions.png) | 同一CI，1440×1000视口、1440×1842全页，正式题目与当前运气并排 |
| [CI窄屏当前页](evidence/2026-11-16-clinician-feedback/ci-43-narrow-current.png) | 同一CI，320×800视口、320×2973全页；运行布局无横向溢出 |

CI截图原附件路径、哈希、实际布局宽度及视口配置出处均保存在[截图清单](evidence/2026-11-16-clinician-feedback/ci-43-selected-screenshots.json)。原ZIP为artifact `14192065910`，SHA-256 `8c57c6a988f7ae9b5c7321b0a0898789854185f5751bba989d7430c648c412ad`；保留完整108项紧凑状态索引，体积较大的原始HTML/JSON报告仍由[GitHub artifact](https://github.com/peterkis/yunqi/actions/runs/43789009725/artifacts/14192065910)提供，受其14日留存期限限制。

本轮[草稿PR #16](https://github.com/peterkis/yunqi/pull/16)集中提供代码、详细计划、规则出处和工程证据。Windows项目位于`D:\Projects\YunQi`，分支为`feat/clinical-learning-workbench`；原31项文件哈希全部保持不变。main仍为既有基线，未合并或公开部署；最终交付提交及其实时CI以PR为准。

本机预览地址`http://127.0.0.1:51706/yunqi/current`仅在本次预览进程存活时有效；长期开发启动方式见根README。该预览不使用CI的2024年固定测试时间，不能混淆两类截图。
