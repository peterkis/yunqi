# M1-b 实现证据（2026-11-18 专题；11-18—19 实施）

- 基线：`feat/motion-m1`，HEAD `85866521015417e35883ce04d4e79d3ca6265ae8`，开始时工作区干净。未提交、推送、切分支或修改 Git 配置。
- 结论：指定四项实现 DONE；真实浏览器验收 PARTIAL / NOT_RUN。范围仅为 M1-b，没有实施 M1-c/d、加载策略或业务规则变更。
- [21 个实现、测试与说明文件及 SHA-256](M1-b-sources.sha256)；另新增本文件和该清单，共 23 个文件。清单按路径排序，格式为 `sha256 + 两个空格 + 路径 + LF`，不包含自身及本证据。

## 验收对应

| 项目 | 实现与验证边界 | 状态 |
| --- | --- | --- |
| 分段指示块 | `useSegmentIndicator.ts` 共用于 SegmentedNav、SegmentedControl、CurrentClassicsPage、BirthClassicsView。先读齐 offsetLeft/Width/Top/Height，再写几何 CSS 变量；首帧、ResizeObserver（缺失时 window resize）直接到位。full 的 transform/width 为 base + standard，文字 fast；reduced/off 不滑动。装饰块不接收指针或读屏，不改变原语义与 Tab 顺序。几何单测覆盖三档、清空选择、零宽轨道、重测与卸载。 | DONE；实际 ≤1px 与窄窗对齐 NOT_RUN |
| 路由过渡 | `app/PanelNavigation.tsx` 在 router navigator 边界统一包装 Link/NavLink/Navigate/useNavigate 的 push/replace，复用 `updateWithViewTransition`；页面不启动过渡。生产 BrowserRouter 配置 useTransitions=false，配合集成单测确认新 DOM 在过渡回调内提交。按 tab 顺序定方向，下钻向前、固定返回向后；同年度内改年及默认重定向保留原焦点、不额外启动过渡。 | DONE |
| 参与区域与降级 | `motion-flows.css` 导航仅命名 main 与下钻标题，根快照关闭，应用栏和免责声明静止。新 main 从 ±distance 淡入 base，旧内容 fast 淡出，标题交叉淡化；关闭 UA 默认几何 morph，避免 tab/标题行高度差产生额外位移。reduced 或缺 API 使用 starting-style 的 fast 透明度过渡，默认样式始终可见；off 直接替换。 | DONE；真实视觉 NOT_RUN |
| 返回动线 | 位置及入口按 location.key 存组件内 Map，沿父 key 找返回源；不持久化。入口只保存 tag/href/label/text 等字符串定位信息，使离开页面的 DOM 可及时释放。切 tab 回顶并聚焦 main；下钻返回恢复 scrollTop，以 preventScroll 回到原入口，异步资料晚到时由 MutationObserver 重试并在离开时清理。直接访问下钻仍返回 main；同 key 的历史返回也复用记录。出生页既有回焦只增加 preventScroll。集成单测覆盖三档/缺 API、重挂载、重复进入、年度 replace、直接访问、历史返回和晚到内容。 | DONE；实际 ≤2px/入口焦点 NOT_RUN |
| 主题切换 | ThemeProvider 复用守卫；更新时加 data-theme-switching，以 important 禁用根及所有后代/伪元素的 transition，同次提交变色。full + API 用整屏根快照 base + linear 交叉淡化；其余直接切。两次 rAF 后移除标记，无 rAF 则以两次 16ms 任务近似两帧，避免零延时在首次绘制前过早解除抑制；重复切换及卸载会清理旧任务。标记独立于快照 scope，移除后不会中途取消根淡化。 | DONE；真实同帧变色/交叉淡化 NOT_RUN |
| 按下反馈 | full 的按钮、tab、分段使用 press-scale + fast，背景取既有 surface/border/accent tokens；reduced 只留颜色，off 无过渡。文字按钮/出处链接只变色。保留胶囊原有入场 opacity 过渡，另加 fast 按下属性；outline、outline-offset 和焦点阴影均未加入过渡。 | DONE；真实按下与截图 NOT_RUN |

