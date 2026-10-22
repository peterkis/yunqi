# 自动化流程与 UI 验收 — 2026-10-18

基线：`12ddb044f7bfc64d643e5e95a0271a707db107c0`。
本次结果来自 Windows 本机工作区，尚未提交、推送或在 GitHub 执行 CI。

## 结果与范围

建立了仓库内可重复运行的浏览器验收：`pnpm test:browser`。
最终 Edge **70/70 PASS**，默认 Chromium **70/70 PASS**；两次均无跳过、
无自动重试，各完成 56 次页面可访问性扫描，未检出所选 WCAG A/AA 规则违规。
两个测试环境均记录 `cleanupPassed=true`，监听端口已关闭。

验收覆盖当前五运六气、年度分析、指定时点分析三个规则展示流程，以及问诊规划入口
和 404 返回路径。未新增问诊业务、患者数据、存储、医疗推断或治疗能力。
Domain、calendar adapter、Service、公共 Contract、Client 和 Workbench 运行时依赖
均未修改；`YQ-API-CONTRACT-1.0.0` 与固定北京时间语义保持不变。

这些结果仅属于合成输入的工程验收。临床验证 G1–G6 仍为 `NOT_RUN`，
E3/E4 继续等待真实专家材料，不以浏览器通过替代专家规则或临床验收。

## 可重复运行的验收

```text
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:browser
```

只检查流程：`pnpm test:browser:flows`。
只检查显示、布局和可访问性：`pnpm test:browser:visual`。
Linux 首次安装使用 `pnpm exec playwright install --with-deps chromium`。

详细操作、用例与证据格式见 [浏览器验收说明](../../../tests/browser/README.md)。
根 `quality-gates` 保留原有门禁，新增 Chromium 安装、浏览器验收和 14 天证据保留。

| 检查 | 实际覆盖 |
| --- | --- |
| 当前状态 | 根路径重定向、真实 API 时间、导航激活、六步展开/收起、Enter/Space、阶段跳转 |
| 年度分析 | 入口零请求、选择年份、六阶段与 API 时间核对、键盘选择、换年、后退/前进、刷新、返回当前页、1901/2099 边界年份 |
| 输入错误 | 非法 URL 年份不发请求并可恢复；空时点输入聚焦与提示；真实不支持年份返回错误后可修改重试 |
| 指定时点 | 明确提交才请求、分钟/秒精度、`+08:00` 请求、规范时间展示、修改后隐藏旧结果、pending 禁用与防重复、503 脱敏和恢复 |
| 问诊入口 | 三张非交互规划卡、无业务请求、未批准子路由返回 404、返回当前页 |
| 页面与运行时 | 7 个页面状态 × 8 组视口/主题；截图、横向溢出、控件内容、44px 年份控件、阶段与时间行数、标题行数、axe、控制台与未处理异常 |

视口包括 1440、1025、768、737、390、320px；深色主题另检查桌面与手机。
成功路径使用真实本地 Fastify、tyme4ts 与 Vite 同源代理。测试独立申请随机端口，
不复用或关闭用户服务。仅异常用例注入单次 503 或延迟一个真实请求。
Service 的固定时钟为 `1705759642000`，规范时间为
`2024-01-20T22:07:22+08:00`；浏览器故意使用 `America/New_York`。
这用于检查时间传输和展示一致性，不是独立的规则正确性证明。

## 发现与修复

| 问题 | 修复与回归证据 |
| --- | --- |
| 1025px 当前页横向溢出 | 原固定最小列宽使文档达 1074px；增加中间宽度布局，最终所有视口无横溢 |
| 737px 年度阶段挤成六窄列 | 改为中间宽度三列、较窄平板两列、手机一列；六个阶段名称与十二条边界时间均可见且单行 |
| 年份选择框仅 19px 高、缺少主题样式 | 改为至少 44px，继承主题和字体，提供明确焦点轮廓 |
| 桌面当前页标题孤立换行 | 去除过窄的字符宽度限制，调整字号与均衡换行；桌面标题单行 |
| 浅色辅助文字对比度不足 | 原导航/表单约 4.2:1、选中阶段约 4.33:1；调深辅助文字，自动对比度检查通过 |
| 深色提交按钮白字对比度约 2.9:1 | 为强调色按钮配置随主题变化的前景色，复验通过 |
| 可见按钮文字与可访问名称不一致 | 主题装饰字改为 SVG；当前阶段按钮用可见内容命名，完整规范边界通过 `aria-describedby` 保留；单测和 axe 通过 |
| 缺失 favicon 导致控制台 404 | 添加本地 SVG 图标和页面引用，正常流程无控制台错误 |
| 年度说明与侧栏阶段文案陈旧 | 改为直接的选年说明与“规则学习 · 只读分析”；同步根 README 的实际路由边界 |

