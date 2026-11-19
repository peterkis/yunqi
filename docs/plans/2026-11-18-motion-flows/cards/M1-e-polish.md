# M1-e 动效收尾：结果节奏、降档诊断与现场验证

> 放置位置：`docs/plans/2026-11-18-motion-flows/cards/M1-e-polish.md`
> 前置：M1-a～d 已合并（main e7f349e，PR #26）。通用约束沿用 `docs/plans/2026-11-18-prototype-finals/cards/_common.md`：UI 不计算领域规则；样式只用 tokens；推送与 PR 需用户同意。不改契约、DTO、判定与教学规则。

## 背景

M1 评审通过，但还有几件事没收住：

1. **结果节奏**：M1 卡片里的结果揭示时序自相矛盾——80 + 8×24 + 240 = 512ms，超过卡片自己定的 400ms 上限。实现时把间隔压到 10ms，能守住上限，但九条的时间差只有 80ms，低于人眼能分辨“先后”的阈值（约 100ms），看起来就是同时出现，“按标准顺序依次出现”的意图丢了。
2. **帧率探测**：评审在 CPU 降速 6 倍下实测，空闲首屏仍约 60fps，没有触发降档。空闲时的 rAF 采样测不出真实负载，远程桌面（RDP / Citrix）和老旧 PC 的瓶颈出现在“正在动”的时候。
3. **降档原因不可见**：“动效设置”只显示“当前：精简”，不显示原因。院内现场排查时，无法分辨是系统设置、内核能力还是帧率导致的降档。
4. **路由私有接口**：导航拦截依赖 React Router 的私有接口 `UNSAFE_NavigationContext`（7.18.1 锁版本）。升级路由时，这里有静默失效的风险。
5. **仓库体积**：`evidence/` 目录 4.3MB，其中 GIF 4.2MB，会永久留在 git 历史里。
6. **现场验证**：院内真实环境的降级验证还是 NOT_RUN。

## 要求

### 1. 结果揭示节奏（决定：保留 400ms 上限，恢复可感知的先后）

- **新时序**：起播 60ms，间隔 20ms，单条时长改用 `--motion-base`（180ms）。
  - 计算：60 + 8×20 + 180 = 400ms；
  - 九条的时间差为 160ms，人眼能看出由上到下的先后。
- **tokens**：`motion-result-start` 改为 60ms，`motion-result-stagger` 改为 20ms；`reduced` / `off` 档仍为 0ms。`usage` 写明算式。
- **样式**：`constitution-motion.css` 中，`.constitution-bar-fill` 和 `.constitution-bar-score` 的动画时长从 `--motion-slow` 改为 `--motion-base`。
- **其他时序**：
  - 判定卡保持 0ms 起、`--motion-base`。
  - 互参卡保持从 240ms 起、120ms 淡入，360ms 结束；它和最后一条结果条的 400ms 收敛不冲突。
  - 作答圆点仍用通用 24ms 间隔。
- **文档**：
  - `1-layout.md` 动效表格同步修改；
  - M1 卡片第 4.4 节加一行勘误，说明原时序与上限冲突，以本卡为准。
- **测试**：结果揭示断言改为九条延迟 `[60,80,…,220]`，单条 180ms，最后结束于 400ms；总预算断言保持不变。

### 2. 帧率探测补“动中测”

- **保留现状**：空闲探测保留，作为首屏判断。
- **新增动中测**：在 `full` 档下，用户第一次触发真实动效时，在那次过渡期间采样，阈值沿用平均 >24ms 或超过 1/3 的帧 >50ms。
  - 可触发的动效：切 tab 视图过渡、年轮首绘、分段指示块滑动，三者取先发生者。
  - 实现：有 `PerformanceObserver` 的 `long-animation-frame` 时优先用它统计长帧，没有时退回 rAF 采样。
- **命中后**：
  - 从下一次动效起降到 `reduced`，当前这次动画不中断；
  - 结果记入 `sessionStorage`，本会话不再重测；
  - 原因记为 `frame-in-flight`。
- **约束**：探测不改变任何可见状态；用户手动选了“标准”时不做降档。

### 3. 降档原因可见

- **原因记录**：`MotionProvider` 在算出档位的同时给出原因，可能的取值为：
  - `manual` 手动；
  - `system` 系统减少动态效果；
  - `forced-colors` 高对比度；
  - `url` URL 参数；
  - `no-has` 内核过旧；
  - `no-view-transition` 缺视图过渡；
  - `frame-idle` 空闲帧率偏低；
  - `frame-in-flight` 动画中帧率偏低；
  - `default` 默认。
