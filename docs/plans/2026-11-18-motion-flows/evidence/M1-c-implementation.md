# M1-c 实现证据（2026-11-19）

- 基线：`feat/motion-m1`，HEAD `f4dccb0c25fc7cbeb35d328e88de50a97dd0eea3`；开始时工作区干净，M1-a/b 提交保留。未提交、推送、切分支或修改 Git 配置。
- 结论：指定实现 DONE；真实浏览器验收 PARTIAL / NOT_RUN。未实施 M1-d。
- [完整修改文件清单与 dirty 源 SHA-256](M1-c-sources.sha256)：31 个实现、测试、配置和 token 文件；另新增本证据及清单，共 33 个文件。清单按路径排序，不包含证据和清单自身。

## 验收对应

| 项目 | 实现与断言 | 状态与限制 |
| --- | --- | --- |
| 作答节奏 | `ConstitutionForm.tsx` 导出 `ANSWER_HOLD_MS=240`；点击/数字键立即更新答案，三档均保留停留，改选取消旧任务并重新计时。单测独立使用 239+1ms，覆盖键盘及点击改选、取消任务与卸载。`keepFocus` 保留，覆盖中间题和最后一题停留期间离开表单不抢焦点。 | DONE |
| 翻题与键盘 | 只重建 h3 文本和选项组，题头背景节点不动；同步从 ±distance 进入 base，reduced 仅 fast 透明度，off 直接替换。上一题按钮与 ←/Backspace 反向；捕获阶段接管量表选项的 ←，ScaleOption 尊重 defaultPrevented。编辑控件/contenteditable、组合键和 repeat 不处理；只在题区响应。h3 程序焦点继续无框；最后一题通过操作区 callback ref 自动聚焦“查看结果”。 | DONE；真实视觉 NOT_RUN |
| 九维进度 | `ConstitutionDimension.tsx`：full 宽度 base；✓ fast 淡入；新答满维度名称 accent 保持 600ms 后恢复普通色，当前维度仍保留原 accent。reduced 去宽度动画，off 无动画。单测覆盖 599+1ms、重复渲染及恢复已满进度不重复强调。 | DONE；真实颜色/几何 NOT_RUN |
| 结果揭示 | `ConstitutionResults.tsx` 默认不揭示，仅表单提交后的结果挂载传入 reveal；隐藏/400ms 定时器消费标记，跨 tab 返回不重播，返回修改再提交会重播。判定卡 base/上移；条形按原 API/标准顺序从 80ms 开始、左原点 scaleX、单条 slow，分数直接终值并同步淡入；互参卡 240ms 开始 fast。刻度不动，width 不动画；reduced 整体 fast 淡入，off 无动画；标题立即聚焦。 | DONE；间隔差异见下，真实揭示 NOT_RUN |
| 销毁反馈 | 页内确认，取消/Esc 恢复结束按钮焦点。确认同步清空 sex/answers/评分并使旧评分失效；不等动画卸载。`destroy-answer-visual.ts` 只保留惯性视觉副本，aria-hidden/inert、无 id/name/form 关联、不接收指针；守卫实际目标 animate 的存在性及档位，异常静默，fast 定时清除；实时降到 off 时直接移除。副本按面板坐标定位并裁在内容区，新性别选择的焦点环位于副本上方；单测覆盖工作站右侧偏移与上下裁切。状态“答卷已销毁”显示 3s 后 fast 淡出（off 到期直接移除）。独立页回到性别；嵌入页保留 BirthAssessmentSession 的 `focusStart` callback ref，回到“同时测评体质”。 | DONE；视觉副本最长 120ms、无功能依赖；真实淡出 NOT_RUN |
| F/G/H/I | `RetainedSession` 首次访问才挂载出生/量表页，离开 tab 后 hidden/inert，释放 PanelView/PanelSummary 发布能力并阻止隐藏页面抢焦点。display:contents 保持原布局；导航恢复不选隐藏入口；出生只匹配两个已批准路径。会话答案、题号、结果、出生草稿/响应保留；清空/结束及原有出生编辑、重新对照、性别更换失效规则保持。没有写 URL 或浏览器存储。返回修改仍定位最后一题并保留答案。 | DONE；单测覆盖保留/销毁、隐藏焦点、直接重开、未知路径；浏览器动线 NOT_RUN |

