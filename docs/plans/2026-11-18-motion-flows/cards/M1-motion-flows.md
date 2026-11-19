# M1 动效与操作动线专题

> 放置位置：`docs/plans/2026-11-18-motion-flows/cards/M1-motion-flows.md`
> 前置：F1–F6 已合并（main 65c79b8）。通用约束沿用 `docs/plans/2026-11-18-prototype-finals/cards/_common.md`：UI 不计算领域规则；样式只用 tokens；推送与 PR 需用户同意。
> 本卡不改契约、DTO、判定规则、教学规则版本。

---

## 0. 现状评估（main 65c79b8）

### 已经做对的（保留）

- 所有动效集中在 `styles/views/craft.css`，统一 140ms ease-out，风格克制。
- `prefers-reduced-motion: reduce` 全局关闭过渡与动画。
- 焦点环不参与过渡，按 Tab 时立即出现。
- `<details>` 在支持 `interpolate-size` 的浏览器里高度平滑展开，不支持时退回原生的瞬时展开。
- 面板 / 胶囊 / 出生输入用 `@starting-style` 淡入。
- 焦点管理扎实：切区回到 main，收起 / 展开互相回焦，结果页标题聚焦，翻题延时可被打断。

### 问题

| # | 问题 | 影响 |
|---|---|---|
| P1 | 动效参数是 Workbench 本地变量（`--craft-motion-*`），不在 `tokens.json`；只有一档时长，缓动是关键字 `ease-out` | 设计系统缺“动效”这一维；进入、退出、强调无法区分 |
| P2 | 三个主 tab 和“全年 / 当下阶段”分段控件只做背景色交叉淡化，选中块不移动 | 切换时视线没有落点，像整块闪了一下 |
| P3 | 切 tab、进入原文与释义、返回，内容都是瞬间替换；不同区域之间切换时 `scrollTop = 0` | 没有方向感；从下钻返回时滚动位置丢失，要重新找 |
| P4 | 量表翻题瞬间替换；选中后 160ms 自动翻题，选中态和翻题几乎同时发生 | 医生看不清自己选了什么就翻走了，容易怀疑“点上没有” |
| P5 | 九维进度条、✓ 瞬间变化 | 作答反馈弱 |
| P6 | 结果页条形、判定标题瞬间出现 | 结果“砸”出来，没有阅读顺序 |
| P7 | 年轮图静态；时间跨过气 / 运边界时高亮段瞬间跳格 | 跨段这一变化本身不易察觉 |
| P8 | 收起 / 展开只淡入新状态，不处理宿主窗口尺寸变化 | Tauri 阶段窗口从 424×88 跳到侧栏，会闪 |
| P9 | 深浅色切换时，带 `background-color` 过渡的元素和没带的元素变色不同步 | 切主题时出现参差的色块 |
| P10 | `LoadingState` 立刻显示；接口在 100ms 内返回时会闪一下“加载中” | 视觉噪音 |
| P11 | 只有 hover，没有按下（`:active`）反馈；“结束并销毁答卷”之后没有完成反馈 | 操作确认感弱 |
| P12 | 降级只有“减少动态效果”这一个开关 | 没考虑院内旧内核、远程桌面、低配机（见第 2 节） |

---

## 1. 动效原则（写进设计系统 `1-layout.md` 新增“动效”一节）

1. **只为因果服务**：动效只解释三件事——“从哪来、到哪去、刚才发生了什么”。不做装饰性循环、呼吸、视差、弹跳，不做数字滚动（分数、天数一律直接显示终值）。
2. **快而短**：交互反馈 ≤120ms；状态切换 ≤200ms；首次进入、结果揭示 ≤320ms。整个页面动画结束时间 ≤400ms。
3. **位移小**：位移 ≤8px，缩放只用 0.98–1，不旋转（箭头图标除外）。
4. **进快出更快**：退出用进入时长的 2/3。
5. **不挡操作**：动画期间所有控件立即可用；任何逻辑都不能等 `transitionend` / `animationend`。
6. **一次一处**：同一时刻只有一个区域在动；首屏入场每个会话只播一次。
7. **可降级**：任何一档降级下信息、功能、焦点行为都完全一致，只少了“过程”（见第 2 节）。

