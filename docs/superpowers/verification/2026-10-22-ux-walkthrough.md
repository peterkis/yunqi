# 2026-10-22 医生业务操作模拟走查与 UI/UX 修复

## 范围与基线

- 用户授权：在 Chrome 中按中医科医生的使用顺序操作走查，发现 UI/UX 问题后逐项修复。本次为代理模拟操作，不是真实医生反馈或专家验收。
- HEAD：`12ddb044f7bfc64d643e5e95a0271a707db107c0`。开始时工作区已有大量修改；本次在原工作树增量修复，未提交、推送或发布。
- 适用规则 / 契约：`YQ-MVP-RULES-1.1.0` / `YQ-API-CONTRACT-1.1.0`。未修改 Domain、历法、Service、Contracts、Client、依赖或患者相关能力。
- 模拟动线：当前时气 → 本年六气 → 相邻年比较 → 六步选择 / 方向关系复核 → 指定北京时间分析、编辑与重试 → 问诊规划入口。
- 手工操作使用 Chrome DevTools MCP。使用仓库浏览器环境的真实 Fastify Service + tyme4ts + Vite 同源代理；环境时钟固定为 `2024-01-20T22:07:22+08:00`，供重复验证。指定时点手工例为 `2026-05-20T13:30:00+08:00`，没有输入患者资料。
- 手工桌面视口为 1440×1000，窄屏使用设备模拟 390×844。初次 `resize_page(390)` 实际宽度仍为 500，因此改用设备模拟并核对 `innerWidth=390`，不将前一次截图冒称 390px。

## 发现与修复

| 编号 | 操作中的问题 | 修复 | 核验 |
| --- | --- | --- | --- |
| UX-01 | 首页先显示大块年度背景，当前阶段需要继续下滚才能看全 | 当前阶段移到年度概览之前；缩小页面标题和节间留白 | 桌面首屏可直接读到当前主气、客气与客主关系 |
| UX-02 | 年份、干支等事实放在高大的分栏卡片中，年界挤在单列 | 年度事实集中成一组，年界单独横排并明确起止包含关系；移动端成组重排 | API 时间和五行 / 太过不及 / 五音均保留 |
| UX-03 | 当前页到本年分析需要重新从 201 个年份中选择；比较邻年反复打开下拉框 | 增加来自当前结果年份的链接、上一年 / 下一年按钮；空入口及 1900 / 2100 边界禁用相应按钮 | URL、浏览器后退、阶段重置和零默认查询回归 |
| UX-04 | 390px 年度页六个阶段纵向占据多屏，选择反馈远离控件 | 六个原生单选项改为两行；时间标准合并；详情紧随选择器 | 详情标题从约 3092px 前移至约 1215px；保留键盘方向键与完整时间的可访问描述 |
| UX-05 | 大量英文眉题、API/currentStep/前端实现说明抢占阅读层级 | 删除装饰性英文眉题；主流程改为操作说明；重复契约信息折叠到页脚 | API 原始规则说明及结果追溯信息仍完整显示 |
| UX-06 | 原生日期时间控件下要求用户按 ISO 字符串格式输入，按钮与输入框错位 | 改成按日期、时分秒填写的说明；补充支持运气年范围；按钮对齐输入框，窄屏占满一行 | 原生空值聚焦、分钟 / 秒精度、显式提交、pending 禁重复、编辑隐藏旧结果保持 |
| UX-07 | 指定时点成功后先经过年度背景与六气列表，才能看到所选阶段 | 增加简短成功播报；所选阶段提前至结果开头 | 仍使用 API 返回的阶段索引，未在 UI 重新判步 |
| UX-08 | “问诊”导航看起来已开放，进入后才发现仅为规划 | 导航直接标注“规划中” | 三张规划卡仍只读，无业务请求、患者表单或子路由 |
| UX-09 | 长页面切换入口需要回找导航；键盘缺少跳过导航的入口 | 固定导航位置、提供“跳至主要内容”；切换工作区域时聚焦正文并滚入视野，切年保留控件焦点 | 窄屏长页面切换、跳转链接及契约折叠区 Enter/Space 回归 |

界面保留原有纸色、朱砂色和宋体标题风格；去除背景网格以降低视觉干扰。相生相克方向、传统描述、司天在泉、六气全称和时间边界均来自原展示模型。

## 操作截图

截图均来自本次操作，以下先后对照并非像素基线测试。自动化最终截图及浏览器版本在本轮浏览器证据中另存。

1. [当前页修复前](evidence/2026-10-22-ux-walkthrough/01-current-before.png) → [修复后桌面首屏](evidence/2026-10-22-ux-walkthrough/06-current-desktop-after.png)。
2. [年度页修复前](evidence/2026-10-22-ux-walkthrough/02-annual-desktop-before.png) → [修复后桌面首屏](evidence/2026-10-22-ux-walkthrough/07-annual-desktop-after.png)。
3. [窄屏年度页修复前](evidence/2026-10-22-ux-walkthrough/04-annual-mobile-before.png) → [窄屏阶段选择后](evidence/2026-10-22-ux-walkthrough/08-annual-mobile-selection-after.png)。
4. [时点表单修复前](evidence/2026-10-22-ux-walkthrough/03-time-desktop-before.png) → [窄屏成功反馈](evidence/2026-10-22-ux-walkthrough/09-time-mobile-after.png)。
5. [问诊入口修复前](evidence/2026-10-22-ux-walkthrough/05-inquiry-mobile-before.png)。