## tokens 与时序差异

- 仓库没有 `build_css`。沿用 M1-a/b 的**手工逐值同步 `tokens.json` 与 `styles/tokens.css`，由既有 `styles/tokens.test.ts` 全量 parity/变异测试校验**；motion 组新增 `motion-result-start=80ms`、`motion-result-stagger=10ms`，两主题一致，reduced/off 对这两个延迟覆盖为 0ms。未修改同步校验器或其他 token 组。
- 卡片“9 条、80ms 起、24ms 间隔、每条 240ms”合计为 `80+8×24+240=512ms`，与本次明确的 ≤400ms 冲突。本实现保留起播与单条时长，将**结果专用间隔压缩为 10ms**，总计 `80+8×10+240=400ms`；五个作答圆点仍使用通用 `--motion-stagger=24ms`，总计最多 216ms。互参卡结束于 360ms。
- 结果条形、圆点和翻题的基础样式均可见；起始状态只来自 starting-style 或受档位限定的动画。没有 transitionend、animationend 或 ViewTransition.finished 等待；所有业务状态、焦点、卸载独立于动效。
- 业务时间仍直接消费 API localTime。本轮未新增业务时钟、帧率探针或性能采样；浏览器 PerformanceObserver/performance.now/rAF 只用于测试时序和布局。time-governance 通过，未被拦截、未改治理规则。
- `git diff --exit-code -- packages rules docs/contracts .github package.json apps/yunqi-workbench/package.json pnpm-lock.yaml` 退出 0；没有 Service/Domain/Contracts/Client、规则/契约版本、依赖或 CI 变更。既有历史证据、visual spec 和截图辅助未改写。

## 浏览器验收范围（尚未执行）

- 新增 `constitution-motion.flows.spec.mjs` 六条共享用例：F/G/H/I × 键盘/鼠标 × 独立/嵌入（4 条），off 操作完成 ≤290ms（1 条），同任务选中态、圆点时序和编辑控件快捷键保护（1 条）。三档项目及缺 View Transition 项目均可枚举；存储/URL 无个人资料断言保留，既有销毁用例补确认步骤、完成用例改断言自动聚焦提交。
- F/G/H 使用全键盘或鼠标操作；I 的作答态用 tab 导航，结果态因下钻标题替代 tab，先用原生历史返回当下再通过对应 tab 恢复结果。等待 URL/标题提交后才继续操作，不在导航中途重载。
- 实际动画记录断言 full 条形延迟 80–160ms、每条 240ms、总计 ≤400ms，刻度无动画且无 transform；reduced 整体 ≤120ms，off 为 0。复用并扩展 `motion-helpers.mjs`，同时扫描 CSS/伪元素与活动 WAAPI 的 duration、delay+duration 及 reduced 属性白名单。
- `PerformanceObserver` 保留提交替换布局的全部 layout-shift 记录，单独以结果首次绘制后的边界断言揭示期间累计为 0，**不排除 hadRecentInput 条目**；记录在首个条形 80ms 起播前开始，提交引起的页面/操作区替换记录另留在同一附件中。
- axe 继续经既有字体就绪/动画自然收敛辅助运行；零违规、外部请求拒绝和字号检查均保留。截图仍用 motion=off + animations:disabled；没有改写基线文件。题头按要求增加“← 上一题”、完成焦点及维度颜色属于本卡界面变化，实际截图比较尚未执行，不能宣称像素一致。
- 最终枚举：`81×3 档 flows + 14 缺 API + 164 visual = 421` 个执行实例、14 个 spec 文件；新增 `6×4=24` 个实例。它们不是独立样本或专家案例。workers=2、retries=0 不变。
- **NOT_RUN**：`pnpm test:browser`、真实 F/G/H/I、axe、layout-shift/时长实际读数、截图/GIF、6 倍 CPU 降速。用户明确指定沙箱不能运行 Chromium，交评审方运行；本轮没有启动浏览器或常驻服务。

## 检查记录

Node v24.18.0、pnpm 10.32.1。先完成初始 `pnpm build`（退出 0），再运行包内测试；最终重新按依赖串行构建及检查。原始日志为本机 `/private/tmp/yunqi-m1c-*.log`；下表及源清单为可移植摘要，临时日志不是仓库证据链接。

