# Workbench约束

修改 `apps/yunqi-workbench` 的源码、运行时依赖、路由或展示前读取本页；
时间和医疗约束分别见[规则与时间](rules-and-time.md)、[医疗与阶段范围](clinical-scope.md)。

## 依赖和导入

运行时白名单仅有 `@tanstack/react-query`、`@yunqi/client`、`@yunqi/contracts`、
`react`、`react-dom`、`react-router-dom`；router必须精确锁定7.18.1。
白名单同时覆盖dependencies、optionalDependencies、peerDependencies；devDependencies只放开发/测试工具，
不得通过把运行时包列入devDependencies绕过源码检查。

所有静态import、动态import和require均受约束。禁止Service、Domain、calendar adapter、
内部生成OpenAPI、Axios或其他未批准router；DTO从Contracts公共入口导入。
相对路径解析后须仍在Workbench内；禁止../、Windows ..\逃逸、绝对本地路径和file:导入。
Contracts/Client公共包入口是允许边界，不允许改为内部文件路径。

## 职责所有权

| 层 | 职责 |
| --- | --- |
| AppProviders | 组合Error Boundary、Theme、Query、YunQi Client Provider |
| QueryProvider | 拥有QueryClient |
| YunQiClientProvider | 创建/注入YunQiClient和transport |
| feature query/hook | 使用注入client与Client query options获取数据 |
| AppRoutes/Router/PanelShell | URL匹配、页面、分段/下钻导航、重定向、历史恢复 |
| presentation mapper | 纯DTO转换；不依赖React Router、TanStack Query或Client |
| component/Page | 接收状态和展示模型，呈现与局部交互；冻结DTO在presentation mapper转换 |

Router、Page、Navigation不直接调用client，数据获取继续通过feature query/hook。
component职责按路径判定：`src/components/**`、`src/app/**`、
`src/features/**/components/**`、`src/features/**/pages/**`，不因扩展名改变。
component禁止runtime import/re-export Client，禁止fetch/Axios/client调用、拼接业务API路径和执行领域计算。
optional chaining、方法引用、bracket access、解构也不能取得client方法能力。
纯type-only client import/re-export不产生运行时能力；混合type/runtime re-export仍按runtime拒绝。

## 界面设计

当前界面视觉与交互唯一依据为[设计规范与原型](../design/README.md)：
固定宽400px的门诊侧栏面板，分段导航“当下运气 / 先天对照 / 体质量表”，原文与结果用下钻页，可收起为胶囊条。
运气通是独立侧边栏窗口，不嵌入门诊工作站页面。收起态宿主为透明窗口 424×88 = 胶囊 400×64 + 左右各 12、上 10、下 14 外边距；
胶囊使用 `pill-height` 和 `shadow-pill`，不随小窗口压缩，宿主背景透明。窗口契约见[设计规范](../design/README.md)“独立侧栏窗口”，当前浏览器验收按此模拟宿主尺寸。
重构前页面的布局、样式、组件形态和浏览器截图均为demo，不再作为设计参考或验收基线；新增或修改界面不得沿用demo样式。

- 颜色、字号、间距、圆角、阴影、尺寸只取[设计令牌](../design/design-system/tokens.json)，以CSS变量实现，不写裸值；浅/深两主题。
- 字体与图标本地加载，禁止Google Fonts、在线字体和在线图标库；思源黑体/宋体完整字库随应用分发并附OFL许可。
  `pnpm test:workbench-governance` 拒绝index.html与CSS中的远程资源，浏览器验收拒绝离开自有origin的请求。