## tokens、范围与保留

- 没有 `build_css` 脚本。沿用 M1-a 的**手工逐值同步 JSON 与运行时 CSS + 既有 `styles/tokens.test.ts` 全量 parity/变异检查**；本分段无需新增 token，两个文件与 HEAD 字节一致。所有时长、缓动、位移、缩放和视觉样式复用已有 tokens；新 CSS 变量只承载测量几何。
- `ConstitutionForm.tsx` 与 HEAD 字节一致，SHA-256 `9353f236a5ae8dd0d6d2eb5d8a06b561e637d1f0fc0e00963ff2c34117642bcf`，保留 keepFocus；`BirthAssessmentSession.tsx` 与 HEAD 字节一致，SHA-256 `9fb98c7f086ca67b07df8c0fbfe8ee51b2100a2ea6f88d56155de2f026b6a91b`，保留入口 callback ref 回焦。对应原有测试继续通过。
- `git diff --exit-code` 确认 packages、rules、docs/contracts、锁文件、两处 package.json、CI、tokens 两文件及上述两处既有修复均无差异。没有新增依赖或业务时钟；time-governance 通过，未修改治理器或新增帧率探测。所有业务时间仍直接消费 API localTime。
- 不依赖 transitionend、animationend 或 ViewTransition.finished；只沿用 M1-a 守卫对 ready/updateCallbackDone 的拒绝处理。滚动、回焦和清理不等待动画。

## 浏览器用例与证据限制

- 在既有 `motion.flows.spec.mjs` 新增四条共享流程：全范围指示块及 360px 窄窗；鼠标/键盘原文、年度、指定时点下钻返回；主题同次提交与根快照；按下/文字按钮/即时焦点环。原测试保留；与本次新增按下属性对应的胶囊断言改为分别验证 opacity 和 fast 属性。
- 浏览器观察辅助包装真实 API，记录回调内 DOM、方向及 root/main/title/header/footer 命名，不替换真实动画。时长扫描沿用 M1-a，并增加活动视图过渡伪元素时长。所有 axe 扫描继续通过 `scanAccessibility`，沿用字体就绪及动画自然收敛辅助，不 finish/cancel 动画。
- 量表性别选择后原控件立即收拢，未改变该节奏；其共享设计夹具保留选择用于终态几何测量。出生原文继续使用既有“全年 / 出生阶段”名称，避免把出生阶段误称当下；没有改变内容或医疗语义。
- 枚举：`75 × 3 档 flows + 8 缺 API + 164 visual = 397` 个执行实例、13 个 spec 文件。本次新增 `4 × 4 = 16` 个实例；这些不是独立样本或专家案例。workers=2、retries=0、motion=off + animations:disabled 截图辅助及历史基线均未改写。
- **NOT_RUN**：用户明确指定本沙箱不能运行 Chromium，由评审方运行 `pnpm test:browser`。未尝试绕过；本轮没有浏览器断言、axe 实际扫描、截图比较、GIF 或 6 倍 CPU 降速结果，不能据枚举声称通过。

## 检查记录

先完成基线 `pnpm build`（退出 0）再跑包内测试；最终重新构建后执行包内及全仓门禁。临时原始日志在 `/private/tmp/yunqi-m1b-*.log`；可移植摘要与源哈希保存在本目录。

| 命令 | 退出码 / 结果 |
| --- | --- |
| `pnpm build` | 0 / PASS，最终 184 modules；生产 CSS 无开发宿主规则 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，70 文件、524 用例；根 test 同样通过 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 最终 0 / PASS；初次 FAIL 见下 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 / PASS；语句 99.02%、分支 97.39%、函数 99.75%、行 99.69%；阈值及 exclude 未改 |
| `pnpm --filter @yunqi/workbench build` | 0 / PASS |
| `pnpm test` | 0 / PASS，含完整包测试、治理、时区、production smoke、OpenAPI 和指引检查 |
| `pnpm typecheck` | 0 / PASS，含各包源码与测试类型检查 |
| `pnpm test:workbench-governance` | 0 / PASS，313 项 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及索引检查，含证据落盘后的复核 |
| `pnpm test:time-governance` | 0 / PASS，12 项及源码扫描 |
| `pnpm exec playwright test --list` | 0 / PASS，397 tests in 13 files；仅枚举 |
| `node --check` 全部浏览器模块及配置 | 0 / PASS，22 个模块 |
| `git diff --check` | 0 / PASS |
| `pnpm test:browser`、GIF、6 倍 CPU、真实视觉/axe | NOT_RUN，用户指定沙箱限制，交评审方执行 |

