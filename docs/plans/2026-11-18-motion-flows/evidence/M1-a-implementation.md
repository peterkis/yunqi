# M1-a 实现证据（2026-11-18）

- 基线：`feat/motion-m1`，HEAD `65c79b8c21df699c345f90dab21b38f29fd4d003`。开始时只有既存未跟踪专题卡；保留原卡，不提交、不推送、不切分支。
- 结论：M1-a 代码与可运行检查 DONE；浏览器实际验收 PARTIAL / NOT_RUN（按用户指定由评审方运行）。
- 修改清单：[39 个实现、测试与说明文件及其 SHA-256](M1-a-sources.sha256)；另新增本文件及该清单。清单按路径排序，格式为 `sha256 + 两个空格 + 路径 + LF`，其自身 SHA-256 为 `078b77abdc79cac3f60c329091baf23f49f28c9f284985a36b894313b1aadbf5`。覆盖全部 dirty 实现文件及新增源码，不包含本证据、自身和既存专题卡。

## 验收对应

| 项 | 实现与证据 | 状态 |
| --- | --- | --- |
| 动效 tokens | `tokens.json` 新增 motion 组；手动逐值同步两个主题的 `styles/tokens.css`，并声明 reduced/off 覆盖。仓库没有 build_css；扩展既有 `tokens.test.ts` 做全量值、别名、重复/缺失及降档覆盖的一致性与变异检查。运行时 CSS 已无旧动效变量。 | DONE |
| 三档判定 | `providers/MotionProvider.tsx` 与 ThemeProvider 组合，ThemeProvider 首次提交即输出 data-motion。URL off、forced-colors 和缺少 :has 为硬关闭；其他按手动 > reduced-motion > 能力/帧率自动判断。监听两类媒体变化；存储读取失败/非法值回自动，写入失败保留当前内存选择。 | DONE |
| 帧率 | 首屏 load 后先让过一帧，再申请 idle（无 idle API 则让过任务）；1 个 primer + 30 个帧间隔，平均 >24ms 或 >10 个间隔 >50ms 时 reduced。sessionStorage 缓存 full/reduced，缓存后不重测；pointerdown/keydown/wheel/touchstart 中止，不写结果；无 DOM/样式/焦点副作用。假 rAF 覆盖等号边界、两种低帧条件、取消、存储异常和缓存复用。 | DONE |
| 手动控件 | `components/layout/MotionSettings.tsx` 放在当下页“计算说明与版本”之后，同一 More 列表、独立原生 details。标题栏宽度和首屏两张卡布局不变；复用 SegmentedControl，四选一“自动 / 标准 / 精简 / 关闭”，自动会删除本地偏好并显示当前实际档位；无全局快捷键。 | DONE |
| CSS 降档 | `styles/views/craft.css` full 使用新 tokens，交互/颜色 120ms、展开 180ms；reduced 只开放 opacity/color/background-color/border-color，原生瞬时 details；off 所有过渡/动画关闭。保留全局 reduced-motion 兜底，其低优先级允许显式手动标准选择；outline 不参加过渡。未依赖动画完成事件。 | DONE |
| 导航守卫 | `app/navigation-transition.ts`：无 API/非 full 同步 flushSync；启动异常或更新被拒绝时兜底，提交至多一次；React 更新排队后回调抛错仍提交 DOM；只处理 ready/updateCallbackDone 拒绝，不等待动画完成。只建封装及单测，尚未给路由接视觉动画。 | DONE |
| AsyncState | `components/feedback/AsyncState.tsx` 200ms 前不显示加载；已显示则至少 400ms，成功/错误/空态共用；长请求完成立即释放，重试与卸载清理计时器。假定时器验证边界与 pending 反复变化，原有脱敏/重试检查保留。 | DONE |
| 浏览器基建 | 配置、fixtures、motion-helpers、motion.flows 及原有相关用例同步；枚举通过，执行结果不作推断。 | DONE（执行 NOT_RUN） |

## 浏览器矩阵与截图

