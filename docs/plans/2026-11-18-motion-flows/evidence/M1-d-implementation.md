# M1-d 实现证据（2026-11-19）

- 基线：`feat/motion-m1`，HEAD `e8b8f6efcb5e67a2db4a9ed88488155c7093256c`，开始时工作区干净。未提交、推送、切分支或修改 Git 配置。
- 范围：4.5、4.6、4.7、4.9 占位，第 1 节设计文档，第 5 节 A–E/J 及剩余检查。实现 DONE，真实浏览器验收 PARTIAL / NOT_RUN。
- [22 个实现、测试、配置与指引文件及 SHA-256](M1-d-sources.sha256)；另新增本证据与清单，共 24 个文件。清单按路径排序，不包含自身和本证据。

## 验收对应

| 项目 | 实现与证据 | 状态 |
| --- | --- | --- |
| 4.5 年轮首绘 | `YunQiWheel.tsx` 在 SVG 高亮下立即绘制 surface-sunken 底环；alpha mask 中的顺时针弧用 pathLength=1、stroke-dashoffset 1→0、emphasis=320ms 描出。基础 offset=0，WAAPI 缺失/抛错仍显示高亮；中心无动画。sessionStorage 标记 `yunqi-wheel-drawn`，读写失败静默，兼容 StrictMode；reduced/off 为原静态终态。 | DONE；真实描绘视觉 NOT_RUN |
| 4.5 刷新跨段 | 仅变化的环保留旧高亮 120ms 退出，新高亮 base=180ms 进入；旧副本 aria-hidden，定时清理。`CurrentPeriodGrid.tsx` 仅变化列标题强调 600ms，CSS 只过渡 color；精简/关闭直接终态，不新增 aria-live。实时降档/卸载取消 WAAPI 和定时器。 | DONE |
| 4.6 收起/展开 | `PanelShell.tsx` 状态推进：面板 fast 退出→onBeforeCollapse→胶囊 base 入场；胶囊 fast 退出→onAfterExpand→面板 slow 入场。full 右上原点、1↔0.98；reduced 仅 120ms opacity；off 在事件任务内同步通知及切换。计时读取运行时 token，不等待动画事件。保留视图、输入、滚动与互相回焦。导出 `PanelHostMotionHooks`；Web 未传入时为空实现，只定接口，没有 Tauri。 | DONE |
| 4.7 出生输入 | `BirthComparisonPage.tsx` 对实际输入/摘要高度作 base WAAPI 过渡（仅 full），默认 auto 高度，不靠动画收尾解除固定尺寸；full 输入区裁切过渡内容并留 token 焦点环余量，避免展开时和下方对照重叠；对照表 starting-style 淡入。提交焦点沿用原行为，修改仍聚焦年；清空先 fast 淡出，再定时清除、回年份框及 role=status“已清空本次资料”，off 同步。输入/重提取消旧清空任务；隐藏 RetainedSession 完成已请求清空，不抢其他 tab 焦点；返回不重播高度动画。 | DONE |
| 4.9 占位 | `AsyncState` 新增可选 renderLoading：首提交即静默占位，200ms 后才加加载播报，沿用至少 400ms 保留策略。`CurrentLoadingState.tsx` 从第一帧预留 220×220 年轮，事实卡按终态 tokens 组合灰块，无 shimmer。 | DONE；真实首屏 CLS=0 / 终态几何 NOT_RUN |
| 第 1 节/宿主文档 | `1-layout.md` 新增动效原则、三档、完整 motion tokens 表、降级硬约束和 E5 同步宿主钩子顺序；`docs/design/README.md` 记录本地修订授权及量表 240ms 取代旧 160ms；Workbench 指引同步。根 AGENTS.md 未改。 | DONE |
| A–E/J | 新 `current-motion.flows.spec.mjs`：A 从导航开始用 PerformanceObserver 累计全部 layout-shift（含 recent-input），必须为 0，收敛后年轮预留和终态边界完全相等；D/E/J 全 Tab/Enter 与鼠标分别输入、自动跳格、提交、修改重提、一键进入已填先天栏的量表、收起/展开保留内容与回焦、清空播报。B/C 复用并补强既有三种下钻返回，增加 URL/标题提交等待、off 返回 ≤290ms 和收敛后 ≤2px/原入口焦点断言。 | DONE 用例；实际流程 PARTIAL / NOT_RUN |
| 第 7 节 | 沿用三档、缺 API、时长扫描、动画自然收敛、axe、字号及外部请求拒绝；新增年轮 320ms 首绘/刷新观测和 off 收起 ≤ANSWER_HOLD_MS+50ms。未改截图辅助或基线、workers=2 / retries=0。 | 静态门禁 DONE；浏览器检查 PARTIAL / NOT_RUN |