保留的初始失败：**FAIL，退出 1**，首次 `pnpm --filter @yunqi/workbench test:typecheck` 在新 `PanelNavigation.test.tsx` 的 5 处报 `TS2769`：`exact` 不属于 Testing Library 的 `ByRoleOptions`。移除误用参数后类型检查通过；未删改行为断言。首轮定向运行本身为 4 文件、37 用例全部 PASS。

差异与待决：无新增设计或依赖决定；tokens 同步及出生范围名称沿用现有实现。真实浏览器验收仍待评审方完成。导航适配使用锁定 7.18.1 的 NavigationContext；将来升级 router 时须复验同步提交与导航行为。本轮未启动浏览器或新增常驻服务。

## 返工 1（2026-11-19）

### 基线与范围

- 在仓库根、`feat/motion-m1`、HEAD `85866521015417e35883ce04d4e79d3ca6265ae8` 上继续。开始时已有 23 个未提交/未跟踪文件；本轮只修改 4 个 flows spec、既有未跟踪的 `PanelNavigation.test.tsx`，追加本节并新增 [返工 1 源哈希](M1-b-rework-1-sources.sha256)。未提交、推送、切分支或修改 Git 配置。
- 新清单记录现有 M1-b 的 21 个源文件与本轮新增涉及的 4 个 spec，共 25 个 SHA-256；不含证据与清单自身。原 `M1-b-sources.sha256` 和本文件原有内容保留，以上旧检查结果仍是上一轮记录。
- 不修改产品运行时代码、规则、契约、依赖、覆盖率门槛或浏览器 workers/retries。没有新增产品缺陷的确认结论；本轮修复的是测试在导航提交前重载的竞态。

### 根因与原始失败

评审方原运行目录为 `.artifacts/browser/2026-11-18T16-07-24-267Z-4bd61a74/`。`results.json` 为 **396 passed、1 failed、0 skipped、0 flaky**；同一出生原文重载用例在 full 失败（11814ms），reduced/off 分别通过（2127/2169ms）。这些是重复执行实例，不是独立样本或专家案例。

本轮用 Python `zipfile`/JSON 读取 `results/birth-assessment.flows-dir-88113-ake-an-automatic-comparison-flows-chromium/trace.zip` 的 `1-trace.trace`、`test.trace`，并核对 `error-context.md`。trace SHA-256 为 `83879c100cff7d1b3ff165de241bc33f587512686bd999ca97061d60c3c23f72`。

| trace 事件 | 时间（trace 相对毫秒）/ 内容 |
| --- | --- |
| “全部原文”点击 `vufw@2082` | 开始 11190.508；`click action done` 11253.184；结束 11253.520 |
| 点击后的 HTML 快照 | 11254.728；`data-navigation-direction` 已从 backward 变为 forward，`data-view-transition="navigation"`，URL 仍为 `/yunqi/birth` |
| reload `vufw@2084` | 11255.169，距 click 完成仅 **1.649ms**；尚未出现 `/yunqi/birth/classics` 的提交 |
| reload 后快照 | 11509.157，URL 仍为 `/yunqi/birth`，页面是出生输入页 |
| 原断言 `vufw@2346` | 原 spec 第 344 行“本页尚无出生对照，请先填写出生资料。”；10000ms 超时，element(s) not found |

排查的三个假设及结论：