| 命令 | 最终退出码 / 结果 |
| --- | --- |
| `pnpm build` | 0 / PASS，190 modules；生产 CSS 无开发宿主规则 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，72 文件、545 用例 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 / PASS，语句 99.13%、分支 97.65%、函数 99.76%、行 99.72%；阈值/exclude 未改 |
| `pnpm --filter @yunqi/workbench build` | 0 / PASS |
| `pnpm test` | 0 / PASS，Workbench 545 用例；含各包、治理、时区、production smoke、OpenAPI 与指引检查 |
| `pnpm typecheck` | 0 / PASS，各包源码和测试类型检查 |
| `pnpm test:workbench-governance` | 0 / PASS，313 项及源码扫描 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及索引检查；证据落盘后另复核 |
| `pnpm test:time-governance` | 0 / PASS，12 项及源码扫描 |
| `pnpm exec playwright test --list` | 0 / PASS，421 tests in 14 files；仅枚举 |
| `node --check` 浏览器模块及配置 | 0 / PASS |
| `git diff --check`、范围差异及 SHA-256 复核 | 0 / PASS |
| `pnpm test:browser`、真实视觉/axe/GIF/CPU 验收 | NOT_RUN，用户指定沙箱限制 |

保留的中间失败（没有删测试、放宽断言或延长测试超时）：

- **FAIL / 退出 1**：首次 `pnpm --filter @yunqi/workbench test` 为 27 failed / 502 passed、2 failed / 68 passed files，`Test timed out in 5000ms`。Testing Library 的异步包装未识别 Vitest 假定时器；测试中补其兼容入口和显式推进作答停留后恢复。
- **FAIL / 退出 1**：首次三文件定向为 2 failed / 33 passed：取消销毁后的焦点落 body，改为操作区 callback ref；新保留会话测试的进度正则漏“题”字，修正精确预期。
- **FAIL / 退出 1**：下一次同组为 1 failed / 34 passed：跨 tab 返回故意聚焦 main，测试未重新进入局部题区就发送数字键，已补题干焦点，未扩大快捷键作用域。
- **FAIL / 退出 1**：最后的两文件定向为 1 failed / 7 passed：404 标题同时存在于导航和正文，测试改在 main 范围查询；对应未知子路径不挂载会话的断言保留。

待决：结果专用 10ms 间隔是明确记录的时序取舍；真实浏览器验收仍未执行，工程检查不替代专家或临床验收。

## 返工 1（2026-11-19）

本节追加于原始证据之后；前述 NOT_RUN、初始失败和 M1-c 时序取舍均保留。基线仍为 `feat/motion-m1` / `f4dccb0c25fc7cbeb35d328e88de50a97dd0eea3`，本轮开始已有 **33 个未提交/未跟踪文件**。继续现有改动，未提交、推送、切分支或修改 Git 配置。

结论：四项修正与隐藏会话副作用治理 **DONE（源码与非浏览器检查）**；修正后的真实浏览器复测 **NOT_RUN**。不能把本轮工程通过称为浏览器、读屏、专家或临床验收通过。

- [返工诊断与检查记录](M1-c-rework-1-diagnostics.json)：保留评审 8 项失败的项目/位置、原始动画读数、实际重复节点的 DOM 路径/属性、本轮初始 RED、浏览器启动失败、命令结果、开始时 dirty 哈希、runner 与最终构建哈希，以及 `changedSourceFilesThisRound` 精确清单。
- [本轮最终 dirty 源 SHA-256](M1-c-rework-1-sources.sha256)：36 个源、测试、配置和 token 文件，包含既有改动；本轮实际改动其中 17 个。原 `M1-c-sources.sha256` 保留，不冒称仍对应修正后的源。
- 评审原轮：`.artifacts/browser/2026-11-18T17-00-22-558Z-39f732e9`，413 passed / 8 failed，约 10.5 分钟。原日志仍在用户给定的 `/private/tmp/claude-501/-Users-petervans-Projects-YunQi/7af69909-e649-46b6-85a5-35f7ac86dcd6/scratchpad/motion/m1c-browser.log`。可移植证据为上面的提取 JSON，原临时日志/trace 未删除或改写。

### 逐项根因与修正