## 测试范围与限制

- 新增 15 项单测覆盖年轮会话一次、StrictMode、首绘/跨段/降档、storage 读写异常、WAAPI 缺失/抛错、仅变化标题的 600ms、三档宿主先后顺序、120ms 定时边界、off 同步、卸载清理、草稿/滚动/焦点、出生高度/修改/清空、编辑取消清空及隐藏会话不抢焦点。原有测试保留；原“清空无 status”期望按新增播报要求更新，补首帧静默占位断言。
- 年轮刷新浏览器用例沿用 stage-facts 的真实 Service `learning/calculate` 响应回放为 current；以 2026-11-18、11-23、2027-01-21 的快照及现有 stale-query 聚焦刷新覆盖仅气变化与气/运同时变化。未伪造 DTO、未在产品侧推进业务时钟，轮询机制未改。
- `observeOffAction` 仅在浏览器测试中从真实 click 开始用 performance.now 计交互耗时；不参与产品时间。几何测量均先复用 waitForAnimations，动态动画采样不充作几何验收。产品没有新增 Date/Intl/Temporal/performance/rAF 业务时间逻辑。
- 枚举为 `85 × 3 档 flows + 18 缺 API + 164 visual = 437` 个执行实例、15 个 spec 文件；较基线增加 `4 × 4 = 16` 个实例。这些不是独立样本或专家案例。
- **NOT_RUN**：用户明确指定本沙箱无法运行 Chromium，未执行 `pnpm test:browser`，未启动/绕过浏览器。CLS、真实动画时长/几何/焦点、axe 零违规、motion=off 截图比较及真实无外部请求仍须评审方用 `pnpm test:browser` 执行。未把枚举、单测或静态扫描称为这些浏览器验收 PASS。
- **NOT_RUN**：GIF 及 6× CPU 人工核对留给评审方真实浏览器；未添加可选录制脚本，未改变默认项目的录制/截图方式。

## tokens 与保护范围

- 仓库没有 `build_css`。沿用既有的 **tokens.json/CSS 手工逐值同步 + `styles/tokens.test.ts` 两主题/降级/别名/重复/遗漏 parity 与变异检查**。本段复用已有 fast/base/slow/emphasis、easing、press-scale，保留 motion-result-*，无需新增 token；两个文件与 HEAD 字节一致。
- 两处既有修复文件字节不变：ConstitutionForm 的 keepFocus（焦点离开不抢回）与 BirthAssessmentSession 入口 callback ref；相关原测试仍通过。RetainedSession、量表作答节奏、业务查询轮询及规则/教学版本未改。
- `git diff --exit-code HEAD --` 核对 packages、rules、docs/contracts、锁文件、两处 package.json、CI、AGENTS.md、tokens 两处及两处焦点修复均无差异。没有新增依赖、远程资源或业务时钟，治理器未修改。

| 受保护文件 | SHA-256 |
| --- | --- |
| docs/design/design-system/tokens.json | `9f4d3ab3d3d52ebf0e2166ad0b408ccd7af9b330060c8e5ac7d47602d85661b7` |
| apps/yunqi-workbench/src/styles/tokens.css | `208ea4011349c36694bb34aab75c833af023126e6fe25f8d3973f6e2420a500b` |
| ConstitutionForm.tsx | `0a5911f658bdc75d81a6b4813fcdc947bf8adcd13f07c03d805dd451c8fc5b3d` |
| BirthAssessmentSession.tsx | `197b682980821a862f588526123e3c5c3e637546839bd06cea077ffcbc292723` |

## 检查记录

Node v24.18.0 / pnpm 10.32.1。先完成基线 `pnpm build`（0）再执行包内测试；最终源码重新全量构建。
临时原始日志为 `/private/tmp/yunqi-m1d-*.log`，可移植结论及源哈希保留在本目录；临时路径不作为永久证据链接。