1. **full 的更新回调尚未执行即 reload：确认。** `PanelNavigation` 先设置导航方向，再通过 `updateWithViewTransition` 在原生快照回调内 push；上述 forward 标记已经写入，但 URL/main 尚未改变。reload 重建的是旧 URL 的页面，因而原文页的空态断言无法成立。
2. **点击未送达：不支持。** 日志的确出现过一次 panel 拦截指针，Playwright 随后重试；最终 click 成功，且 HTML 的导航方向已变为 forward，说明导航处理已进入。该次拦截不能解释点击成功后的旧 URL 重载。
3. **过渡失败导致永久漏提交：本次 trace 不支持。** 文档在目标提交前被 reload 中断；这不构成过渡回调永久丢失的证据。下面用独立的异常注入单测核对产品守卫。

保留的诊断结果：记录性 RED 探针以“reload 前 URL 应为 `/yunqi/birth/classics`”为 oracle，读取原 trace 后以 AssertionError、退出 1 复现上述错误时序；它是对历史失败的离线核对，不是本轮浏览器重跑。首次提取脚本遗漏空 stack 防护，曾因 IndexError 退出 1；修正筛选后才得到上述 RED，未把脚本错误当作产品失败。

### 测试修改与 flows 排查

`birth-assessment.flows.spec.mjs` 在点击“全部原文”后、统计请求数和 reload 前等待目标 `toHaveURL` 及“原文与释义”heading；reload 后再次核对相同 URL/heading。原有无资料空态、零自动查询/请求数、返回后空输入与无结果断言全部保留。没有固定 sleep、额外 retry、放宽 locator 或改变动效档位。

搜索入口为 `rg -n 'reload\(|goBack\(|goForward\(|page\.url\(|expectNoPersonalDataInUrl|location\.(pathname|href)' tests/browser`，并逐个查看导航与读取之间的步骤。11 个 flows 文件共 6 处 reload、3 处 goBack、1 处 goForward、5 处直接 `page.url()` 读取（静态调用点；循环会重复执行）。结果如下：

| 文件 / 检查点 | 结论与处理 |
| --- | --- |
| `birth-assessment.flows.spec.mjs`：出生原文点击 → reload | 唯一确认缺少目标提交等待的故障点；按上述方式修复。其余两个 URL 隐私检查以及 hash 读取均在返回页/本地清空后的状态断言之后，无未完成的导航。 |
| `workbench.flows.spec.mjs`：年度选择 → goBack → goForward → reload | 原有年份值/年度事实等待；同区域改年本身不启动过渡。本轮仍为每个历史边界及 reload 前后补齐精确年份 URL 和“年度详情”heading，原 API、事实、焦点与请求数断言保留。末尾的隐私/hash 读取在量表清空与焦点断言之后，无导航竞态。 |
| `ux-walkthrough.flows.spec.mjs`：上一年 → goBack；切先天对照 → reload | 原有 combobox 或命名 main/输入/焦点等待。本轮增加对应年份 URL/年度标题，以及出生 URL/“出生运气对照”heading，使历史/重载前置条件明确。 |
| `learning.flows.spec.mjs`：当下原文 → reload | 点击后原已有目标 URL、原文内容及后续页面检查；没有确认同类故障。本轮在 reload 前后显式补齐 URL/heading，保留原文范围、返回等断言。唯一隐私检查是直接进入出生页后的本地清空，无待提交导航。 |
| `design-foundations.flows.spec.mjs`：读取 fixture URL；锚点 → goBack | 读取前只有局部焦点操作；原生 `#scale` 锚点在 goBack 前已有 `toHaveURL(/#scale$/)`，返回后也等待 fixture URL，不经 PanelNavigation。无需修改。 |
| `panel-shell.flows.spec.mjs`：两处 URL 读取；收起 → reload | 初始 `loadCurrent` 已等待当前 URL/内容；中间只有收起/展开、滚动和焦点操作，reload 测的是页面内存重置，不存在路由提交。无需修改。 |
| `motion.flows.spec.mjs`：动效选择 → reload | 只切局部动效设置，已有选中态、motion 属性、时长与存储检查，没有路由导航。无需修改。 |
| `craft`、`constitution-actions`、`stage-facts`、`type-scale` flows | 没有上述 reload/历史操作/直接 URL 读取调用点。 |
| `fixtures.mjs` 与共享辅助 | 初始化/截图的 URL 写入同步进行；隐私 URL 检查的四个调用点已逐一检查；diagnostics 在 teardown 只比较 origin。没有发现未等待导航后立刻消费路径的其他调用点。 |

