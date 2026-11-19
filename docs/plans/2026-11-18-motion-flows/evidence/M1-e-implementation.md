# M1-e 实现证据（开发部分：第 1、2、3、5 项，2026-11-19）

- 分支与基线：`fix/motion-polish`，HEAD `e7f349e7f63677bdcaccff03a09e35f0b7dffec5`（`main` e7f349e）。开始前暂存区已有评审方删除的 `docs/plans/2026-11-18-motion-flows/evidence/media/M1-full-walkthrough.gif` 与未跟踪的 `docs/plans/2026-11-18-motion-flows/cards/M1-e-polish.md`，均按要求保留未恢复/未覆盖。未提交、未推送、未切换分支、未修改 git 配置、未访问网络。
- 范围：只完成 M1-e 第 1、2、3、5 项的产品代码与文档；不做第 4 项（路由私有接口，另开分支）与第 6 项（院内现场验证）；按分工未新建或修改任何单测、浏览器用例或根目录治理测试文件。
- 环境与产物：Node `v24.18.0` / pnpm `10.32.1`；最终 Workbench 生产构建 196 modules，`index-df24MH9U.js` SHA-256 `d450f30159148d8d4e4954501ec1d6bf8dfc99b879c3b3697dcabc17169f330a`，`index-BhxS4Pam.css` SHA-256 `4487238e40c192269aedd3b221e756a2196c731e3263ca272ed59d942763101e`。本证据仅记录摘要，不提交大体积诊断文件。

## 分项实现摘要

### 第 1 项：结果揭示节奏（60 + 8×20 + 180 = 400ms）

- **改动内容**：
  - 将 `motion-result-start` 由 `80ms` 调整为 `60ms`，`motion-result-stagger` 由 `10ms` 调整为 `20ms`，并同步 `usage` 算式 `60 + 8×20 + 180 = 400ms`；`reduced` 与 `off` 覆盖保持 `0ms`。
  - 将 `constitution-motion.css` 中 `.constitution-bar-fill` 与 `.constitution-bar-score` 动画时长由 `--motion-slow`（240ms）改为 `--motion-base`（180ms），并更新顶部注释算式；判定卡（0ms 起、`--motion-base`）、互参卡（240ms 起、`--motion-fast` 120ms，360ms 结束）与作答圆点（`--motion-stagger` 24ms）时序保持不变。
  - 同步更新 `1-layout.md` 动效 tokens 表格，并在 `M1-motion-flows.md` 第 4.4 节追加勘误说明原 `80 + 8×24 + 240 = 512ms` 与 400ms 上限冲突，以 M1-e 为准。
- **涉及文件**：
  - `docs/design/design-system/tokens.json`
  - `apps/yunqi-workbench/src/styles/tokens.css`
  - `apps/yunqi-workbench/src/styles/views/constitution-motion.css`
  - `docs/design/design-system/1-layout.md`
  - `docs/plans/2026-11-18-motion-flows/cards/M1-motion-flows.md`

### 第 2 项：帧率探测补“动中测”