| 命令 | 退出码 / 结果 |
| --- | --- |
| `pnpm build` | 0 / PASS（初始与最终）；最终 194 modules，生产 CSS 无开发宿主规则 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，74 文件 / 570 项 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 / PASS，74 文件 / 570 项；语句 99.09%、分支 97.63%、函数 99.78%、行 99.75%，阈值/exclude 未改 |
| `pnpm --filter @yunqi/workbench build` | 0 / PASS，194 modules，生产 CSS 检查通过 |
| `pnpm test` | 0 / PASS，完整包测试、治理、固定时区、production smoke、OpenAPI、指引均通过；OpenAPI lint 原有 3 条 warning 保留（localhost、health 缺 4XX、YearParams 未使用），未改契约 |
| `pnpm typecheck` | 0 / PASS，含全包源码与测试类型检查 |
| `pnpm test:workbench-governance` | 0 / PASS，313 项及扫描 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及预算/链接/索引检查（含证据落盘后复核） |
| `pnpm test:time-governance` | 0 / PASS，12 项及扫描；未被拦截、未新增例外或改治理器 |
| `pnpm exec playwright test --list` | 0 / PASS，437 tests in 15 files；仅枚举 |
| `node --check` 全部浏览器模块、Node fixture 及 Playwright 配置 | 0 / PASS，25 个模块/配置 |
| `git diff --check`、源清单及保护范围复核 | 0 / PASS |
| `pnpm test:browser`、GIF、6× CPU、真实动画/CLS/axe/截图/请求 | NOT_RUN，用户指定沙箱限制，交评审方执行 |

保留的初始失败（没有删除或跳过用例）：

- **FAIL / 退出 1**：首次定向 5 文件 / 47 项，1 failed / 46 passed。跨段夹具把默认已是二运的数据再次设为二运，实际仅气变化，错误期望两个环都变化。
- **FAIL / 退出 1**：第二次定向 1 文件 / 14 项，3 failed / 11 passed。改为三运后，夹具 movements 仍只有二运，缺少 current 项，触发 undefined.index。修正为完整五步运夹具后 14/14 通过；随后补写入失败用例，最终全包 570/570 通过。失败属于测试夹具，不据此声称产品真实 API 缺项。
- 初轮覆盖率为 569 项、语句 99.09 / 分支 97.71 / 函数 99.78 / 行 99.75，最终上表为新增第 15 项回归后的结果；没有把不同轮次或浏览器检查合并为全绿。

最终构建摘要：`index-CLxbBKr1.js` SHA-256 `38ec518ac880f1e1ce6ddd003df29c8ca7679d2eb796ec8423a35fdf55c22c3e`；
`index-CtYYCPeO.css` SHA-256 `352783f8eb944db57cddfa843ee7115984ab8dfcec90f94c058ad2ecbf2e0e00`。
没有新增常驻进程或端口；未执行浏览器 runner。

差异与待决：无新增业务或规则取舍；无 build_css，按既有 parity 同步方式复用 tokens。
灰块按终态 token 尺寸预留，真实 CLS=0 和 motion=off 视觉一致性尚未在本沙箱验证；其余浏览器及人工验收同样留待评审方执行。工程检查不替代专家或临床验收。

## 返工 1（2026-11-19）

### 基线、失败和范围

- 在仓库根 `feat/motion-m1`、HEAD `e8b8f6efcb5e67a2db4a9ed88488155c7093256c` 上继续，开始已有 24 个未提交/未跟踪文件。已保存这些文件的初始字节与 SHA-256 到临时目录 `/private/tmp/yunqi-m1d-rework1-baseline/`，未覆盖其他工作，未提交、推送或切换分支。
- 评审原始全量浏览器记录为 **425 passed / 12 failed（12.1 分钟）**，来源日志 `/private/tmp/claude-501/-Users-petervans-Projects-YunQi/7af69909-e649-46b6-85a5-35f7ac86dcd6/scratchpad/motion/m1d-browser.log`，产物 `.artifacts/browser/2026-11-18T18-18-07-766Z-0970ae0d/`。5 项失败涉及年轮 mask，3 项涉及旧清空 status 断言，4 项涉及 visibilitychange 刷新等待。该失败记录保留，不记为本轮 PASS。
- 本轮实际修改产品 `YunQiWheel.tsx`、单测 `M1dMotion.test.tsx`、浏览器 `birth-assessment.flows.spec.mjs` 与 `current-motion.flows.spec.mjs`，并追加本节、新增 [返工 1 源哈希](M1-d-rework-1-sources.sha256)。旧证据及旧哈希清单保持历史原样；本节修正前文 alpha mask 和 focus 刷新实现说明。