1. **结果揭示延迟（四项）**：原 `first-submit-reveal` 附件的九条延迟为 `[80,90,100,110,120,130,140,150.00000000000003,160]`，每条 duration 均 240ms，最后 end 为 400ms；还存在 329.99999999999994 等 end 读数，符合 CSS 秒值转 WAAPI 毫秒的浮点表示误差。源码已直接按索引算 `start + index × stagger`（80ms + index × 10ms），没有以上一条延迟累加的状态，也没有业务时间计算。本轮将测试延迟数组按毫秒 `Math.round` 后比较，保留原始附件值、严格的 240ms/400ms 和总预算断言；不另行复制/写死一套产品 token。产品 CSS 与 tokens 本轮未改。

2. **重复 `.constitution-position`（两项）**：trace 证实第二个节点位于 `.panel-shell > .constitution-destroy-ghost`，是本用例“先销毁已答一题的旧答卷，再立即重新开始”期间的销毁视觉副本，**并非翻题组件保留旧题**。旧副本显示“已答 1 / 26、当前第 2 题”，新 live form 显示“已答 0 / 26、当前第 1 题”。副本根原本已经 `aria-hidden="true"` + `inert`；子树仍保留 `aria-live="polite"`、role、aria-label，并被统一添加 `tabindex="-1"`，全局 CSS 定位因而命中两份。
   - `destroy-answer-visual.ts` 把副本保持为纯视觉内容：根显式保留 `aria-hidden` 与 `inert`；子树清除全部 `aria-*`、role、tabindex、id、name、form、for、headers、autofocus、contenteditable，取消向子节点添加 tabindex。120ms 定时器独立移除副本，off 不创建；隐藏所属 RetainedSession 或切到 off 也立即清除副本、定时器和观察器。没有等待 animationend/transitionend。
   - 实际翻题仍在 `ANSWER_HOLD_MS=240` 的定时器提交后直接卸载旧 h3/选项组，仅重建当前题；没有增加离场 DOM。三档单测覆盖 239+1ms 前后只有一个可访问题干/进度/选项组，旧题节点已卸载；另覆盖三档销毁后立即重开，副本未过期时也只有一个可访问题干/进度、120ms 后副本卸载，off 完全没有副本。
   - `answerConstitution` 和相关 spec 的进度定位改为从 `getByRole('form', { name: '中医体质量表' })` 查询当前可访问表单，排除 aria-hidden 副本和隐藏会话。这里的单测证据是 Testing Library 的角色/可见性语义；原生浏览器 AX 与真实读屏复核仍待执行。

3. **实时选择精简后仍为 180ms（一项）**：`manual-reduced` 附件明确记录一个仍在运行的 `transform` timeline：duration/end 均 180ms，target 序列化为 `{}`，另两个 color timeline 为 120ms，无 View Transition。SVG 的 className 是 SVGAnimatedString；结合刚展开“动效设置”的操作和唯一 SVG transform 过渡规则，源码定位为 `MotionSettings` 的 `svg.current-more__chevron` / `craft.css` 的 full 档 transform。
   - full → reduced 删除 full 规则后，箭头回到初始 `transition-property: all` / duration 0；这不能可靠取消已经启动且属性仍被 all 包含的过渡。不是 theme-root 外的 token 取值或结果条形的新 token。
   - `craft.css` 为 reduced 根/子树/伪元素显式设置 `transition: none; animation: none`，再由既有、后续 reduced 规则只开放 ≤120ms 的透明度/颜色。取消范围同时覆盖旧指示块和宽度等 full 档几何过渡。新增 CSS 单测验证箭头与指示块从 full 切到 reduced 后显式为 none；它验证样式选择，不能代替真实活动动画复测。
   - 时长扫描继续保留 ≤120ms、总预算及属性白名单；附件新增 SVG 的 tag/class/id、伪元素、超预算 CSS 元素与具体属性/时长，避免后续只看到匿名 `{}`。修正后的真实 maximum 读数尚未取得。

4. **分段视图过渡文本断言（一项）**：已访问的先天/量表按固定顺序常驻 main，切换 hidden 不改变 `textContent`，所以第三次返回先天时前后可相同。`observeViewTransitions` 改为采集 `main.innerText`，比较实际可见内容；继续包裹真实 `document.startViewTransition`，保留 main 命名、方向和页头/页脚不参与的断言。
   - 在快照更新前后记录每个保留会话的 hidden/inert、具有布局矩形的后代数、命名快照后代数；要求隐藏会话均 inert、布局/命名快照后代均 0。
   - 切 tab 后额外检查隐藏会话 display:none、空 ariaSnapshot，并实际走 8 次 Tab，确认焦点不进入任何隐藏会话，再恢复 main 焦点。产品原有 `RetainedSession` 的 hidden + inert 与仅 main 命名的设计保持；上述真实浏览器断言已更新但本机未执行，未声称已取得截图或原生 AX 通过结果。