### 产品提交与异常路径

- 已核对当前 `PanelNavigation.tsx`、`navigation-transition.ts` 和生产 `main.tsx`：BrowserRouter 的 `useTransitions={false}` 与回调内 `flushSync(update)` 配合提交；应用没有额外 rAF/计时等待，也不等待 `ready`、`finished`、transitionend 或 animationend。reduced/off/缺 API 直接提交。
- `commit` 的一次性守卫同时覆盖 API 同步抛错、`updateCallbackDone` 在尚未提交时拒绝，以及迟到的原生回调；已提交后不重复 push。既有守卫单测还验证 update 排入 React 状态后抛错，DOM 仍已刷新。
- 参考 [W3C View Transitions：更新回调](https://www.w3.org/TR/css-view-transitions-1/#call-the-update-callback) 与 [启动过渡](https://www.w3.org/TR/css-view-transitions-1/#start-view-transition)：跳过动画仍调用更新回调；旧快照读回可以异步。这里“帧级别”指等待浏览器快照回调后立刻提交，没有等待 180ms 动画结束；**不能承诺所有主机负载下严格 ≤1 帧或 16ms**。
- `PanelNavigation.test.tsx` 新增 **4 条集成测试**，经过真实 MemoryRouter/PanelShell 导航入口：一条把原生更新回调延到下一 rAF，推进第一帧即得到目标路径、heading、内容与 main 焦点，期间 ready 保持 pending、读取 finished 会抛错；另外三条注入 API 抛错、原生跳过、更新回调拒绝，再调用迟到回调，通过一次历史返回到原页验证没有重复 push。注入不是实际浏览器故障样本。
- 未确认需要修复的产品运行时缺陷，因此未改产品源码。单测确认的是回调/提交边界和守卫行为；原 trace 在提交前已被 reload 中断，不能据此测出完整 click→commit 耗时。**真实 Chromium 的一帧级耗时复核仍为 NOT_RUN**，不把假帧单测当作真实浏览器时延测量。

### 本轮检查与交付限制

| 命令 | 退出码 / 结果 |
| --- | --- |
| `pnpm --filter @yunqi/workbench exec vitest run src/app/navigation-transition.test.tsx src/app/PanelNavigation.test.tsx` | 修改前 0 / PASS，2 文件、15 用例；新增测试后 0 / PASS，2 文件、19 用例 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，70 文件、528 用例；新增 4 条，原有断言未删除 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm exec playwright test --list` | 0 / PASS，397 tests in 13 files；仅枚举，未启动浏览器/global setup |
| `node --check` | 0 / PASS，全部 21 个 `tests/browser/*.mjs` 加 `playwright.config.mjs`，共 22 个模块，含 4 个修改的 spec |
| `pnpm test:workbench-governance` | 0 / PASS，313 项及源码扫描 |
| `pnpm test:time-governance` | 0 / PASS，12 项及源码扫描 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及指引、链接检查，证据追加后执行 |
| `git diff --check` / 本轮源哈希与基线校验 | 0 / PASS；25 个源哈希一致；原有 23 个 dirty 文件中其余 21 个字节未改；本文件仅追加 |
| `pnpm test:browser` / 本轮真实浏览器重跑 | NOT_RUN；[专题通用要求](../../2026-11-18-prototype-finals/cards/_common.md) 明定沙箱无法启动 Chromium，交评审方执行；本轮未尝试启动或绕过限制 |

本轮只改变测试与证据，未重建 dist、未运行常驻服务；原始 trace、评审方 396/1 结果及历史源哈希均保留。临时工作区基线、枚举和治理日志保存在 `/private/tmp/yunqi-m1b-rework1-82o44wzq/`，上表、trace 摘录和新源哈希是仓库内的可移植记录。浏览器最终验收仍须由评审方用本轮源码重新运行，不能把历史 reduced/off PASS 或本轮枚举算作修复后的浏览器 PASS。