- **改动内容**：
  - 保留既有空闲探测（`yunqi-motion-frame-rate`），复用统一纯函数 `evaluateFrameIntervals`（平均间隔 `> 24ms` 或超过 `1/3` 帧 `> 50ms`）。若动中测已先触发降档，则停止尚未结束的空闲探测，避免 `frame-idle` 覆盖 `frame-in-flight`。
  - 新增纯判定与采集模块：
    - `apps/yunqi-workbench/src/lib/motion-diagnostics.ts`：导出 `resolveMotionState`、`evaluateFrameIntervals`、`evaluateInFlightSample`、`parseIdleFrameStorage`、`parseInFlightFrameStorage`、`serializeInFlightFrameStorage`、`detectBrowserEngine`、`formatMotionStatus`、`formatMotionDiagnostics` 及全部键名/阈值/文案常量。
    - `apps/yunqi-workbench/src/lib/in-flight-motion-probe.ts`：导出 `supportsLongAnimationFrames` 与 `startInFlightFrameProbe`。当 `PerformanceObserver.supportedEntryTypes` 含 `long-animation-frame` 时启用 LoAF 观察器（`buffered: false`，收尾前调用 `takeRecords()`）并结合 rAF 帧间隔去重合并计算；否则仅使用 rAF 帧间隔。
  - 在 `MotionProvider` 中新增 `observeInFlight`（通过可选 hook `useMotionInFlightObserver` 供组件安全消费，脱离 Provider 时为 `undefined`）：
    - 仅当 `level === 'full'`、`preference === 'auto'`、本会话尚无动中测结果且当前无进行中的动中测时启用；用户手动选择任何档位时不采样、不降档，进行中切到手动或降档时立即取消且不写入存储。
    - 挂载在三处真实动效入口，三者取先发生者且每会话只测一次：
      1. 切 tab / 视图过渡：`navigation-transition.ts` 新增可选 `hooks.onStart`（不读取 `ViewTransition.finished`，提交与 `ready` 时重置计时，`ready` 拒绝或异常时取消探测），`PanelNavigation.tsx` 仅做最小调用接入，不改 `UNSAFE_NavigationContext` 用法。
      2. 年轮首绘：`YunQiWheel.tsx` 仅在首次描绘实际启动 WAAPI 动画时按 `--motion-emphasis`（320ms）采样，卸载/StrictMode 重跑时取消。
      3. 分段指示块滑动：`useSegmentIndicator.ts` 仅在 `animated === true` 时按 `--motion-base`（180ms）采样，切换打断或 resize 时取消。
    - 命中阈值后在本次动效计时结束时再将 `inFlightFrameResult` 设为 `'reduced'`（不改动当前动画进行中的 `data-motion`），并以 `try/catch` 写入 `sessionStorage` 键 `yunqi-motion-frame-in-flight`（命中写 `'frame-in-flight'`，未命中写 `'full'`；读取同时兼容 `'frame-in-flight'`/`'reduced'` 与 `'full'`，与既有空闲键 `yunqi-motion-frame-rate` 互不冲突）。全程不改变可见状态、DOM、样式或焦点；时间戳仅用于渲染性能统计，未引入 Date/Intl/Temporal。
- **涉及文件**：
  - `apps/yunqi-workbench/src/lib/motion-diagnostics.ts`（新增）
  - `apps/yunqi-workbench/src/lib/in-flight-motion-probe.ts`（新增）
  - `apps/yunqi-workbench/src/providers/MotionProvider.tsx`
  - `apps/yunqi-workbench/src/app/navigation-transition.ts`
  - `apps/yunqi-workbench/src/app/PanelNavigation.tsx`
  - `apps/yunqi-workbench/src/components/design/useSegmentIndicator.ts`
  - `apps/yunqi-workbench/src/features/yunqi/components/YunQiWheel.tsx`

### 第 3 项：降档原因可见与诊断行

- **改动内容**：
  - `MotionProvider` 通过 `resolveMotionState` 同步算出 `level` 与 `reason`，并暴露 `reason` 与 `engine`（启动时读取一次）。
  - `MotionSettings.tsx` 改用 `formatMotionStatus(level, reason)` 渲染说明行，格式为 `自动跟随系统与设备能力，当前：<档位>（原因：<中文原因>）`（评审方调整：原因为 `manual` 时前缀改为“已手动选择”，例 `已手动选择，当前：标准（原因：手动选择）`）。
  - `CurrentYunQiPage.tsx` 仅在“当下运气”页“更多”列表的“计算说明与版本 -> 追溯信息”内追加一行 `<InlineText>{formatMotionDiagnostics(level, reason, engine)}</InlineText>`（格式：`动效 精简 · frame-in-flight · Chromium 109`）；其他视图的“计算说明与版本”未改动。
  - `detectBrowserEngine` 优先读取 `navigator.userAgentData.brands`（跳过 GREASE 品牌，优先 `Chromium`），缺失时解析 `navigator.userAgent` 字符串，均无匹配时返回 `未知内核`；仅用于显示，不参与档位判定。
  - 在 `M1-e-polish.md` 第 3 项末尾追加“勘误（评审决定）”，明确硬关闭优先于手动的最终优先级。
- **涉及文件**：
  - `apps/yunqi-workbench/src/lib/motion-diagnostics.ts`
  - `apps/yunqi-workbench/src/providers/MotionProvider.tsx`
  - `apps/yunqi-workbench/src/components/layout/MotionSettings.tsx`
  - `apps/yunqi-workbench/src/features/yunqi/components/CurrentYunQiPage.tsx`
  - `docs/plans/2026-11-18-motion-flows/cards/M1-e-polish.md`