### 隐藏会话的网络与定时器

- **确认并修复的额外网络**：本节请求计数来自注入 client 的单测，不是本轮真实 HTTP 样本。初始回归中，体质量表隐藏到先天输入页后推进 120 秒，`getLearningCurrent` 从 1 次增到 3 次，证明 60 秒轮询仍在。现在 `useLearningCurrentQuery` 按 SessionVisibility 设置 enabled，并在隐藏时把 refetchInterval 设 false；`useConstitutionQuestionnaire` 同时关闭 enabled，避免隐藏观察者因失效/重连触发额外查询。回归覆盖隐藏时主动 invalidate + 120 秒不增请求，返回可见量表后恢复所需查询，当下可见时仍正常刷新。
- **装饰定时器**：隐藏即取消九维 600ms 强调、400ms 揭示、3 秒销毁提示的任务；返回不重播/重建这些任务。销毁副本随所属会话隐藏立即清理。单测先排空 jsdom 因 h4 聚焦产生的原生 0ms selectionchange，之后隐藏与恢复的装饰定时器均为 0。
- **已触发的交互停留**：用户选答案时已经安排的单次 240ms 作答停留仍可完成题号推进，沿用 visible/keepFocus 防抢焦点；没有因隐藏而另建轮询、帧采样或新的强调任务。它是既有用户操作的完成，不是隐藏会话自动刷新。用户已提交的在途响应也不重复发送，仍由原 revision/销毁逻辑控制失效。
- **帧率探测**：MotionProvider 位于 AppProviders，只在整个应用一处，未移进保留会话。本轮新增回归：首次一个 rAF 探针被用户 pointerdown 取消后，首次挂载另一 tab、隐藏和返回均不增加 rAF/idle 请求；既有成功采样 sessionStorage 缓存与卸载清理测试继续通过。

### 本轮修改文件

产品（7）：

- `apps/yunqi-workbench/src/features/constitution/components/destroy-answer-visual.ts`
- `apps/yunqi-workbench/src/features/constitution/components/ConstitutionDimension.tsx`
- `apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx`
- `apps/yunqi-workbench/src/features/constitution/components/AnswerDestroyedNotice.tsx`
- `apps/yunqi-workbench/src/features/constitution/hooks/useConstitution.ts`
- `apps/yunqi-workbench/src/features/yunqi/hooks/useLearningQueries.ts`
- `apps/yunqi-workbench/src/styles/views/craft.css`

单测（5）：`app/RetainedSession.test.tsx`、`features/constitution/components/ConstitutionForm.test.tsx`、`features/constitution/components/ConstitutionMotion.test.tsx`、`providers/MotionProvider.test.tsx`、新增 `styles/views/motion-flows.test.tsx`，均位于 `apps/yunqi-workbench/src/`。

浏览器（5，均位于 `tests/browser/`）：`constitution-motion.flows.spec.mjs`、`constitution-helpers.mjs`、`learning.flows.spec.mjs`、`motion-helpers.mjs`、`motion.flows.spec.mjs`。

证据（3）：本文件仅追加；新增 `M1-c-rework-1-diagnostics.json` 与 `M1-c-rework-1-sources.sha256`。其余开始时存在的 20 个 dirty 文件逐一 SHA-256 不变，无既有文件被删除。Service、Domain、Contracts、Client、规则/契约、依赖、CI 无本轮修改；没有修改同步设计副本或原 token 文件。

### 本轮检查

Node v24.18.0 / pnpm 10.32.1。最终源见新清单，runner/build 哈希见诊断 JSON。临时完整日志为 `/private/tmp/yunqi-m1c-rework1-*.log`；这些临时路径不作为仓库可移植证据链接。

