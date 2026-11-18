# 通用要求（每张卡都适用）

你在 TCM YunQi Lab 仓库中工作，分支 `feat/prototype-finals`（或并行时的卡分支）。先读 `AGENTS.md`、`DESIGN.md`、
`docs/agents/workbench.md`、`docs/agents/verification.md`，再读本卡“必读”列出的文件。

## 规则

- 只做本卡范围内的事（定稿参考稿见本计划 `reference/`，与现行规则的调整见本计划 `README.md`，以卡片为准）；发现超出范围的问题，写进最终报告，不要顺手改。
- 不提交、不推送、不切换分支、不改 git 配置。不删除或改写历史证据、原始资料和 `docs/design/` 下的同步文件。
- 不新增运行时依赖；不修改 Service、Domain、Contracts、Client、OpenAPI、规则文件和契约冻结文件。
- 组件只接收 ViewModel；DTO 只在 `presentation` mapper 中使用；组件不调用 client、不拼 API 路径、不做领域计算。
- 业务时间只展示 API `localTime` 并标注“北京时间 UTC+08”；禁止 Date、Intl、Temporal、epoch 推算或倒计时。
- 视觉只用设计令牌 CSS 变量（`var(--令牌名)`），不写裸色值、裸字号、裸间距；字体、图标本地加载；图标为内联 SVG。
- 遵守 `docs/design/design-system/2-constraints.md` 全部硬约束（层次、颜色用途、无红色/风险视觉、可访问性、文案）。
- 不实现：HIS 患者信息、出生日期取自 HIS、“复制结论到病历”、宿主停靠、原型中的“演示：一键填完”。
- 不得删除、跳过或放宽仍覆盖现有行为的测试；被本卡改掉的界面，在同一变更内按新设计改写对应单测和浏览器用例。
- 不降低覆盖率阈值，不加 coverage exclude。
- 可能与其他卡并行开发：本卡新增样式放在本视图自己的样式文件（如 `src/styles/views/<视图>.css`）并在入口追加一行引入；
  对共享文件（路由表、`main.tsx`、`design-components.css`、`docs/agents/workbench.md`、共享浏览器用例）只做本卡必需的局部增改，
  不重排、不重命名、不重写无关部分；不修改其他视图的组件与用例。

## 检查

按本卡“检查”一节运行。你的沙箱无法启动 Chromium：`pnpm test:browser` 记为 NOT_RUN，由评审方在本机运行；
但浏览器用例仍须在本卡内按新界面改写，并至少用 `node --check` 检查语法。其他被沙箱阻止的检查同样记 NOT_RUN 并写明原因，不要伪造结果。

## 最终报告（你的最后一条消息，用中文，按此结构）

1. 完成内容：按验收标准逐条写 DONE / PARTIAL / NOT_DONE，并给出对应文件。
2. 修改文件清单。
3. 检查结果：每条命令及退出码（PASS / FAIL / NOT_RUN + 原因）。
4. 与设计规范或原型的差异及原因。
5. 待决问题或风险。
