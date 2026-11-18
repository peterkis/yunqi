# 布局、间距与层次

## 面板骨架

面板是一根固定宽度的竖条，自上而下五段，只有内容区滚动：

| 区域 | 高度 | 内容 |
| --- | --- | --- |
| 标题栏 | `header-height` 52 | 品牌标（22×22，`radius-xs`）· 当前患者（来自 HIS）· 固定 / 收起 |
| 分段导航 | `segment-height` 32 + 轨道内距 3 | 当下运气 / 先天对照 / 体质量表 |
| 内容区 | 弹性，滚动 | 卡片纵向堆叠 |
| 操作区（可选） | 40 按钮 + 上下 12 | 当前视图唯一的主操作 |
| 页脚 | `footer-height` 36 | 教学口径与“不作诊断依据”声明 |

- 面板宽 `panel-width` 400px，左右安全边距统一 `space-4` 16px。
- 下钻页（原文、结果）把分段导航换成“返回 + 标题”，标题栏高度不变。
- 收起态：`pill-height` 64 的胶囊条，宽 400，`radius-full`，`shadow-pill`；宿主为 `pill-window-width` × `pill-window-height`（424×88）透明窗口，外边距左右 `space-3` 12、上 `space-2.5` 10、下 `space-3.5` 14。只显示干支、年运三要素、当步客气与一个关系标签。点击整条展开。

## 网格

- 内容区单列。卡片内部用三种网格：
  - **三等分**（全年：岁运 / 司天 / 在泉），列间用 `border-subtle` 竖线分隔，第 2、3 列左内距 12。
  - **标签列 + 两等分**（先天对照）：`52px | 1fr | 1fr`，列距 10。
  - **13 等分 × 2 行**（量表 26 题进度），缝 3px。
- 六步进度条：6 等分，段高 4，缝 3，`radius-full`。

## 间距

4px 基准。**组件之间只用三档**：

| 关系 | 间距 |
| --- | --- |
| 卡片与卡片、导航与内容 | `space-3` 12 |
| 卡片内两个小节（中间有分隔线） | `space-3.5` 14，线上线下各一次 |
| 面板左右边距、紧凑卡片内距 | `space-4` 16 |
| 标准卡片内距 | `space-4.5` 18 |

**组件内部**：标签→值 4，圆点→文字 6，行内元素 8，标题栏元素 10。

一条经验：相关的东西靠近（4–8），并列的东西隔开（12），不同层级用线隔开（14 + 线 + 14）。

## 层次（视觉权重）

每张卡片只有**一个第一眼**。读者的视线顺序应当是：

1. 宋体大字（干支、阶段名、结论）
2. 黑体 600 的值（司天、客气……）
3. 关系标签（有底色的小胶囊）
4. 说明句（ink-secondary）
5. 眉标、出处、时间（ink-tertiary）

如果一张卡里出现两个 `display-*`，或关系标签比值更抢眼，就是层次错了。

## 层级（z 轴）与阴影

插件只有三层：

| 层 | 底 | 边界 | 阴影 |
| --- | --- | --- | --- |
| 面板底 | `surface-page` | 左缘 1px `border-default` 内阴影细线（不占布局） | 浏览器开发宿主中 `shadow-dock` 向左；独立窗口中不可见 |
| 卡片 | `surface-card` | 1px `border-default`，`radius-lg` | **无** |
| 浮起物 | `surface-card` | — | 选中分段 `shadow-segment`；胶囊条 `shadow-pill`；弹层 `shadow-float` |

- 卡片之间的层次靠“白卡 + 暖白底 + 细描边”实现，不加阴影。
- 卡片内的提示块用**下沉**而不是浮起：`surface-page` 底、`radius-sm`/`radius-md`、无边框。
- z-index：面板 `z-panel` 1000，胶囊条 `z-pill` 1010，弹层 `z-popover` 1020。不得盖住工作站自身的模态框。

## 圆角

由外到内递减：面板与卡片 14 → 按钮、轨道、选项 10 → 输入、图标按钮、提示块 8 → 角标 6。标签、胶囊、圆点用全圆。**内层圆角不大于外层。**

## 独立侧栏窗口的动效钩子（E5 宿主契约补充）

本地授权 M1-d，接口位于 Workbench `PanelShellProps`；只定接口，Tauri 实现另行排期。

```ts
interface PanelHostMotionHooks {
  onBeforeCollapse?: () => void;
  onAfterExpand?: () => void;
}
```