- `flows-chromium` 默认标准、`flows-reduced-chromium` 用 emulateMedia reducedMotion:reduce、`flows-off-chromium` 在每次文档启动前加入真实 URL 参数 motion=off。各 69 条完整 flows 复用同样的业务文本、API 数据与焦点断言；配置状态文字按档位显示。`test:browser:flows` 覆盖这三档及能力专项。
- `motion-capability-chromium` 在 addInitScript 删除 document 及 Document.prototype 的 startViewTransition，运行同一组 2 条主流程/设置用例；断言自动 reduced、无运行时错误。主流程覆盖当下、下钻返回、出生修改/重算、完整量表、评分/修改/销毁及胶囊互相回焦。
- 专项扫描元素及 before/after/details-content 伪元素的 transition/animation 时长：full ≤320ms、reduced ≤120ms、off =0；reduced 还检查属性白名单。焦点检查在 focus 同一任务内读取 2px 实线环，禁止 outline/all 参与 transition。沿用无外部请求、axe 和五档字号检查。
- 总计 `69×3 + 2 + 164 = 373` 条、13 个 spec 文件。保留全局 workers=2、retries=0；仅 off flows 和全部视觉 projects 产出截图，统一 animations:disabled + motion=off。路由丢弃 query 时截图前 replaceState 加回，不重载、不改变焦点；其他档仍执行截图位置的字号检查。关闭自动失败截图，各档保留失败 trace。
- 功能矩阵预置 sessionStorage 的成功帧率样本 full，避免测试主机负载使矩阵中途变档；真实探测算法另由假时间戳单测验证。浏览器测试数不是独立样本或专家案例；本轮没有浏览器执行、截图或人工视觉结论。

## 检查记录

先执行基线 `pnpm build`（退出 0）才运行包内测试。最终状态如下；根命令也实际串行执行其包内命令。

| 命令 | 退出码与结果 |
| --- | --- |
| `pnpm build` | 0 / PASS（基线及修改后；180 modules，生产 CSS 无开发宿主样式） |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，68 文件、505 用例；最终根 test 再次通过 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 / PASS；最终根 coverage 再次通过，行 99.66%、语句 99.10%、函数 99.73%、分支 97.98%；阈值与排除项未改 |
| `pnpm --filter @yunqi/workbench build` | 0 / PASS（根 build/test/typecheck/coverage 内均实际执行） |
| `pnpm test` | 0 / PASS，含完整包测试、治理、时区、production smoke、OpenAPI 与指引检查 |
| `pnpm typecheck` | 0 / PASS，含各包源码及测试类型检查 |
| `pnpm test:coverage` | 0 / PASS（额外全仓覆盖率） |
| `pnpm test:workbench-governance` | 0 / PASS，313 项；根 test 再次通过 |
| `pnpm test:project-guidance` | 0 / PASS，15 项；最终证据写入后复核通过 |
| `pnpm test:time-governance` | 0 / PASS；rAF 时间戳合规，未改治理器 |
| `pnpm exec playwright test --list` | 0 / PASS，373 tests in 13 files |
| `node --check <浏览器模块>` | 0 / PASS，共 22 个模块，含配置及新用例 |
| `git diff --check` | 0 / PASS |
| `pnpm test:browser` | NOT_RUN，用户指定沙箱不能启动 Chromium，由评审方运行 |
| GIF、6 倍 CPU 降速及人工视觉检查 | NOT_RUN，本次未执行；不冒称验收通过 |

### 保留的中间失败

