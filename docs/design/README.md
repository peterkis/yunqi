# 运气通 UI 设计规范与原型

2026-11-17 起，Workbench 进入 UI 界面重构。本目录是界面视觉与交互的唯一依据；
重构前 `apps/yunqi-workbench` 的页面布局、样式和交互形态均为 demo，不再作为设计参考，
也不作为新界面的验收基线。

设计规范不改变规则、API Contract、固定北京时间语义或医疗边界；这些仍以
[AGENTS.md](../../AGENTS.md) 及 [docs/agents](../agents/README.md) 为准。两者冲突时，
先按现有授权与边界执行，并把冲突记录到重构计划中等待用户决定。

## 来源

| 内容 | 本地副本 | 来源 |
| --- | --- | --- |
| 设计规范「运气通 YunQi」 | [design-system/](design-system/README.md) | <https://claude.ai/artifact/Uhzvz2FGqfiCoxk4JH8yGo>，版本 `1794882168-e774`，2026-11-17 同步 |
| 重构原型 | [prototypes/2026-11-17-门诊侧栏插件重构原型.html](prototypes/2026-11-17-门诊侧栏插件重构原型.html) | 用户提供的《运气通 · 门诊侧栏插件 重构原型》，sha256 `4abb7ea27bb3d7fcca9c147def25d0e4eca0a3b1cc412efb848a5cd17f8c9a4a` |

设计规范在线版本是上游；本地副本只做同步，不在本仓库内直接改写。上游更新时重新同步并更新上表版本。

## 规范文件

| 文件 | 内容 |
| --- | --- |
| [design-system/README.md](design-system/README.md) | 设计原则、色彩、字体（本地加载）、字号阶梯与排版 |
| [design-system/1-layout.md](design-system/1-layout.md) | 面板骨架、网格、间距、视觉层次、z 轴与阴影、圆角 |
| [design-system/2-constraints.md](design-system/2-constraints.md) | 视觉、交互、文案、医疗安全、可访问性硬约束 |
| [type-scale.md](type-scale.md) | **本地决定**：全应用 5 档字号阶梯（保留“单屏最多 5 级”并统一各视图字号），优先于规范中的逐样式字号 |
| [design-system/tokens.json](design-system/tokens.json) | 颜色（浅/深两主题）、字体、间距、圆角、阴影、尺寸、z-index 令牌 |
| `design-system/components/*/README.md` | 组件规范：Button、ElementDot、InfoCard、PanelHeader、QuoteBlock、RelationChip、ScaleOption、SegmentedNav |
| `design-system/components/*/preview.html` | 组件预览片段，依赖上游生成的 `tokens.css`，单独打开不带令牌 |
| [design-system/fonts/OFL.txt](design-system/fonts/OFL.txt) | 思源黑体/宋体的 SIL OFL 1.1 许可 |
| `design-system/fonts/NotoSansSC-VF.woff2` | Noto Sans SC 可变字体，400–700，7,660,684 字节，sha256 `49069af7ea5da00d9a97936e00843d7770916071fefd50e8c261500103582152` |
| `design-system/fonts/NotoSerifSC-VF.woff2` | Noto Serif SC 可变字体，400–700，11,034,472 字节，sha256 `cc42e7b19102017909909c6330e23e1befdb2b71c1ca792f46ae35b62cf2c241` |

两份字体于 2026-11-17 从上游 `fonts/` 同步。实现时作为 Workbench 静态资源随应用分发，并附带 `OFL.txt`。
规范要求完整字库、禁止子集化，禁止引用 Google Fonts 等在线字体或图标服务。

## 原型画板

原型为单文件离线包，需在浏览器中打开（依赖 JavaScript 解包）。共七个画板，示例患者与数据均为演示数据：

| 画板 | 对应视图 |
| --- | --- |
| ① 当下 · 默认态 | 标题栏、分段导航、全年卡、此刻卡（六步进度、主客气、主客运、关系标签）、原文摘句、页脚声明 |
| ② 原文与释义 | 下钻页：当下阶段与全年（岁运、司天）原文、阅读释义、出处、展开全段 |
| ③ 先天 × 当下 对照 | 出生日期与时刻、先天/当下两列对照（岁运、司天、在泉、所处气、所处运）、先天原文线索、同时测评入口 |
| ④ 体质量表 · 作答中 | 当下/先天摘要条、一题一屏、五级选项、数字键作答、上一题 |
| ⑤ 体质结果 · 与运气互参 | 判定与兼夹、九质转化分条形（30/40 刻度）、体质/先天/当下并列、结束并销毁答卷 |
| ⑥ 收起态 · 胶囊条 | 64px 胶囊：干支、年运三要素、当步客气、一个关系标签 |
| ⑦ 在医生工作站中的位置 | 1440×900 工作站示意，面板停靠右缘 |

原型中的“演示：一键填完 26 题”只用于演示，不属于产品功能。

## 本地扩展

- `DateField`：年/月/日三段数字输入，`label` 必填并作为可见legend和整体可访问名称，出生页传“出生日期（公历）”；统一 `--input-height` 与焦点环；
  支持满位跳格、空段退格和完整日期粘贴，各段有年/月/日可访问名称。
  对外为 `YYYY-MM-DD` 或空；只校验位数与年1900–2100、月1–12、日1–31，月份天数交给API。
  出生时刻保留 `type="time"`，统一令牌外观，业务时区仍为北京时间 UTC+08。
- `SegmentedControl`：非路由的按钮分段，用于量表性别和出生时刻是否已知。
  采用radiogroup/radio与aria-checked、单Tab入口、方向键和Home/End；
  默认 `--segment-height`，compact为30px，与 `SegmentedNav` compact视觉一致；不替换路由导航或原文范围控件。
- 量表作答时性别收为眉标；有答案的更换操作在页内确认清空题数，支持取消与Esc及焦点恢复。
  本地扩展样式位于Workbench的 `styles/views/form-controls.css`、`birth.css`、`constitution.css`，不改同步副本。

## 超出当前授权的原型元素

以下元素出现在规范或原型中，但超出 [医疗与阶段范围](../agents/clinical-scope.md) 的现有授权。
实现前须取得用户的独立授权；未授权时不得实现，替代呈现在重构计划中确定：

- 标题栏“当前患者（来自 HIS）”、姓名脱敏、性别年龄、就诊 ID、HIS 同步状态，以及“出生日期默认取 HIS”。
  现有授权禁止 HIS/EMR 接入、患者选择与身份关联。
- “复制结论到病历”主按钮：属于向 EMR 写入，且“结论”措辞需按输出边界复核。
- Tauri 宿主或工作站内停靠的部署形态：当前只有浏览器 Workbench。
- 现有 `/yunqi/year`、`/yunqi/year/:year`、`/yunqi/calculate`、`/yunqi/inquiry` 不在三段导航中；
  保留、迁移为下钻或下线须在重构计划中确定，并同步更新 [Workbench 约束](../agents/workbench.md)。