---

## 2. 降级策略（重点）

### 2.1 三档动效级别

在 `.theme-root` 上设 `data-motion="full | reduced | off"`，所有动效样式和 JS 动画都只认这个属性。

| 档位 | 条件（任一满足即降到该档） | 表现 |
|---|---|---|
| `full` | 默认 | 本卡全部效果 |
| `reduced` | ① 系统开启“减少动态效果”；② 浏览器缺少 View Transitions（`document.startViewTransition`）或 `@starting-style`；③ 运行时帧率探测偏低（见 2.3）；④ 用户手动选择“精简” | 只保留 ≤120ms 的透明度和颜色变化：选中态、按下、展开、淡入。去掉所有位移、缩放、条形生长、年轮描绘、视图过渡、分段指示块滑动（改为直接到位） |
| `off` | ① 用户手动选择“关闭”；② URL 参数 `?motion=off`（测试和远程桌面用）；③ `forced-colors: active`（高对比度模式） | 所有 transition、animation 为 0，`<details>` 用原生瞬时展开，翻题延时保留（这是交互节奏，不是动画） |

### 2.2 判定实现

- 新增 `providers/MotionProvider.tsx`，和 `ThemeProvider` 并列，挂在 `.theme-root` 上。
  - 首帧前同步计算档位，避免先播后停。
  - 监听 `matchMedia('(prefers-reduced-motion: reduce)')` 和 `(forced-colors: active)` 的 `change` 事件，变化后实时降档。
- **能力探测**：
  - `'startViewTransition' in document`；
  - `CSS.supports('selector(:has(*))')`；
  - `@starting-style` 用 `CSS.supports('transition-behavior: allow-discrete')` 近似判断；
  - `interpolate-size` 保持现有的 `@supports` 写法。
- **用户手动选择**：
  - 位置：主题按钮旁，或“计算说明与版本”同级，新增一个“动效：标准 / 精简 / 关闭”分段控件。
  - 保存：写入 `localStorage`，读写都包 `try/catch`；读不到时回退为自动判定。
  - 优先级：手动选择 > 系统设置 > 自动探测。
- **CSS 写法**：
  - 所有动效选择器挂在 `[data-motion="full"]` 下。
  - `reduced` 只额外开放 opacity / color / background-color / border-color。
  - 保留现有 `@media (prefers-reduced-motion)` 全局兜底，作为 JS 没跑起来时的最后一道保险。

### 2.3 运行时帧率探测（低配机、远程桌面）

- 院内常见 RDP、Citrix 远程桌面和老旧 PC，这些环境下动画会掉帧、拖影。
- **测法**：首屏完成后空闲时，用 `requestAnimationFrame` 采样 30 帧。
- **判定**：平均帧间隔 >24ms，或超过 1/3 的帧 >50ms，就降到 `reduced`，并把结果记入 `sessionStorage`，本会话不再重测。
- **约束**：探测本身不得造成可见变化；探测期间如果用户已开始操作，就放弃本次探测。

### 2.4 浏览器与内核下限

| 环境 | 预期档位 |
|---|---|
| Tauri / WebView2（Chromium ≥129） | `full` |
| Chromium 117–128（无 `interpolate-size`） | `full`，但 `<details>` 瞬时展开（现状） |
| Chromium 109–116（Win7 上最后可用的 Chrome / WebView2 109，部分 360 极速内核） | `reduced` |
| 不支持 `:has()` 的更老内核 | 不在支持范围，但页面不能报错、不能白屏，表现等同 `off` |

### 2.5 降级的硬性要求

