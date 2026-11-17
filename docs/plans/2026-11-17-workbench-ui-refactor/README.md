# Workbench UI 重构计划（2026-11-17）

按 [DESIGN.md](../../../DESIGN.md) 把 Workbench 重构为 400px 门诊侧栏面板。
本计划由 Claude 拆分任务卡，在本机派发给 Codex CLI 实现，Claude 评审并提出返工意见，直至验收。

## 已确认决策（2026-11-17，用户确认）

| 事项 | 决定 |
| --- | --- |
| 最终宿主 | Tauri 2，医院内网运行 |
| Service 部署 | 内网服务器集中部署；Tauri 应用经 HTTP 访问（Tauri 阶段再定 HTTP 插件或 CORS 白名单） |
| 工作站系统 | 仅 Windows 10/11；安装包须离线携带 WebView2（离线安装器或固定运行时） |
| 阶段顺序 | 先在现有 Vite 应用内完成 UI 重构（浏览器与 CI 可验证），Tauri 外壳作为后续阶段 |
| 旧页面 | 年度分析、指定时点保留为面板下钻页并按新规范重绘；问诊规划保留为隐藏规划路由 |
| 超出授权的原型元素 | 本轮不实现：HIS 患者信息、出生日期取自 HIS、“复制结论到病历”、宿主停靠。标题栏使用不含身份的占位 |

## 技术栈（本轮不变）

React 19、Vite 8、TypeScript、react-router-dom 7.18.1、TanStack Query；运行时依赖白名单不变（6 个）。
样式为纯 CSS + 设计令牌 CSS 变量，字体本地加载，不引入 UI 库或 CSS 框架。
Tauri 相关依赖（`@tauri-apps/api` 等）在 Tauri 阶段单独授权并更新治理检查。

## 不变的边界

- 架构与依赖：`workbench → client → contracts`；组件只接收 ViewModel；见 [Workbench 约束](../../agents/workbench.md)。
- 业务时间：只展示 API `localTime` 并标注“北京时间 UTC+08”；禁止 Date/Intl/Temporal 计算或重建（因此设计中的“还有 N 天”不实现）。
- 医疗边界：见 [医疗与阶段范围](../../agents/clinical-scope.md) 与设计规范“医疗安全”约束。
- 门禁：见 [验证与交付 · UI重构期间的门禁](../../agents/verification.md#ui重构期间的门禁)。每张卡在同一变更内改写受影响的浏览器用例，`pnpm test:browser` 保持全绿。

## 任务卡

| 卡 | 内容 | 依赖 | 状态 |
| --- | --- | --- | --- |
| [C1](cards/C1-foundation.md) | 设计令牌、本地字体、主题、基础组件 | — | 待派发 |
| [C2](cards/C2-panel-shell.md) | 面板骨架、分段导航、下钻框架、收起态、路由 | C1 | 待派发 |
| [C3](cards/C3-current-view.md) | 当下运气默认态 + 原文与释义下钻 | C2 | 待派发 |
| [C4](cards/C4-birth-comparison.md) | 先天 × 当下对照 | C2 | 待派发 |
| [C5](cards/C5-constitution.md) | 体质量表一题一屏 + 结果互参 + 对照内同页测评 | C4 | 待派发 |
| [C6](cards/C6-drilldown-pages.md) | 年度、指定时点、问诊规划、未找到与反馈状态改为下钻页 | C2 | 待派发 |
| [C7](cards/C7-acceptance-cleanup.md) | 浏览器验收矩阵迁移、demo 样式清理、文档收口 | C3–C6 | 待派发 |

后续阶段（另行授权）：Tauri 2 外壳、停靠窗口与收起胶囊、宿主适配层、离线安装与 WebView2、Windows 构建与签名。

## 工作流

1. 分支 `feat/workbench-ui-refactor`。Codex 不提交；Claude 评审通过后按卡在本地提交，推送需用户同意。
2. 派发：`codex exec -C <repo> --sandbox workspace-write -o <结果文件>`，提示词为卡片全文与通用要求。
3. 评审：Claude 核对差异、按卡运行检查、对照设计规范与原型；结论写入 `reviews/Cn-review-k.md`。
4. 未达标项写成返工意见再次派发，直至通过；无法在卡内解决的问题记录为待决项交用户。