- **界面**：“动效设置”的说明行改成“自动跟随系统与设备能力，当前：精简（原因：动画中帧率偏低）”。文案放在 mapper 或常量表里，组件不拼规则。
- **诊断信息**：“计算说明与版本”里追加一行“动效 精简 · frame-in-flight · Chromium 109”，供现场截图反馈。内核版本取自 `navigator.userAgentData` 或 UA 字符串，只用于显示。
- **勘误（评审决定）**：原因优先级保持 M1-a 硬关闭规则不变，为 `url` > `forced-colors` > `no-has`（硬关闭，压过手动） > `manual` > `system` > `no-view-transition` > `frame-idle` / `frame-in-flight` > `default`，以保持高对比度、URL 强制关闭和最低内核能力等无障碍/兼容性硬约束；下文“检查”一节原写的“手动 > url / forced-colors”作废。

### 4. 去掉对路由私有接口的依赖（可单独成 PR）

- **首选**：改用 React Router 7 自带的 `viewTransition` 导航选项，即 `navigate(to, { viewTransition: true })` 和 `<Link viewTransition>`。
  - 方向（平级的前后、下钻 / 返回）在调用导航前写到 `document.documentElement.dataset.navDirection`，由 CSS 读取；
  - 封装成 `usePanelNavigate()`，页面内的跳转都走它。
- **滚动恢复和入口回焦**：继续用内存 Map，在 `usePanelNavigate()` 和返回按钮里处理，不再依赖拦截 navigator。
- **降级要求不变**：没有视图过渡 API 时，原生选项会自动退化为普通导航；`reduced` / `off` 档时不传 `viewTransition`。
- **如果原生方案满足不了**（比如浏览器后退键也要有方向）：保留现方案，并加一个单测断言 `UNSAFE_NavigationContext` 存在且其 `navigator` 带 `push` / `replace`，让路由升级时测试直接报错，而不是静默失效。

### 5. 证据目录瘦身

- 从仓库删除 `evidence/media/M1-full-walkthrough.gif`，改为附在 PR #26 的评论里，或放到内网制品库。
- 在 `M1-review.md` 中改成链接，并记录文件的 SHA-256。
- `*-diagnostics.json` 保留，但以后的卡默认只提交摘要，大体积诊断文件放 `.artifacts/`（已在 `.gitignore`）。
- 不改写 git 历史。

### 6. 院内现场验证（人工，不阻塞代码合并）

新建 `evidence/M1-field-check.md` 表格，逐项记录：

| 环境 | 期望档位 | 实际档位 · 原因 | 切 tab / 作答 / 结果揭示主观流畅度 | 截图 |
|---|---|---|---|---|
| 门诊常用 PC 本机，Win10 + WebView2 / Chrome 最新版 | full | | | |
| 同一 PC 经 RDP 远程桌面访问 | reduced（动中测命中） | | | |
| Citrix / 云桌面（如院内在用） | reduced | | | |
| Win7 + Chrome 109 / 360 极速模式（如仍在用） | reduced（no-view-transition） | | | |
| Windows 高对比度主题 | off（forced-colors） | | | |
| 系统开启“减少动画” | reduced（system） | | | |

在“实际档位 · 原因”一列直接填写第 3 项新增的诊断行。

## 检查

- **单测**：
  - 原因枚举的优先级（手动 > url / forced-colors > 系统 > 能力 > 帧率）；
  - 动中测：注入假的 LoAF 条目和 rAF 时间戳，各覆盖一次命中和一次不命中；
  - 命中后不打断当前这次动画；
  - 手动选“标准”时不降档。
- **浏览器**：
  - 结果揭示新时序断言；
  - “动效设置”说明行和“计算说明与版本”诊断行，在三档与能力缺失项目中文字正确；
  - 用 CDP `Emulation.setCPUThrottlingRate` 设为 20 倍，切 tab 两次后档位变为 `reduced`、原因为 `frame-in-flight`（不稳定时标记为环境相关，测试降为软断言并记录数值）。
- **路由**（若做第 4 项）：现有 flows 三档、能力缺失项目全部通过；滚动恢复、入口回焦断言不变。
- **全量**：`pnpm build`、`pnpm test`、`pnpm test:browser` 全绿；仓库中不再有 GIF。