| 命令 | 退出码 / 实际结果 |
| --- | --- |
| 初始 `pnpm build` | 0 / PASS，浏览器启动前按依赖构建 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，73 文件、553 项 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 / PASS，73 文件、553 项；语句 99.14%、分支 97.69%、函数 99.76%、行 99.73%；阈值/exclude 未改 |
| `pnpm --filter @yunqi/workbench build` | 0 / PASS，190 modules；生产 CSS 检查通过 |
| `pnpm test:workbench-governance` | 0 / PASS，313 项及源码扫描 |
| `pnpm test:time-governance` | 0 / PASS，12 项及源码扫描 |
| `pnpm exec playwright test --list` | 0 / PASS，421 tests in 14 files；仅枚举 |
| `node --check`（全部 `tests/browser/*.mjs` 与 playwright 配置） | 0 / PASS，23 个模块/配置 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及预算、链接、命令、迁移/来源检查 |
| `git diff --check`、SHA-256/范围复核 | 0 / PASS，36 个源哈希、20 个既有文件不变、原证据前缀哈希、HEAD/分支与受限范围均一致 |
| `pnpm test:browser` 全量、修正后的真实时长/AX/截图/Tab/视图快照复测 | NOT_RUN，Chromium 沙箱启动限制，仍需评审方复测 |

保留的失败与证据限制：

- **评审原轮 FAIL**：413 passed / 8 failed，未将本轮单测与原轮浏览器结果合并。
- **初始回归 FAIL / 退出 1**：四文件 3 failed / 27 passed，分别命中副本属性残留、隐藏两分钟额外两次刷新、SVG 缺显式 transition:none。
- **中间样式/测试迭代 FAIL**：曾 1 failed / 29 passed，及单样式文件 1 failed；jsdom 对含伪元素的选择器列表不应用普通元素部分，已将普通元素与伪元素 reset 分开，未放宽期望。该四文件随后 30 passed。
- **扩展回归中间 FAIL**：3 failed / 32 passed（inert 只赋属性在 jsdom 不反射成 attribute，已显式写属性；隐藏定时器计数混入 jsdom 原生 selectionchange）；随后两次 1 failed / 64 passed，先确认并排空原生 0ms 任务，再把进度 listitem 定位限定到维度列表。定时器探针为 1 failed / 7 skipped 的单测试定向运行；这是筛选运行，其余测试没有被删除或加 skip。临时调试日志已移除。最终整包 553 项全过。
- **本机浏览器定向 FAIL（环境）/ 退出 1**：初始构建后执行 `pnpm exec playwright test tests/browser/motion.flows.spec.mjs --project=flows-chromium --grep 'motion controls'`，测试体 0ms，未进入产品断言；Chromium 因 `bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)` / SIGTRAP 无法启动。运行目录 `.artifacts/browser/2026-11-18T17-12-25-094Z-e1dd076b`，runner `cleanupPassed:true`；本轮自有 64656/64657 端口在清理后均未监听。未重复启动浏览器、未改用其他外壳绕过沙箱，也没有宣称修正后的 8 项浏览器已转绿。

本轮没有新增设计或产品范围取舍；既有 10ms 结果条形间隔与 400ms 总预算保持。待决只包括评审方在可启动 Chromium 的环境重跑实际浏览器验收。

## 返工 2（2026-11-19）

继续仓库根 `feat/motion-m1` 的现有未提交改动；HEAD 为 `f4dccb0c25fc7cbeb35d328e88de50a97dd0eea3`。开始时有 40 个未提交/未跟踪文件。本轮仅修改测试与追加证据，未提交、推送或切换分支，原始证据和返工 1 记录保留。

### 根因与原始失败