- **不能依赖动画事件**：所有 JS 逻辑（翻题、回焦、卸载、滚动恢复）都用定时器或状态驱动，不等 `transitionend` / `animationend` / `ViewTransition.finished`。
- **不能先藏后显**：任何内容都不能依赖“动画结束后才变成可见”。不支持 `@starting-style` 的浏览器忽略起始样式，内容直接可见——这是安全的方向，新代码必须保持。
- **WAAPI 要守卫**：`element.animate` 调用前检查是否存在和档位；调用失败一律静默。
- **视图过渡要守卫**：没有 `startViewTransition` 时直接同步更新 DOM；视图过渡里抛错时，也要保证 DOM 已经更新。
- **截图测试**：Playwright 截图统一用 `animations: 'disabled'` 加 `?motion=off`，基线不受动效影响。

---

## 3. 动效 tokens（P1）

- **写在哪里**：在 `docs/design/design-system/tokens.json` 新增 `motion` 组，用 `build_css` 同步到 `apps/yunqi-workbench/src/styles/tokens.css`。
- **迁移**：删除 `--craft-motion-*`，所有引用改用新 tokens。

| token | 值 | 用途 |
|---|---|---|
| `--motion-instant` | 0ms | `off` 档 |
| `--motion-fast` | 120ms | hover、按下、选中、颜色 |
| `--motion-base` | 180ms | 分段指示块、展开 / 收起、视图切换 |
| `--motion-slow` | 240ms | 结果条形、胶囊 / 面板切换 |
| `--motion-emphasis` | 320ms | 年轮首绘（每会话一次） |
| `--motion-stagger` | 24ms | 条形、圆点依次出现的间隔，上限 8 个 |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 进入、位移 |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | 退出 |
| `--ease-linear` | `linear` | 仅用于透明度交叉淡化 |
| `--motion-distance` | 6px | 视图切换位移 |
| `--motion-press-scale` | 0.98 | 按下 |

在 `[data-motion="reduced"]` 下，`--motion-base`、`--motion-slow`、`--motion-emphasis` 都改为 120ms，`--motion-distance` 改为 0，`--motion-press-scale` 改为 1。在 `[data-motion="off"]` 下，所有时长为 0。

---

## 4. 具体动效（按区域）

### 4.1 分段控件指示块（P2）

- **范围**：三个主 tab、“全年 / 当下阶段”、出生对照“全年 / 当下”、量表性别。
- **做法**：在 `SegmentedControl` / `SegmentedNav` 中加一个绝对定位的“选中块”。
  - 由组件测量选中按钮的 `offsetLeft` / `offsetWidth`，写入 CSS 变量；
  - 用 `transform: translateX()` 和 `width` 做过渡，时长 `--motion-base`，缓动 `--ease-standard`；
  - 选中文字颜色用 `--motion-fast`。
- **布局**：首帧和窗口尺寸变化（`ResizeObserver`）时，选中块直接到位，不做动画。
- **降级**：`reduced` 和 `off` 档不滑动，选中块直接到位。
- **验收**：选中块与选中按钮的 `boundingBox` 误差 ≤1px，测量在动画结束后进行。

### 4.2 视图切换与下钻（P3）

- **实现**：用 `document.startViewTransition` 包裹路由变更，在 router 的导航封装里统一处理，不在各页面里写。
  - **平级切 tab**：只让 main 内容区参与（`view-transition-name: workbench-main`）。按 tab 的先后顺序决定方向，新内容从 ±`--motion-distance` 处淡入，时长 `--motion-base`；旧内容只淡出，时长 120ms。
  - **下钻**（当下 → 原文与释义、年度详情、指定时点）：新视图从右侧 `--motion-distance` 处进入。
  - **返回**：方向相反。
  - 页头标题单独命名 `view-transition-name: panel-title`，交叉淡化。