保留了原有纸色/朱红视觉、页面内容、六气名称、原生控件及只读交互。
对桌面当前页、737px 年度页和 390px 深色时点页的最终截图进行了人工复核。
Impeccable 静态扫描另提示原有当前时间块的 3px 侧线；它不构成功能或可访问性故障，
本次按原有视觉保留，未将该样式偏好计为已修复缺陷。

截图证据：

- [年度 737px 修复前](evidence/2026-10-18-browser/before-year-737.png)
- [年度 737px 修复后](evidence/2026-10-18-browser/after-year-737.png)
- [桌面当前页修复后](evidence/2026-10-18-browser/after-current-desktop.png)
- [深色时点页修复后](evidence/2026-10-18-browser/after-calculate-dark.png)
- [最终开发预览首屏](evidence/2026-10-18-browser/after-current-preview.png)（使用实时系统时钟，非固定时钟用例）

## 执行证据与失败保留

机器摘要：[browser-summary.json](evidence/2026-10-18-browser/browser-summary.json)。
完整 HTML、JSON、截图和失败 trace 在仓库本地 `.artifacts/browser/` 下，
每次运行独立保存，未覆盖失败结果。

| 本地 run 目录 | 状态 |
| --- | --- |
| `2026-10-17T16-35-55-503Z-b3dc191b` | 首轮视觉 RED：15 FAIL，复现布局、对比度、名称和图标问题 |
| `2026-10-17T16-38-49-377Z-ecfd43ce` | 首轮流程：4 PASS / 10 FAIL；业务断言通过，失败原因为 favicon 404 |
| `2026-10-17T16-41-30-972Z-f0982350` | `--list` 用例发现，未执行验收；原始 70 skipped，解释为 NOT_RUN |
| `2026-10-17T16-44-56-688Z-f1518d68` | Edge 155.0.4283.45：70 PASS，56 次 axe 无违规，cleanup PASS |
| `2026-10-17T16-48-26-591Z-a3df046a` | Chromium 156.0.8078.4：70 PASS，56 次 axe 无违规，cleanup PASS |

目录名称采用 UTC 记录运行时刻；用户验收日期为北京时间 2026-10-18。
首轮 Vite 将 `port: 0` 解析为默认端口，框架随后改为 Vite middleware 加独立
Node HTTP listener，让操作系统分配随机端口；最终两轮已验证独立启动与清理。

基线 `pnpm typecheck`、`pnpm test:coverage`、`pnpm contracts:check`、
`pnpm schema:validate` 均通过。修复后 Workbench 类型检查、测试类型检查、
覆盖率与 Workbench/时间治理再次通过。Workbench 覆盖率为语句 98.83%、
分支 92.95%、函数 100%、行 98.82%。

最终全量 `pnpm test` **PASS，exit 0：763 PASS / 1 SKIP / 0 FAIL**。
执行时间为北京时间 00:54:00–00:55:53；期间相关源码与 CI 文件哈希无漂移。
时区、生产入口、OpenAPI lint/check 均通过。
详见 [质量汇总](evidence/2026-10-18-browser/quality-summary.json)与
[验证时源码哈希](evidence/2026-10-18-browser/validated-source-sha256.json)。

以下中间结果保持原样：

- 首轮 `pnpm test` 在各包测试及治理检查通过后，Redocly 于 Windows 退出时触发
  `UV_HANDLE_CLOSING`，该轮为 FAIL；独立 `openapi:lint`/`openapi:check` 重跑 exit 0。
- 并发运行时，修复后第一次 Workbench 单测出现 `main.test.tsx` 5000ms 启动超时，
  为 109 PASS / 1 FAIL；未修改超时。随后单进程 coverage 的 110 项均通过。
- 收尾完整测试发现 CI 命令列表测试仍精确期望旧 7 条命令，该轮为 FAIL。
  将两条浏览器步骤追加到严格顺序预期后，契约治理定点复测 32/32 PASS；
  没有放宽断言，也没有更改任何 API Contract 冻结投影。
- 为避免浏览器与完整单测争用资源，中断了一份已排队的治理运行；独立重跑通过。
- 完整构建期间，另行打开的开发预览曾因共享依赖热更新出现 Provider 错误边界。
  [中断截图](evidence/2026-10-18-browser/development-build-interruption.png)保留为开发环境干扰证据；
  浏览器页面重新载入可恢复。正式自动验收关闭 HMR 并使用独立 Vite 缓存，
  不把开发热更新过程计入 70 项业务/显示验收。
- Windows 文件符号链接权限导致 Workbench 治理保留 1 项 SKIP；3 个既有 OpenAPI
  warning 保留。

质量日志保存在 `.superpowers/browser-acceptance-20261018/quality/`。
独立只读代码复核没有剩余可报告缺陷；视觉断言已补充预期元素数量检查，避免
“元素被隐藏后空数组通过”。

## 证据的限制

截图是本次人工复核依据，尚未建立经批准的像素基线。自动 axe 通过不代表完整
WCAG 认证。未验证物理触屏、真实读屏器、Firefox、WebKit 或生产部署。
真实专家规则验证、临床验收与远端 CI 均未在本次执行。