- 评审轮 `.artifacts/browser/2026-11-18T17-25-29-023Z-be6b29cc`：**420 passed / 1 failed / 0 skipped / 0 flaky**，639005.626ms。失败为 `[flows-chromium] motion.flows.spec.mjs:27` 的 motion matrix，调用 `expectConstitutionResults → expectConstitutionTitle`，原位置 `constitution-helpers.mjs:237`。
- 读取该轮 `results/motion.flows-motion-matrix-8bbb0-struction-and-capsule-focus-flows-chromium/trace.zip`，从 `test.trace` 确认原始断言为 `height = 33.00001525878906 > line = 33`；其前两条矩形数量断言均为 1。对原始捕获值重放同一 `height <= line` 断言，**FAIL / 退出 1**；这是捕获失败的重放，不是新浏览器运行或新独立样本。
- 解码 `1-trace.trace` 的增量 DOM/CSS 快照：最后的揭示前快照在 96883.209ms；首次 `data-reveal="true"` 快照在 96894.054ms；失败断言在 96937.613ms，揭示年龄处于约 **43.559–54.404ms**。当时 `.theme-root[data-motion="full"]`、结果的揭示标记和标题“痰湿质”均存在。
- trace 捕获的 CSS 指定判定卡 `constitution-decision-in`，`--motion-base: 180ms`、`--motion-distance: 6px`，关键帧为 `opacity: 0 → 1` 与 `translateY(6px → 0)`。测量发生于该 180ms 窗口内；原辅助只等字体就绪，未等祖先判定卡动画。确认修复对象为**结果揭示与几何测量的竞态**，保留 `height <= line` 的严格原值。
- 证据限制：trace 没有序列化 `heading.evaluate` 返回的完整 metrics 或精确的 `Animation.currentTime/playState`；动画阶段由捕获的 DOM、CSS、时间窗口交叉确定。本轮没有取得修正后的真实浏览器几何读数，不宣称已实测转绿。
- 可移植提取、原 trace SHA-256、初始 dirty 哈希与命令结果见 [返工 2 诊断](M1-c-rework-2-diagnostics.json)；最终 44 个 dirty 源/测试/配置/token 文件见 [返工 2 源清单](M1-c-rework-2-sources.sha256)。历史清单保持原样。

### 测量入口与 full 档同类排查

统一复用 `fixtures.mjs` 的既有 `waitForAnimations`：先等字体，再按 rAF 观察 `document.getAnimations()` 全部自然完成，仍为 5 秒超时；暂停/无限动效仍失败。没有调用 finish/cancel、固定睡眠、关闭动效或增大重试/阈值。

| 几何/排版读取入口 | 收敛位置与覆盖 |
| --- | --- |
| `constitution-helpers.mjs / expectConstitutionResults` | 结果可见后收敛，再测操作区两个按钮的位置；独立与嵌入入口共用 |
| `expectConstitutionTitle` | 标题文本提交后收敛，覆盖 element/Range 单行矩形、标题高度、宽度溢出，以及标题与倾向 chip 的横向顺序、垂直中心和换行组 |
| `expectConstitutionResultLayout` | 结果节点与字体样式断言后、读取 metrics 前收敛，覆盖三栏列宽、九条行/轨道高度、52/36px 栅格列和 30/40 刻度几何 |
| `expectConstitutionMixedReference` | 七项兼夹文本提交后收敛，再测三格等高和最多两行摘要，附件使用同一稳定状态 |
| `expectConstitutionDisclosures / expectConstitutionSegments` | 折叠行文本/时气片段可见后收敛，再测左缘、行间位置、单行和溢出；同时覆盖作答页与结果页 |
| `expectConstitutionAnswerLayout` | 九维进度文本提交后收敛，再测进度轨道与题页布局，覆盖进入/翻题后的测量 |
| `fixtures.mjs / expectTypeScale / expectPanelLayout` | 字体可见区域及整个面板几何采样前收敛，保留既有完整测量重试与全部原始期望 |
| `visual-assertions.mjs / expectViewControls` | 控件矩形/可见性采样前收敛，覆盖结果、作答和其他页面控件 |
| `birth-helpers.mjs / expectBirthDetailSegments / expectBirthMirror` | 出生结果的文字片段、值/圆点镜像和列几何读取前收敛 |
| `stage-facts-helpers.mjs / expectCurrentPeriodAlignment` | 当步气/运结构提交后收敛，再读每行 `boundingBox` |
| `consistency-helpers.mjs / expectMoreRows / expectRelationSources / expectClassicsAlignment / expectPillGeometry` | 更多行、展开出处、原文卡对齐/焦点边界、胶囊/字标/阴影几何读取前收敛，覆盖视图过渡、披露展开和面板收起 |
| `birth-assessment.flows.spec.mjs` | 关闭原文披露及调整视口后收敛，再以 `getClientRects` 过滤引文并测溢出 |
| `learning.flows.spec.mjs / design-foundations.flows.spec.mjs` | 拉伸链接卡滚动到位后收敛，再读点击位置的 `boundingBox`；基础控件批量高度/标签偏移测量也先收敛 |
| `ux-walkthrough.flows.spec.mjs` | 年度阶段详情可见后收敛，再测六个选项、详情距离及内容位置 |
| `motion-helpers.mjs / observeViewTransitions` 与 `motion.flows.spec.mjs` | 同步视图快照回调保留 hidden/inert/命名与可见文本采样；其中的 `getClientRects` 几何测量移至切 tab、resize 自然收敛后的现有隐藏会话检查，每个后代仍须恰为 0 个矩形，真实 Tab 排除检查保留 |