- **不参与过渡**：顶部应用栏、底部免责声明条都不参与，保持静止。
- **降级**：`reduced` 档或没有视图过渡 API 时，用 `@starting-style` 让新 main 内容做 120ms 透明度淡入；`off` 档直接替换。
- **滚动恢复（动线）**：
  - 平级切 tab：维持现状，回到顶部；
  - 下钻再返回：恢复到下钻前的 `scrollTop`，并把焦点放回触发下钻的那一行（如“原文与释义 ›”“年度详情”）；
  - 滚动位置按路由 key 存在内存 Map 里，不持久化。

### 4.3 体质量表作答（P4、P5）

- **作答节奏（动线核心）**：
  - 点击或按数字键后，0ms 立即显示选中态：背景、描边、圆点。
  - 圆点从左到右依次填色，每个间隔 `--motion-stagger`，共 ≤5 个。
  - 选中后停留 240ms 再翻题（原 160ms），让医生看清所选；停留期间再按别的键，按新选择重新计时（沿用现有可打断逻辑）。
  - 停留时长写成常量 `ANSWER_HOLD_MS`，所有档位都保留——这是交互节奏，不是动画。
- **翻题**：
  - 题干和选项组整体交叉过渡：下一题从右侧 `--motion-distance` 处进入，上一题从左侧进入，时长 `--motion-base`。
  - 黛青题头背景保持不动，只有文字变化。
  - 翻题后焦点仍落在题干 h3 上，没有外框（F4 约定）。
- **九维进度**：
  - 条形宽度过渡 `--motion-base`；
  - 某维答满时，“✓”用 `--motion-fast` 淡入，同时对应的维度名短暂变为 accent 色 600ms 后恢复——只做颜色，不做缩放。
- **上一题**：
  - 键盘：`←` 或 `Backspace` 回到上一题（焦点在输入框时不响应）；
  - 题头的提示文字补上“← 上一题”；
  - 方向反向。
- **降级**：`reduced` 档去掉圆点依次填色和翻题位移，只保留 120ms 交叉淡化；`off` 档直接替换。

### 4.4 体质结果揭示（P6）

- **出现顺序**（只在从量表提交进入结果时播放；“返回修改”后再提交也播放；刷新、直接打开不播）：
  1. 判定卡：0ms 淡入并上移 `--motion-distance`，时长 `--motion-base`；
  2. 九质条形：从 80ms 开始，`scaleX(0→1)`，原点在左，按标准附录顺序依次出现，间隔 `--motion-stagger`，单条 `--motion-slow`；分数文字直接显示终值，和条形同时淡入；
  3. 互参卡：在 240ms 时淡入。
- **约束**：
  - 30 / 40 刻度线始终静止，作为参照；
  - 条形用 `transform`，不动画 `width`，不触发重排；
  - 结果页标题照常立即聚焦，读屏用户不受动画影响。
- **降级**：`reduced` 档整体 120ms 淡入；`off` 档直接显示。

### 4.5 年轮图（P7）

- **首绘**（每会话一次，`sessionStorage` 标记）：
  - 外环六段、内环五段先以 `--surface-sunken` 底色立即显示，保证不空白；
  - 当前气段、运段的高亮色用 `stroke-dashoffset` 沿顺时针描出，时长 `--motion-emphasis`；
  - 中心干支不动。
- **跨段**（页面开着时时间越过边界、数据刷新）：
  - 旧高亮段 120ms 淡出，新高亮段 `--motion-base` 淡入；
  - 同时，下方气运对称卡里变化的那一列标题短暂变为 accent 色 600ms；
  - `aria-live` 沿用现有播报，不新增。
- **降级**：`reduced` 和 `off` 档直接显示最终状态。

### 4.6 收起 / 展开与宿主窗口（P8）

- **Web 侧**：
  - 收起：面板 `opacity 1→0`，同时 `scale(1→0.98)`，变换原点在右上角，时长 120ms（`--ease-exit`）；结束后切换为胶囊，胶囊 `--motion-base` 淡入。
  - 展开：反向，面板 `--motion-slow` 淡入并从 0.98 放大到 1。