- FAIL，退出 1：首次 `test:typecheck`，新测试使用不被 ByRoleOptions 支持的 exact 参数（TS2769），已移除。
- FAIL，退出 1：首次定向 Vitest 为 10 failed / 64 passed；部分直渲染页面未套 MotionProvider，已补齐。
- FAIL，退出 1：首次整包 test 为 42 failed / 463 passed；缺少 Provider、旧 matchMedia mock 无 addEventListener，以及旧即时 Loading 断言。已修正接入、监听能力守卫和延迟断言；未删减现有行为检查。
- FAIL，退出 1：下一次整包 test 为 1 failed suite / 501 passed；测试包装编辑误加一个 JSX 结束标签，已修正。
- FAIL，退出 1（两次）：time-governance 报 `passing a global capability object to an indirect accessor is forbidden`；新测试的 fireEvent(window) 及 vi.spyOn(window, ...) 触发。改用直接 dispatchEvent 和显式 storage stub 后 PASS；没有放宽检查。
- FAIL：一次 apply_patch 因同文件删除/新增双操作被拒绝（未应用该补丁）；改为正常更新后完成。

## 范围与保留

- `ConstitutionForm.tsx` 与 HEAD 字节一致，SHA-256 `9353f236a5ae8dd0d6d2eb5d8a06b561e637d1f0fc0e00963ff2c34117642bcf`，保留 keepFocus；`BirthAssessmentSession.tsx` 与 HEAD 字节一致，SHA-256 `9fb98c7f086ca67b07df8c0fbfe8ee51b2100a2ea6f88d56155de2f026b6a91b`，保留入口 callback ref 回焦。对应现有单测仍通过。
- Service/Domain/Contracts/Client、规则/契约/DTO、锁文件及 CI 无差异，无新依赖。业务时间仍消费 API localTime；新计时仅用于交互加载/帧率，未引入业务时钟。
- 与卡片的差异：用既有 parity 单测同步 tokens（不存在 build_css）；多一个自动选项便于复位；设置使用 More 折叠行，避免占用 400px 标题栏。硬关闭条件优先于手动选择，以落实 2.1/2.4 的关闭要求。
- M1-b/c/d 的分段块、路由视觉动画/滚动恢复、量表节奏/结果揭示、年轮及新的收起展开动画均未实现。现有 160ms/系统 reduced 即时翻题逻辑保持原样，后续 M1-c 再统一节奏。
- 待验证：浏览器/视觉/实际低帧率验收；工程检查不替代专家冻结或临床验收。本轮未启动浏览器或常驻服务，无自有进程需清理。

## 返工 1（2026-11-18）

### 基线与范围

- 延续 `feat/motion-m1`，HEAD 仍为 `65c79b8c21df699c345f90dab21b38f29fd4d003`，在既有未提交改动上修复测试；没有提交、推送或切换分支。
- 编辑前保存工作区状态、diff 与 53 个相关文件的字节快照，位置 `/private/tmp/yunqi-m1a-rework1-ki702fdw/`。本轮不改产品源码、动效配置、`motionMode` 或依赖。原实施证据及 `M1-a-sources.sha256` 保留为上一轮记录。
- 评审原始运行：`.artifacts/browser/2026-11-18T15-14-27-198Z-334bb95b/`，373 条，360 passed / 13 failed，retries=0、workers=2。按实际失败用例分类为 A=9（标准面板 6、浅色性别入口 1、精简面板 2）、B=2、C=2；A 共 44 个失败节点。这里按用例和节点分别计数，不把重复检查当独立样本。
- [诊断摘录](M1-a-rework-1-diagnostics.json) 保存原日志及 results.json 的 SHA-256、13 条失败身份、error-context 哈希和全部 44 个节点的失败/终态对照。面板 trace 内嵌 spec 与本轮编辑前字节一致。

### A：axe 在入场透明度过渡中采样

- 已核对 error-context 的实际节点：panel-shell 用例失败在收起后胶囊的首次扫描，快照为 `button.panel-pill[aria-expanded=false]`；性别切换用例失败在最开始尚未选择性别的扫描，包含标题、导航和页脚。
- `craft.css` 对 `.panel-shell`、`.panel-pill` 等设置 `@starting-style { opacity: 0 }`，full/reduced 用 opacity 过渡到默认终态 1。默认 `reducedMotion: no-preference` 放开这些过程态后，原测试只确认可见/字号等状态，未等待过渡完成。
- 终态参考来自**同一次评审运行、同标题用例的 off 项目 axe 附件**，再与当前色彩令牌/动效 CSS 核对；这只是既存终态参考，没有为修复改档或关闭动效。以下为实际记录的前景/背景色及对比度：