### A：年轮自身描边，不使用渐变、裁剪或遮罩

- 删除 `defs/mask` 和所有 `mask` 属性。两环当前高亮段自身为顺时针弧线，`pathLength=1`、`stroke-dasharray=1`、默认 `stroke-dashoffset=0`；首次 full 用原 emphasis token 将 offset 从 1 动画到 0。几何仅使用固定 SVG 圆心、半径、宽度和段序号；外环半径 96/宽 24、内环半径 70/宽 16，保留段间空隙。
- 外六段、内五段的 `surface-sunken` 底色无条件立即绘制。高亮描边的基础样式就是完整终态；reduced/off、WAAPI 缺失/抛错、动画取消及卸载均无需动画完成事件才能显示。跨段旧高亮副本沿用同一描边几何，只对变化环做 opacity 交叉淡化；中心和文字不参与描绘。
- **既有 `stage-facts-helpers.mjs:103` 零渐变/clipPath/mask 断言及整个文件字节不变**。SHA-256：`c757572a7d1a733c201beff610ef541355f66b3731cde7c75f79cfca9f80c39e`。
- 单测在修复前先增加零禁用元素断言并实际跑 RED：`pnpm --filter @yunqi/workbench test src/test/M1dMotion.test.tsx -t 'draws clockwise'`，退出 **1**，**1 failed / 14 因筛选 skipped**，精确复现“期望 0，实际 2”。修复后完整 M1-d 文件 **16/16 PASS**，覆盖三档无禁用元素、动画目标为当前高亮自身、默认 dash 终态、11 段立即底色、实际高亮 stroke 令牌与 WAAPI 缺失回退。

### B：清空固定播报和生命周期

- 核对 `BirthComparisonPage.tsx`：清空完成时 `setCleared(true)`，只渲染固定的 visually-hidden `<p role="status">已清空本次资料</p>`，未拼接日期、时刻、候选结果或答卷。编辑及提交的 `cancelClear()` 会清除该播报；组件卸载后消失；RetainedSession 隐藏时随视图隐藏，没有定时移除。
- 保留该生命周期：卡片 4.7 只要求清空播报，没有规定 3 秒移除；4.9 的“答卷已销毁”则明确要求 3 秒后退出，现有 `AnswerDestroyedNotice` 在 3000ms 开始淡出，full/reduced 再经 120ms 移除、off 同步移除。本轮未将两种不同约定混用，也未修改任一产品播报逻辑。
- 旧浏览器断言仅改为 **唯一 status、完整文本等于“已清空本次资料”、不含本用例使用的出生日期/时刻**；其他断言原样保留。单测三档均验证唯一固定文案、不含数字或“出生”、10 秒后仍存在，以及再次编辑立即移除。

### C：用现有 60 秒轮询刷新