其他命中逐项核对：

- `expectIndicatorAligned` 原已调用 `waitForAnimations`，保留 ≤1px。`panel-shell.flows.spec.mjs` 的页头控件/页脚单行读取位于已收敛的 `expectPanelLayout` 之后；`constitution-actions.flows.spec.mjs` 的固定操作区前后矩形读取位于已收敛的 `expectTypeScale`、axe 和截图辅助之后，滚动本身不启动产品动效。这两处无需重复添加等待。
- `workbench.visual.spec.mjs` 仅由现有 motion=off 视觉项目执行，未为解决本轮故障更改其档位、截图或阈值。
- `constitution-motion.flows.spec.mjs / observeResult` 的 `getBoundingClientRect()` 是结果插入时强制解析初始样式，返回值未用于几何断言；刻意保留在揭示开始，以采集真实关键帧/时长和包括 recent-input 在内的 layout-shift。其 `expectReveal` 原已在收敛后断言采样，本轮未改写该动态观测、400ms 预算或任何 PASS 条件。即时选中/焦点环断言仍保持即时性。

### 本轮修改文件

测试辅助（7，均位于 `tests/browser/`）：`constitution-helpers.mjs`、`fixtures.mjs`、`visual-assertions.mjs`、`birth-helpers.mjs`、`stage-facts-helpers.mjs`、`consistency-helpers.mjs`、`motion-helpers.mjs`。

流程 spec（5，同目录）：`birth-assessment.flows.spec.mjs`、`learning.flows.spec.mjs`、`ux-walkthrough.flows.spec.mjs`、`design-foundations.flows.spec.mjs`、`motion.flows.spec.mjs`。

Node fixture（1）：`tests/browser-fixtures.test.mjs`，为既有合成页面补字体就绪/空动画集合及 waitForFunction 接口；原完整重试、坏页头/页脚拒绝用例保持。

证据（3）：本文件仅追加；新增 `M1-c-rework-2-diagnostics.json` 和 `M1-c-rework-2-sources.sha256`。共 13 个测试文件及 3 个证据文件；其余 34 个初始 dirty 文件 SHA-256 不变，本文件原始前缀逐字节保留。产品代码、CSS/tokens、规则/契约/Service/Domain/Client、依赖、配置及 CI 均无本轮修改。

### 检查结果

Node v24.18.0 / pnpm 10.32.1。本轮仅测试与证据变更，无需重建产品产物；未启动浏览器或常驻服务。

| 命令 | 退出码 / 实际结果 |
| --- | --- |
| `pnpm exec playwright test --list` | 0 / PASS，421 tests in 14 files；仅枚举，测试数量不变 |
| `node --check`（全部 `tests/browser/*.mjs`、`tests/browser-fixtures.test.mjs`、`playwright.config.mjs`） | 0 / PASS，共 24 个模块/配置 |
| `node --test tests/browser-fixtures.test.mjs` | 0 / PASS，14 passed / 0 failed / 0 skipped；合成 DOM 几何不能替代 Chromium 验收 |
| `pnpm test:project-guidance` | 0 / PASS，15 项及预算、链接、命令、迁移/来源检查 |
| `git diff --check` | 0 / PASS |
| SHA-256 / 变更范围复核 | 0 / PASS，44 个源哈希、34 个既有文件、原证据前缀、原 trace、HEAD/分支及 16 文件 allowlist 一致 |
| `pnpm test:browser` 及修正后的真实 full/reduced/off 结果几何、动画/axe/截图 | NOT_RUN，本轮按要求完成枚举、语法和相关 Node fixture 检查；仍需评审方重跑真实浏览器 |

保留评审原轮 **420 passed / 1 failed** 和捕获断言重放 **FAIL**；上述枚举/语法/Node 通过没有与它们合并为浏览器全绿。
