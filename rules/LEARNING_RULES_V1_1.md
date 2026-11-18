# 运气教学解释规则 1.1

- 版本：`YQ-LEARNING-RULES-1.1.0`；日期：2026-11-18。
- 授权：[阶段事实补全计划](../docs/plans/2026-11-18-stage-facts/README.md)及其 [E1 任务卡](../docs/plans/2026-11-18-stage-facts/cards/E1-domain.md)。计划调整表优先于原始计划。
- 专家状态：**待中医专家确认**。工程通过不代表专家冻结或临床验收。
- 本版为 [1.0 教学规则](LEARNING_RULES_V1.md)的增量；未列出的年度相临、六气客主加临、五音次序、交运算法、原文匹配与出生对照定义继续引用 1.0，旧文件原样保留。经典内容版本独立见[经典阅读 1.1](CLASSICAL_READING_V1_1.md)。

## 1. 相对 1.0 的变更与原因

补全当步主客运五行关系、气与运的边界标签、当前阶段进度，使展示层直接消费 Domain 事实，避免重复维护五行规则、节气表或日历算法。只增加派生事实与教学标签；核心规则仍为 `YQ-MVP-RULES-1.1.0`，年界、六气归属、交节和交运时刻保持不变。

## 2. 当步主客运关系

比较同一步的主运与客运，只使用核心五行相生、相克表。`MovementRelationResult` 返回 `elementRelation`、`direction`、`traditionalLabel`，不含六气专有的 `qiRelation`。五步分别给出关系。

| direction | traditionalLabel |
| --- | --- |
| NONE | 同属{element}（替换为主运五行） |
| HOST_GENERATES_GUEST | 主运生客运 |
| GUEST_GENERATES_HOST | 客运生主运 |
| HOST_CONTROLS_GUEST | 主运克客运 |
| GUEST_CONTROLS_HOST | 客运克主运 |

同五行为 `SAME_ELEMENT`，其余为 `DIFFERENT_ELEMENT`。只陈述生克方向，不将六气加临的“相得”“顺”“逆”外推到主客运，不混入年度关系或“出生与当前”比较，也不推导吉凶、疾病因果或治疗结论。

**评审发现**：现行客运是主运五项按岁运所在项旋转，同元素主客运的太少恒同。因此 E4 第 3 问所举“主太羽、客少羽”在现行生成口径下不出现。同年五步的偏移恒定，关系方向也一致：岁运木为同五行、火为主生客、土为主克客、金为客克主、水为客生主。通用关系函数只比较五行，不增加太少专用称谓。

## 3. 阶段边界标签

六气的 `startTerm` / `endTerm` 直接派生自核心 `STEP_BOUNDARY_TERMS`，类型 `SixQiBoundaryTerm` 只包含该常量的六个值。终之气结束于次年大寒；不另立节气表，不修改核心规则版本。

五运沿用 `TERM_OFFSET_TEACHING_V1`，由同一份 `MOVEMENT_BOUNDARY_OFFSETS` 生成交运时刻和文字标签：

| 阶段 | startLabel | endLabel |
| --- | --- | --- |
| 初运 | 大寒 | 春分后13日 |
| 二运 | 春分后13日 | 芒种后10日 |
| 三运 | 芒种后10日 | 处暑后7日 |
| 四运 | 处暑后7日 | 立冬后4日 |
| 终运 | 立冬后4日 | 大寒（次年） |

偏移是固定北京时间整日，保留交节钟点与毫秒，不含起日计数。标签只是既有交运口径的文字投影。它仍是现代教学工程解释，待专家确认，不能冒称古代每运七十三日五刻法。

## 4. 当前阶段进度

纯函数 `calculateStageProgress(start, end, input)` 使用显式 `YunQiInstant` 输入，不读取本机时钟。要求 `end > start` 且 `start <= input < end`，无效区间或输入抛出 `RangeError`，返回冻结的 `StageProgress`。

| 字段 | 定义 |
| --- | --- |
| elapsedRatio | `(input − start) / (end − start)`，以 epochMilliseconds 计算时长之比，四舍五入到 3 位小数；舍入为 1 时取 0.999，范围始终为 [0, 1)。 |
| remainingCalendarDays | 将 end 和 input 经 `createYunQiCalendarTimeFromInstant` 转成固定北京时间字段，以公历日序号相减；整数 ≥ 0，不看钟点，不按剩余小时除以 24。 |
| endsOnInputDate | `remainingCalendarDays === 0`；表示当前本地日期内稍后交气或交运，不表示已越过右开终点。 |

epochMilliseconds 仅用于时长比例及合法区间校验；日历含义来自固定 UTC+08 的本地年月日，复用纯公历算术，不经地域时区或夏令时重释。权威 `YunQiCalendarTime` 入口先从输入本地字段构造比例所需的规范 instant，保持本地日期字段的权威性。

`YunQiCalendarResult` 及兼容 `YunQiResult` 增加 `currentStepProgress`；`YunQiLearning` 增加 `currentMovementProgress`。只有包含本次输入时刻的气、运有进度，年度查询与其余步骤不携带进度。Learning 的 `facts` 复用同次计算的六气进度；不把六气索引用于五运。

2026-11-18 08:44 北京时间的工程金标：五之气为秋分至小雪，进度 0.929、剩余 4 个日历日；终运为立冬后4日至次年大寒，主太羽、客少商，关系为“客运生主运”，进度 0.095、剩余 63 日。节气时刻回归只证明与当前适配器一致，不构成独立天文精度或专家参考答案。

## 5. E4 待专家确认三问

1. 主客运之间是否沿用“相得”的说法（主运生客运、客运生主运时）？
2. 客运克主运、主运克客运，是否有顺逆之分？如果有，依据哪段原文？确认后再决定“克”是否改用相违色。
3. 主运与客运同五行但太少不同（如主太羽、客少羽）时，是否需要单独称谓？现行旋转口径不产生此情况；是否调整口径仍须专家确认。

三问由用户或专家回答，工程实现不代答。确认前沿用本版中性关系标签与“教学口径、待专家确认”说明。