- 字号只用[全应用 5 档字号阶梯](../design/type-scale.md)（40/30/24 首眼、20、15、14、12），每屏不超过 5 级、首眼只一个。
- 动效遵守[本地 M1 约定](../design/design-system/1-layout.md#动效2026-11-19-本地授权-m1)：复用 motion tokens、`useMotionLevel` 三档；默认终态可见，WAAPI 守卫，不等待动画事件。
  宿主同步钩子只定接口；收起先退出再缩窗，展开先放大再入场。量表停留为三档一致的 240ms。
  先天/量表由 `RetainedSession` 常驻；隐藏时不自动刷新、不重播装饰动画、不抢焦点。
- [统一约束](../design/design-system/2-constraints.md)中的视觉、交互、文案、医疗安全和可访问性条目均为硬约束。
- HIS患者信息与“复制结论到病历”仍未授权；独立窗口契约已确认，Tauri实现另行排期，见[设计目录说明](../design/README.md#超出当前授权的原型元素)。
- `PanelShell` 承载全部视图；只有内容区滚动，标题栏与页脚固定，面板最小高度640px。
- 年度三栏的岁运用“水运太过”式单值，400px下面板各栏值保持单行。
- 出生输入的“查看对照”、提交后的“同时测评体质”均在 `PanelShell` 操作区，展开出生输入时由提交操作接管。
  独立与内嵌量表共享操作区：作答时左侧次按钮“结束并销毁答卷”，答完后右侧主按钮“查看结果”；
  结果用 `PanelHeader` 下钻标题，操作区左侧结束、右侧文字按钮“返回修改”。每个视图最多一个主按钮。
  指定时点的“开始分析”继续为所在视图唯一主操作。
- 浏览器矩阵与逐状态字号、布局、焦点、可访问性检查见[浏览器验收说明](../../tests/browser/README.md#ui-refactor-migration)。

## 组件

- `DateField` 是年/月/日数字输入；调用方必须提供 `label`，同时用于可见legend与整体可访问名称；出生页传“出生日期（公历）”，各段有可访问名称。
  满位跳格、空段退格返回、支持粘贴 `YYYY-MM-DD`；对外只输出规范字符串或空值。
  仅校验整数位数和年1900–2100、月1–12、日1–31，不判断月份天数，日期有效性由API校验。
  输入高度使用 `--input-height`；外部清空不完整草稿时由会话重建控件。出生时刻保留统一令牌样式的 `type="time"`。
- `SegmentedControl` 用于性别与“时刻不详 / 已知时刻”的局部选择，不依赖路由；
  使用按钮、radiogroup/radio、aria-checked和单Tab入口，方向键切换，Home/End选择首尾。
  默认高度为 `--segment-height`，compact为与现有分段一致的30px。路由导航继续使用 `SegmentedNav`。
- 量表选性别进入第一题后收为“男性版/女性版 · 更换”；有答案时页内确认清空题数，取消与Esc恢复“更换”焦点，
  确认后清空并聚焦性别选择；零作答直接返回选择。确认期间暂停题目推进并阻止作答和评分。

## 当前导航和状态

| 路径 | 导航与返回 | 行为 |
| --- | --- | --- |
| / | replace到/yunqi/current | 默认入口 |
| /yunqi/current | 分段：当下运气 | 当前规则状态 |
| /yunqi/current/classics | 下钻：原文与释义；返回/yunqi/current | 同一教学复合查询，按全年/当下阶段阅读原文、释义与出处 |
| /yunqi/birth | 分段：先天对照 | 用户提交公历生日与可选时刻后对照；不持久化 |
| /yunqi/birth/classics | 下钻：原文与释义；返回/yunqi/birth | 仅使用本页内存中的出生响应，全年/出生阶段原文；直接打开无资料时不查询 |
| /yunqi/constitution | 分段：体质量表 | 现行标准量表，完整作答后评分，与当前时气并列 |
| /yunqi/year | 下钻：年度详情；返回/yunqi/current | 当下API成功后replace到其运气年；不可用时保留空态，允许手动选年 |
| /yunqi/year/:year | 下钻：年度详情；返回/yunqi/current | URL驱动指定运气年分析 |
| /yunqi/calculate | 下钻：指定时点；返回/yunqi/current | E1指定时点，仅用户提交后查询 |
| /yunqi/inquiry | 下钻：问诊规划；返回/yunqi/current | 只读规划入口，零业务查询；不放入分段导航 |
| 其他路径 | 下钻：页面未找到；返回/yunqi/current | 不发业务查询 |

导航模型及固定返回目标由 `src/app/routes.ts` 定义；直接打开下钻页也能返回，不依赖浏览器历史。
分段切换后焦点进入内容区；同一年度区域内改年份保留控件焦点。
收起状态只在 `PanelShell` 的页面内存中，展开恢复收起按钮焦点；不写URL或浏览器存储。
胶囊只接收当前视图已加载的ViewModel：当下/量表使用当前快照，出生使用本次响应的current快照，
年度/指定时点使用所选年度摘要；空闲、无结果或已隐藏的结果不补查、不借用其他路由的缓存。

年份是URL导航状态，阶段选择是页面局部状态；年度入口与子路径共用下钻标题。
当前范围1900–2100，列表、校验和提示使用
[共享年份范围](../../apps/yunqi-workbench/src/lib/yunqi-year-range.ts)。
问诊规划入口可访问不代表问诊业务上线。不得自动新增问诊子路由。
年度页的“更多”文字链接可进入指定时点和问诊规划；问诊规划只读，不放入分段导航。

2026-11-16新增两个独立入口及当前教学复合查询已获用户授权，见[实施计划](../plans/2026-11-16-clinician-feedback.md)。
组件不导入DTO或计分规则；时间、解释和结果经纯presentation投影。出生与答案只保留会话态，
mutation gcTime为0，不写URL/浏览器存储；改输入立即隐藏旧结果，切换性别清空不再适用的答案。
第二轮允许在出生对照内按需组合现有量表，详见[同页测评计划](../plans/2026-11-16-clinician-feedback-continuation.md)。
该组合只使用本次birth response的current快照；多个出生候选共用一份答卷。
出生输入变更、清空、重新对照或结束测评时销毁答卷，旧异步评分不能恢复到新会话。

## 展示和交互

以下为与视觉无关的展示语义，重构后继续有效。
直接显示API localTime并标注“北京时间 UTC+08”，不从epoch或浏览器时区重建时间。
岁运主要展示“五行运＋太过/不及”，五音作为补充；API事实与解释不可由UI重新计算。
方向“客生主”与传统描述“客生主，相得”是两个展示项，不能互相替代。
年度视图不冒用当前态；指定时点采用中性所选阶段语义。

当下页阶段副标题直接消费1.3.0 DTO的气边界节气、运边界标签和余日；余日为0时只截取end.localTime的HH:mm。
段内硬边进度只格式化API elapsedRatio，不计算时间差，不在非测试源码维护包含两个以上六气边界节气的数组。
主客运标签使用DTO traditionalLabel，说明只拼接host/guest五行及direction；按教学规则1.3，相生与客胜主（顺）用相合色，主胜客（逆）用相违色，同五行两种太少标签均用中性色。
“相违”只是颜色语气，不是风险等级；标签只描述运气结构，不推导吉凶、疾病或治疗结论。
出生对照“所处运”继续使用comparisons中的客运对照，不替换为当步主客运关系。

结果编辑后立即隐藏旧结果，提交中限制重复激活，错误使用固定脱敏提示。
原生required会先于submit触发，空值错误/焦点及真实datetime-local值需经过实际控件验证。
不能为jsdom自动补出的.000修改业务输入语法。

机械约束已有 `pnpm test:workbench-governance` 和 `pnpm test:time-governance`。
新增语法绕过需扩展原AST/绑定分析与正反变异用例，不另建正则式替代品。