| 节点 / 原失败项目 | 失败扫描 | 同轮终态参考 |
| --- | --- | --- |
| 浅色胶囊干支 / full，400×860 | `#ffffff / #78958d`，3.23 | `#ffffff / #2e5b4f`，7.70 |
| 浅色胶囊阶段 / full，400×860 | `#8a8f8c / #ffffff`，3.28 | `#4a524e / #ffffff`，8.05 |
| 浅色胶囊关系 / full，400×860 | `#6d8a9d / #edf3f8`，3.25 | `#1e4a68 / #e3edf4`，7.91 |
| 深色胶囊干支 / full，400×860 | `#646f6b / #accec3`，3.07 | `#10201b / #7fb3a2`，7.12 |
| 深色胶囊阶段 / full，400×860 | `#d0d4d1 / #6c6f6d`，3.39 | `#b7bdb8 / #1c201e`，8.61 |
| 性别入口标题 / full，light | `#8e908b / #f5f3ee`，2.90 | `#1d2320 / #fbfaf7`，15.31 |
| 性别入口状态 / full，light | `#acafa9 / #f5f3ee`，2.00 | `#5f6662 / #fbfaf7`，5.64 |

- 44 个失败节点全部找到对应终态，终态最低 5.64，均超过该扫描要求的 4.5；浅色胶囊的失败色还与约 0.65 的整体透明度合成一致。因此确认这批失败来自过程态采样，未发现这些节点的终态配色缺陷。
- 修复：在 `fixtures.mjs` 统一 `scanAccessibility`，先等字体，再以 rAF 轮询 `document.getAnimations()`，直到全部为 `finished` 或列表为空；5 秒超时仍未收敛则失败。全部 **12 处**原 axe 调用迁入该入口，flows 与 visual 一并覆盖；WCAG tags、扫描结果附件和原 violations 断言保留。辅助不调用 finish/cancel，不修改样式或档位，也不吞超时。
- 新增真实浏览器辅助回归：有限 WAAPI 动画自然结束后才通过，暂停动画必须超时；该回归已枚举/语法检查，实际浏览器执行 NOT_RUN，原因见下文。

### B：把默认 transition-property 当成非零过渡

- 原 helper 仅因计算值含 `all` 或 `outline` 就失败。无过渡的链接仍返回 `transition-property: all; transition-duration: 0s`，因此标准/能力缺失两个项目误报；这与焦点环已经即时显示并不矛盾。
- 修复：同一 focus 任务内同时读取 property/duration，按索引对位，较短时长列表循环匹配、过长项忽略。`all` 或 `outline*` 对应时长必须为数值 0，保留原 2px 实线、2px offset 和焦点断言。
- `tests/browser-fixtures.test.mjs` 增加 9 个正反单元，覆盖 `all / 0s`、`outline / 0s`、混合列表、ms/s、短列表重复及多余时长。`outline / 0.12s`、`all / 120ms` 等必须抛错。
- `motion.flows.spec.mjs` 另用临时按钮样式，先确认默认值可通过，再设置 `transition: outline 120ms`，断言完整 focus helper 拒绝。该浏览器反例已枚举；实际执行 NOT_RUN。
- 保留 RED：旧 helper 的直接反馈命令复现 `all` 被拒绝，退出 1；抽取原逻辑后的首轮 9 个定向单元为 8 failed / 1 passed，其中 4 个是合法零时长误拒绝、4 个是反例的预期错误消息尚未实现。修复后 9 项全部 PASS。

### C：隐私断言误拒绝测试注入的 motion 参数