## 工程验证

结果记录在 [check-results.txt](evidence/2026-10-22-ux-walkthrough/check-results.txt)。

| 检查 | 本轮结果 |
| --- | --- |
| `pnpm test` | PASS，exit 0；其中 Workbench 112/112。保留一条 Windows 不允许创建文件符号链接的既有 SKIP |
| `pnpm typecheck` | PASS，exit 0 |
| `pnpm test:coverage` | PASS，exit 0；Workbench statements 98.14%、branches 91.02%、functions 98.31%、lines 98.13% |
| `pnpm contracts:check` | PASS，exit 0 |
| `pnpm schema:validate` | PASS，exit 0 |
| `impeccable detect --json apps/yunqi-workbench/src` | exit 0，返回空发现数组；不替代浏览器与人工判断 |
| Chrome 浏览器验收 | PASS，73/73，exit 0，retries 0，cleanupPassed=true |

根测试已经包含 Workbench、契约、时间治理与项目指引检查，以及 Service 时区、生产入口和 OpenAPI 检查。OpenAPI lint 保留 3 条既有 warning。没有改写 CI 或降低任何门禁。

Chrome 验收使用 `YUNQI_BROWSER_CHANNEL=chrome pnpm exec playwright test --workers=1`，在已更新构建后运行。并发由默认 2 改为 1，retries 仍为 0。共有 17 条流程用例（原 14 + 本次 3）以及 56 条布局 / 自动无障碍用例，覆盖 320、390、737、768、1025、1440 宽度及浅色 / 深色组合。浏览器时区仍为 America/New_York，以检验 UI 未重新解释北京时间。

本轮独立结果为 73 PASS / 0 FAIL / 0 SKIP，耗时约 2.8 分钟；[完整结果](evidence/2026-10-22-ux-walkthrough/browser-final/results.json)、[环境与清理](evidence/2026-10-22-ux-walkthrough/browser-final/environment.json)、[执行日志](evidence/2026-10-22-ux-walkthrough/browser.log)均已保存。原始本机完整 HTML 报告位于 `.artifacts/browser/2026-10-22T08-38-40-288Z-be1bd667/report/index.html`，后者为忽略目录，不能代替这里保留的证据。

最终构建代表截图：[桌面当前页](evidence/2026-10-22-ux-walkthrough/browser-final/desktop-light-current.png)、[窄屏年度页](evidence/2026-10-22-ux-walkthrough/browser-final/mobile-light-annual-result.png)、[窄屏深色年度页](evidence/2026-10-22-ux-walkthrough/browser-final/mobile-dark-annual-result.png)、[320px 指定时点结果](evidence/2026-10-22-ux-walkthrough/browser-final/narrow-light-calculate-result.png)、[问诊规划页](evidence/2026-10-22-ux-walkthrough/browser-final/desktop-light-inquiry.png)。

## 中间失败与证据限制

- 首轮 Workbench 验证为 106 PASS / 6 FAIL，原日志保存在 [workbench-first.log](evidence/2026-10-22-ux-walkthrough/workbench-first.log)。失败涉及旧文案断言、移除的英文眉题，以及 CurrentYunQiPage 新增 Link 后需要 Router 测试上下文。已同步合法交互断言，第二轮 112/112 PASS；没有删除业务断言或弱化治理。
- 手工 Chrome 的首次分钟格式填充未保留到控件中；重新按秒精度填写并读取实际 input value 后才继续。分钟归一化另由真实浏览器套件验证，不把工具返回“已填写”当作产品成功。
- Chrome MCP 直接保存截图到仓库路径时返回路径限制；保存并核对的是工具返回的同一截图字节，没有使用其他窗口截图替代。
- 初次手工服务以非交互 stdin 启动，无法通过 stdin 执行优雅关闭。核对任务所拥有 PID 与命令行后停止该进程，确认 64485 / 64484 均无监听；记录见 [manual-server-cleanup.json](evidence/2026-10-22-ux-walkthrough/manual-server-cleanup.json)。该记录明确 `gracefulTeardown=false`，不冒称 runner 的 cleanupPassed。
- 本轮截图与自动 axe 检查只证明已覆盖的页面状态。没有实机触控、真实屏幕阅读器、Firefox/WebKit、真实医生独立反馈或专家签署证据。
- 规则专家冻结仍待完成，临床 G1–G6 仍为 NOT_RUN。本次不启动 E3/E4，不构成诊断、辨证、治疗或临床有效性验收。

## 变更与来源绑定

- [开始时状态](evidence/2026-10-22-ux-walkthrough/baseline-status.txt)；[开始时 HEAD](evidence/2026-10-22-ux-walkthrough/baseline-head.txt)。
- [修改前源码哈希](evidence/2026-10-22-ux-walkthrough/source-before.json)；[修改后源码哈希](evidence/2026-10-22-ux-walkthrough/source-after.json)。
- [相对本次开始状态的变更清单](evidence/2026-10-22-ux-walkthrough/task-changes.json)及[差异](evidence/2026-10-22-ux-walkthrough/task-changes.patch)，区分工作区原有修改。清单覆盖 Workbench 源码与浏览器测试；另更新 Workbench README 与本报告。
- [构建 / harness 摘要](evidence/2026-10-22-ux-walkthrough/harness-build-hashes.json)。HEAD 仅作身份基线，结论同时绑定 dirty 源码和构建 / runner 摘要。