- **Tauri 阶段**（本卡只定接口，不实现宿主）：
  - 约定事件顺序：收起是“内容淡出 → 通知宿主缩窗”，展开是“宿主放大窗口 → 内容淡入”；
  - 留出 `onBeforeCollapse` / `onAfterExpand` 两个钩子，Web 模式下为空实现；
  - 宿主改窗口尺寸本身不做动画，避免 WebView 重排抖动。
- **降级**：`reduced` 档只做 120ms 淡入淡出；`off` 档直接切换。
- **焦点**：现有的收起 / 展开互相回焦逻辑不变。

### 4.7 出生对照输入（动线）

- **提交后**：
  - 输入区收拢成摘要行，`<details>` 式高度过渡，时长 `--motion-base`；
  - 对照表淡入；
  - 焦点落到摘要行的“修改”按钮之前的对照表标题（沿用现状的话就保持）。
- **点“修改”**：摘要行展开回输入区，焦点进入年份输入框（沿用现状）。
- **清空本次资料**：内容淡出 120ms 后清空，焦点回到年份输入框，同时 `role="status"` 播报“已清空本次资料”。

### 4.8 主题切换（P9）

- **切换瞬间**：在 `.theme-root` 上加 `data-theme-switching`，禁用所有 transition，使所有元素同一帧变色。
- **有视图过渡 API 时**：在 `full` 档外层再包一个根级视图过渡，整屏交叉淡化，时长 `--motion-base`，`--ease-linear`。
- **其他档位**：直接切换。
- **收尾**：两帧之后移除 `data-theme-switching`。

### 4.9 加载与反馈（P10、P11）

- **加载提示**：
  - 请求不到 200ms 就返回时，不显示 `LoadingState`；
  - 一旦显示，至少保留 400ms，避免一闪而过。
  - 写在 `AsyncState` 里，所有页面共用。
- **占位**：加载占位尽量做成和最终布局同尺寸的灰色块（年轮区、事实卡区），保证首屏无布局偏移。
- **按下反馈**：
  - 按钮、选项卡、分段按钮加 `:active` 状态：`transform: scale(var(--motion-press-scale))`，背景加深一档，时长 `--motion-fast`；
  - 文字按钮（“返回”“‹ 返回修改”“出处 ›”）只变色，不缩放。
- **结束并销毁答卷**：
  - 确认后答卷区 120ms 淡出；
  - 显示一条 `role="status"` 的“答卷已销毁”提示，3 秒后淡出；
  - 焦点回到“体质量表”起始状态的性别选择。
- **键盘焦点**：焦点环永远不参与过渡（保持现状）。

---

## 5. 操作动线整理

逐条走查并补齐（浏览器测试按“全键盘”和“鼠标”各跑一遍）：

| 动线 | 目标步数 | 要点 |
|---|---|---|
| A 打开 → 看当下 | 0 | 首屏无布局偏移；年轮区尺寸预留 |
| B 当下 → 原文与释义 → 返回 | 2 | 返回后滚动位置和焦点恢复到“原文与释义 ›”（4.2） |
| C 当下 → 年度详情 / 指定时点 → 返回 | 2 | 同 B |
| D 先天对照：输入 → 查看对照 → 修改 → 再查看 | 键盘可全程：年 / 月 / 日自动跳格，Enter 提交 | 焦点去向见 4.7 |
| E 先天对照 → “同时测评体质” | 1 | 进入量表时先天栏已填好；不重复询问已有信息 |
| F 量表：选性别 → 26 题 → 查看结果 | 键盘全程：1–5 作答，← 上一题，Enter 查看结果 | 作答节奏见 4.3；最后一题答完自动聚焦“查看结果” |
| G 结果 → 返回修改 → 再提交 | 2 | 返回时定位到最后一题，答案保留 |
| H 结果 → 结束并销毁答卷 | 2（含确认） | 见 4.9 |
| I 跨 tab 切换后回来 | 0 | 量表进度、先天输入、结果都保留（会话内）；只有“结束并销毁”“清空”才清除 |
| J 收起 → 展开 | 各 1 | 焦点去向沿用现状 |