两者均为同步通知，Web 未传入时为空实现。收起由一次激活触发：内容以 fast 退出，
随后调用 `onBeforeCollapse` 让宿主立即缩至 424×88，再切换胶囊并淡入。
展开由一次激活触发：胶囊以 fast 退出，随后调用 `onAfterExpand` 让宿主立即放大到工作区高度，
再显示面板并以 slow 淡入。`onAfterExpand` 指宿主放大阶段、Web 内容入场之前，
不是动画完成通知；宿主不得异步等待 Web 动画或对窗口尺寸加动画。
off 档同一事件任务内调用钩子并切换；全程保留视图、草稿和滚动，胶囊/收起按钮互相回焦。

## 动效（2026-11-19 本地授权 M1）

动效只解释“从哪来、到哪去、刚才发生了什么”。交互反馈不超过 120ms，状态切换不超过 200ms，
首次进入与结果揭示单项不超过 320ms，包含延迟的整页过程不超过 400ms。
位移不超过 8px，缩放仅 0.98–1；只允许箭头图标旋转。退出比进入更快（通常为进入时长的 2/3）。
同一时刻聚焦一个区域；年轮首绘每个浏览器会话只播放一次，中心干支和数字直接显示终值。
不做装饰循环、呼吸、shimmer、视差、弹跳和数字滚动。

控件、键盘、焦点与结果立即可用；量表 `ANSWER_HOLD_MS = 240ms` 是可打断的作答停留，三档保留。
收起与清空以定时器推进退出阶段，不监听动画事件；新输入取消旧清空任务，隐藏会话不抢焦点。
加载灰块从首帧预留年轮和事实卡空间，200ms 前不播报加载，已播报至少保留 400ms。

### 三档降级

唯一档位来源是 `.theme-root[data-motion="full | reduced | off"]` 与 `useMotionLevel`。

| 档位 | 判定与表现 |
| --- | --- |
| full（标准） | 能力足够时默认；短位移、缩放、描绘与视图过渡 |
| reduced（精简） | 系统减少动态效果、缺少 View Transitions/starting-style 能力、低帧率或手选精简；仅 ≤120ms 的透明度及颜色变化，年轮直接终态，无位移、缩放、条形生长、滑块滑动或高度动画 |
| off（关闭） | 手选关闭、`?motion=off`、forced-colors 或缺少最低 :has 能力；所有时长为 0，同步切换 |

手选优先于系统与自动探测，但 URL 关闭、高对比度及最低能力缺失强制 off。
系统媒体设置实时响应；首帧同步判定，不先播放再停止。用户偏好 localStorage 与帧率/首绘 sessionStorage
读写均须 try/catch。帧率在首屏后空闲时采样 30 帧，平均间隔 >24ms 或超过 1/3 帧 >50ms 则精简；
用户开始操作即放弃采样，不产生可见变化。rAF 时间戳只用于帧率检测，不用于业务时间。
保留 `prefers-reduced-motion` 的无 JS CSS 兜底；老内核不得报错或白屏。

### tokens

源为 `tokens.json` 的 `motion`，运行时为 `apps/yunqi-workbench/src/styles/tokens.css`。
本仓库没有 `build_css`；手工逐值同步两处，由 `styles/tokens.test.ts` 检查两主题、降级覆盖、别名、重复及遗漏。

| token | full | reduced | off |
| --- | --- | --- | --- |
| motion-instant | 0ms | 0ms | 0ms |
| motion-fast | 120ms | 120ms | 0ms |
| motion-base | 180ms | 120ms | 0ms |
| motion-slow | 240ms | 120ms | 0ms |
| motion-emphasis | 320ms（年轮） | 120ms（年轮不用动画） | 0ms |
| motion-stagger | 24ms | 24ms（不用顺序动画） | 0ms |
| motion-result-start | 80ms | 0ms | 0ms |
| motion-result-stagger | 10ms（九条最后一条于 400ms 收敛） | 0ms | 0ms |
| ease-standard / ease-exit / ease-linear | cubic-bezier(0.2, 0, 0, 1) / cubic-bezier(0.3, 0, 1, 1) / linear | 同左，仅透明度与颜色 | 无动画 |
| motion-distance | 6px | 0px | 0px |
| motion-press-scale | 0.98 | 1 | 1 |

### 降级硬性要求

- 禁止等待 `transitionend`、`animationend`、`ViewTransition.finished`；逻辑、卸载、滚动、焦点由状态或定时器推进。
- 禁止先藏后显：基础 DOM/CSS 是可见终态；starting-style 被忽略、WAAPI 不可用或抛错时仍可见。
- WAAPI 调用前检查档位与 `element.animate`，失败静默，实时降档与卸载清理活动动画。
- View Transitions 缺失或抛错时仍同步更新 DOM；应用栏和免责声明不参与导航过渡。
- 三档信息、功能、数据与焦点一致。几何断言先等字体及全部动画自然收敛；截图使用 `?motion=off` 与 `animations: 'disabled'`。