- 实际配置：`useLearningCurrentQuery` 覆盖 `staleTime: 0`，`enabled: visible`，`refetchInterval: visible ? 60_000 : false`；`QueryProvider` 全局 `refetchOnWindowFocus: false`，该查询没有覆盖。所以旧 visibilitychange 注入不会触发请求，可见页面已有真正的 60 秒自动刷新路径，无需改产品。
- 浏览器用例在导航之前 `page.clock.install()`，每次 `page.clock.fastForward(60_000)` 触发原查询轮询。未再伪造 visibilityState，未新增产品测试钩子、刷新 API 或修改查询参数。[Playwright Clock](https://playwright.dev/docs/clock) 要求在应用开始使用计时器前安装；[TanStack focus 文档](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching) 说明 `refetchOnWindowFocus: false` 关闭该刷新。
- Clock 仿真只作用于浏览器测试上下文的计时器、performance 和缓存用时间，不改变 Node Service 的业务时钟。三个 `localTime` 仍来自真实 Service/adapter 对 `2026-11-18T08:44:00+08:00`、`2026-11-23T12:00:00+08:00`、`2027-01-21T12:00:00+08:00` 的 `learning/calculate` 响应，未经 DTO 编辑，继续回放到 current；新增每次 HTTP 200、规范 localTime 及共三次 current 请求断言。WAAPI 自然收敛、变化环/列、无新增 aria-live、降级及时长检查全部保留。
- 新单测使用真实 `CurrentYunQiView`、hook 和 QueryClient 配置，证明 focus 切换不请求、60 秒前不请求、到 60 秒和第二个间隔各请求一次。既有 RetainedSession 定向测试也 PASS（1 passed / 3 因筛选 skipped），证明隐藏停刷及可见恢复；这些客户端 stub 测试不替代真实浏览器网络验收。

### 本轮检查

Node `v24.18.0` / pnpm `10.32.1`。构建先后串行完成，没有在浏览器运行期间改写依赖产物。原始日志为 `/private/tmp/yunqi-m1d-rework1-*.log`；下表及源哈希提供仓库内可移植结论。

| 命令 | 退出码 / 结果 |
| --- | --- |
| `pnpm build` | 0 / PASS，初始和最终构建；最终 194 modules，生产 CSS 检查通过 |
| `pnpm --filter @yunqi/workbench test src/test/M1dMotion.test.tsx` | 0 / PASS，16 项 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，74 文件 / 571 项 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 / PASS，74 文件 / 571 项；语句 99.10%、分支 97.63%、函数 99.78%、行 99.75%；阈值和 exclude 不变 |
| `pnpm test:workbench-governance` | 0 / PASS，313 项及扫描 |
| `pnpm test:time-governance` | 0 / PASS，12 项及扫描；治理器及例外不变 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及预算/链接/索引检查 |
| `pnpm exec playwright test --list` | 0 / PASS，437 tests / 15 files；仅枚举，数量不变 |
| 相关模块 `node --check` | 0 / PASS：current-motion、birth-assessment、stage-facts、learning、workbench 五个 spec，以及 stage-facts-helpers、motion-helpers |
| `git diff --check`、23 项新源哈希、保护范围及初始 dirty 字节复核 | 0 / PASS；20 个其他初始文件字节不变，旧证据只追加、旧源清单不变 |

浏览器尝试（保留环境失败）：完成初始构建后执行 `pnpm exec playwright test tests/browser/stage-facts.flows.spec.mjs tests/browser/birth-assessment.flows.spec.mjs tests/browser/current-motion.flows.spec.mjs --project=flows-chromium --grep 'elapsed-stage|birth inputs enforce required time|open current view'`，退出 **1**，报告 **3 failed**，三项均在 Chromium 启动时被沙箱阻止，未进入页面。错误为 `bootstrap_check_in ... Permission denied (1100)` / `SIGTRAP`；未换浏览器、改沙箱、重试或降低断言。

该次 runner 目录为 `.artifacts/browser/2026-11-18T18-31-48-219Z-f4292fc4/`，环境记录使用 bundled Chromium、400×860、America/New_York（配置），真实 Service 通过固定当前时刻 readiness；`cleanupPassed: true`、`cleanupErrors: []`。实际浏览器版本/页面行为未取得，不能把配置当作已执行结果。

**NOT_RUN：修复后浏览器运行与全量 `pnpm test:browser`**。本轮静态/单测通过不代表评审方的 12 项浏览器失败已实机验收通过；仍需在可启动 Chromium 的环境执行全量。实际首绘/跨段描边视觉、CLS、几何、焦点、axe、三档与能力缺失流程及 GIF/6× CPU 保持待验收，不重录或更新截图基线。437 是矩阵执行实例，不是独立样本或专家案例。

最终构建：`index-dBJmLeml.js` SHA-256 `d303587c041fd7755c3737595b727aee73b6652d17d4182b4ea311f03392d79a`；CSS 仍为 `index-CtYYCPeO.css`，SHA-256 `352783f8eb944db57cddfa843ee7115984ab8dfcec90f94c058ad2ecbf2e0e00`。
packages、rules、contracts、锁文件、依赖、CI、AGENTS、tokens、查询/轮询实现及两处既有焦点修复与 HEAD 一致。其他初始未提交改动保持原始字节；本轮没有常驻服务、提交或推送。