- 原失败接收值均为 `?motion=off`，没有额外出生/答案参数。fixtures 在每次文档启动及 off 截图时注入该参数；产品只在启动读取，SPA 导航可以丢弃 query。
- 修复：统一 `expectNoPersonalDataInUrl(page, motionMode)`；无参数可通过，有参数时仅 off fixture 的单个精确 `motion=off` 可通过。其他参数、错误 motion 值、重复 motion 或其他档位带 motion 均失败。
- 替换 learning、workbench 和 birth-assessment 的全部 **4 处**同类空 search 断言，保留原 hash、存储清空和答卷销毁检查；不改产品 URL 行为。
- URL 单元在四种 fixture 模式分别验证合法缺省/注入值及个人信息、额外参数、错误/空值、重复参数，共 28 次断言，属于 1 个单元用例；PASS。

### 本轮检查

先完成 `pnpm build` 再进行浏览器启动尝试，后续检查不重建或改写共享产物。所有要求的可执行检查结果如下：

| 命令 | 退出码与结果 |
| --- | --- |
| `pnpm build` | 0 / PASS，180 modules，生产 CSS 检查通过 |
| `pnpm --filter @yunqi/workbench test` | 0 / PASS，68 文件、505 用例 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 / PASS |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 / PASS |
| `pnpm test:workbench-governance` | 0 / PASS，313 项 |
| `node --test tests/browser-fixtures.test.mjs` | 0 / PASS，14 项：原 4 项几何、9 项过渡列表、1 项 URL |
| `pnpm exec playwright test --list` | 0 / PASS，381 tests in 13 files；仅枚举，不代表执行通过 |
| `node --check` 相关模块 | 0 / PASS，配置、全部浏览器模块及根 fixtures 单测共 23 个；最后一次 spec 调整后另复查 motion spec，通过 |
| `git diff --check` | 0 / PASS |

- 最新枚举为 `71×3 + 4 + 164 = 381`：两个新增辅助用例分别在三档 flows 和能力项目运行，增加 8 个执行实例；原 373 个用例保留。README 同步数量和新辅助语义。测试数不是临床样本或专家案例。
- 原始检查日志位于 `/private/tmp/yunqi-m1a-rework1-ki702fdw/{workbench-test,workbench-typecheck,workbench-test-typecheck,workbench-governance,browser-fixtures,playwright-list}.log`，关键计数在上表和诊断 JSON 中保存。
- 本轮源文件哈希见 [返工 1 文件清单](M1-a-rework-1-sources.sha256)。与编辑前快照对比，产品源码、`package.json`、Playwright 配置以及其他原有工作字节不变；本证据只追加本节。

### 环境限制与保留的失败

- 首次定向命令 `pnpm exec playwright test tests/browser/motion.flows.spec.mjs --project=flows-chromium --grep '^motion matrix'` 退出 1，完整标题前缀导致未匹配测试；目录 `.artifacts/browser/2026-11-18T15-22-42-955Z-5060a782/` 保留。
- 去掉锚点后，同命令 `--grep 'motion matrix'` 找到 1 个用例，但 Chromium 在任何断言前退出：`bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`，SIGTRAP，命令退出 1。目录 `.artifacts/browser/2026-11-18T15-22-54-512Z-8cd80ec1/` 保留 trace、错误上下文和结果；记为启动 FAIL / 业务断言 NOT_RUN，不能算作原 B 的浏览器复现或修复后 PASS。
- 一次批量迁移脚本的检查预期误写为 14 个 axe 位置，实际完成迁移 12 处后计数校验退出 1。随后核对全部位置，并完成未执行的 URL 替换；没有遗漏扫描或丢弃既有改动。
- 没有通过其他浏览器/启动参数绕过沙箱，也没有重复加压。本轮未执行完整 `pnpm test:browser`，修复后的实际 flows/visual/两个辅助浏览器回归均 NOT_RUN，仍需在可启动 Chromium 的环境复验；原评审的 360 passed / 13 failed 保持原样，未合并成绿色结果。
- 两次 runner 的 `environment.json` 均为 `cleanupPassed: true`；实际探测其四个自有 Service/前端 listener 均已关闭。此事实只证明本轮端口清理，不代表浏览器验收完成。