### 第 5 项：证据目录瘦身与约定

- **改动内容**：
  - 保留评审方已暂存删除的 `docs/plans/2026-11-18-motion-flows/evidence/media/M1-full-walkthrough.gif`，未恢复、未改写 git 历史、未删除既有 `*-diagnostics.json`。
  - 更新 `docs/plans/2026-11-18-motion-flows/reviews/M1-review.md`：将 GIF 指向改为外部存放位置“待定（PR #26 评论附件或内网制品库，由用户确定）”，并记录 SHA-256 `e631304cdddbe7c23b2726c51c482c6f9a9866fcd9fef7386b9896037601112e` 及大小 `4.2MB（320 宽，12fps）`。
  - 在 `docs/agents/verification.md` 的“证据和报告”一节补充约定：后续卡片证据默认只提交诊断摘要，大体积诊断文件与录屏放 `.artifacts/`（已在 `.gitignore` 忽略），既有 `*-diagnostics.json` 保留不动。
- **涉及文件**：
  - `docs/plans/2026-11-18-motion-flows/reviews/M1-review.md`
  - `docs/agents/verification.md`

## 已决事项（按评审决定落实）

1. **原因优先级**：`url` > `forced-colors` > `no-has`（硬关闭，压过手动） > `manual` > `system` > `no-view-transition` > `frame-idle` > `frame-in-flight` > `default`。
2. **诊断行位置**：仅位于 `CurrentYunQiPage.tsx` 的“计算说明与版本 -> 追溯信息”卡片中；其他视图不改。
3. **GIF 外部化**：保持版本库中删除态，在 `M1-review.md` 记录待定外部位置、SHA-256 与尺寸，不上传不联网。
4. **文案与显示**：全部档位名、9 个原因中文映射、说明行与诊断行格式集中在 `motion-diagnostics.ts`，组件不拼规则；内核解析仅作显示。
5. **存储键兼容**：空闲探测保留 `yunqi-motion-frame-rate`（`'full' | 'reduced'`），动中测使用独立键 `yunqi-motion-frame-in-flight`（`'frame-in-flight' | 'full'`），读写均包 `try/catch`。

## 检查结果

| 命令 | 退出码 | 结果与摘要 |
| --- | --- | --- |
| `pnpm build` | 0 | PASS；全仓构建完成，Workbench 196 modules，生产 CSS 检查通过 |
| `pnpm typecheck` | 0 | PASS；全仓源码与测试 `tsc --noEmit` 通过 |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS；74 文件 / 572 项全通过（既有单测未硬编码旧结果揭示延迟或旧说明行文案，见交给测试工程师的清单） |
| `pnpm test:workbench-governance` | 0 | PASS；313 项测试与源码治理扫描通过 |
| `pnpm test:time-governance` | 0 | PASS；12 项测试与时间治理扫描通过 |
| `pnpm test:project-guidance` | 0 | PASS；15 项测试与预算/链接/索引检查通过（证据落盘后复核） |
| `pnpm test:browser` | — | NOT_RUN；按分工由测试工程师补齐用例后由评审方在真实 Chromium 中运行 |

## 评审与测试（评审方，2026-11-19）

- 开发：antigravity CLI（Gemini 4 Neon XHigh，终端沙箱 + 本次会话 deny 规则禁止 commit/push/checkout/rm/网络）；测试：Codex CLI。
- 评审调整：`formatMotionStatus` 手动选择时前缀“已手动选择”，避免“自动跟随…（原因：手动选择）”自相矛盾。
- 浏览器全量 `pnpm test:browser`：438 passed（列举 441，20× CPU 用例仅在 flows-chromium 运行）。20× CPU 软断言通过：切 tab 后降为 reduced，原因 frame-in-flight。
- 1× 误降档抽查：清除动中测与年轮首绘标记后新会话打开当下运气 5 次，均记 `full`（本机 Apple Silicon，不代表院内设备）。
- 院内现场验证（第 6 项）仍 NOT_RUN；GIF 外部存放位置待用户确定。