**快捷键**：
- 只新增 `←` / `Backspace` 上一题，题头提示同步说明。
- 不新增全局快捷键，避免和门诊医生站冲突。

---

## 6. 不做

- 数字滚动、骨架屏闪光（shimmer）、循环呼吸、视差、弹性缓动、页面级滑屏。
- 依赖第三方动画库（framer-motion 等）——只用 CSS、WAAPI 和视图过渡 API。
- Tauri 宿主实现（只留钩子）。

---

## 7. 检查（机械约束）

### 单测

- `MotionProvider`：
  - 系统设置、手动选择、能力缺失、`forced-colors` 四种来源的优先级；
  - `localStorage` 抛错时回退；
  - 帧率探测结果写入 `sessionStorage`，注入假的 rAF 时间戳来测。
- 导航封装：没有 `startViewTransition` 时同步更新；回调抛错时 DOM 仍已更新。
- `AsyncState`：200ms 内返回不渲染加载提示；显示后至少保留 400ms（用假定时器测）。
- 量表：`ANSWER_HOLD_MS` 期间改选会重新计时；`←` 和 `Backspace` 回上一题；焦点在输入框时不响应。

### 浏览器（Playwright）

- **三档**：分别用默认、`emulateMedia({ reducedMotion: 'reduce' })`、`?motion=off` 跑完整的 flows 测试，三档结果（文本、焦点、数据）完全一致。
- **能力缺失**：在 `addInitScript` 中删除 `document.startViewTransition`，跑 flows 不报错、功能一致，`data-motion` 为 `reduced`。
- **时长约束**：遍历页面所有元素，计算样式里 `transition-duration` 和 `animation-duration` 的最大值：
  - `full` 档 ≤320ms；
  - `reduced` 档 ≤120ms；
  - `off` 档全部为 0s。
- **不依赖动画事件**：`off` 档下翻题、收起、返回、销毁都在 `ANSWER_HOLD_MS + 50ms` 内完成。
- **布局偏移**：首屏和结果揭示期间 `layout-shift` 累计 = 0（`PerformanceObserver`）。
- **分段指示块**：动画结束后与选中按钮的 `boundingBox` 误差 ≤1px；切到窄窗口（`setViewportSize`）后仍对齐。
- **下钻返回**：从当下页滚到原文卡，进入原文与释义，再返回；`scrollTop` 误差 ≤2px，焦点在原入口。
- **焦点环**：Tab 聚焦时，焦点环在第一帧就完整可见（`outline-style` 不为 none，且 outline 不在 transition 属性里）。
- **截图**：截图统一用 `animations: 'disabled'` 和 `?motion=off`，基线不变（除了新增的“动效”设置控件）。
- `axe` 零违规；无外部请求；5 档字号约束不变。

### 人工核对（录一段 GIF 附在 PR 里）

- 在 `full` 档录：切 tab、下钻返回、作答 5 题、结果揭示、收起展开、切主题。
- 在 Chrome DevTools 把 CPU 降速 6 倍后，`full` 档不掉到明显卡顿（帧率探测应自动降档）。

### 全量

`pnpm build`、`pnpm test`、`pnpm test:browser` 全绿。

---

## 8. 交付拆分（建议按 PR 顺序）

1. **M1-a**：动效 tokens、`MotionProvider`、三档降级、导航封装、`AsyncState` 延迟，以及测试基建（三档 flows、能力缺失、时长扫描）。
2. **M1-b**：分段指示块、视图切换与滚动恢复、主题切换、按下反馈。
3. **M1-c**：量表作答节奏、翻题、九维进度、结果揭示、销毁反馈。
4. **M1-d**：年轮首绘与跨段、收起展开与宿主钩子、设计系统“动效”一节文档。
