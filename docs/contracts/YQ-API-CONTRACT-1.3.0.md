# YQ-API-CONTRACT-1.3.0

- 日期：2026-11-18；状态：工程契约冻结，规则仍待正式专家冻结。
- API路径 `/api/v1`；OpenAPI规范 `3.1.0`；文档版本 `1.5.0`。
- 核心规则 `YQ-MVP-RULES-1.1.0`；当前教学规则 `YQ-LEARNING-RULES-1.3.0`；量表 `YQ-CONSTITUTION-1.0.0`。
- 机器基线：`packages/yunqi-contracts/contract/YQ-API-CONTRACT-1.3.0.freeze.json`；registry只追加。
- [1.0.0](YQ-API-CONTRACT-1.0.0.md)、[1.1.0](YQ-API-CONTRACT-1.1.0.md)、[1.2.0](YQ-API-CONTRACT-1.2.0.md)文档和freeze文件原样保留。

## 范围与变更依据

按[阶段事实计划及调整表](../plans/2026-11-18-stage-facts/README.md)补全Domain事实。
Service直接映射Domain结果，时间继续只经time-normalizer；不新增端点或状态码。
冻结投影覆盖以下8个业务端点及所有可达schema：

| Method | Path | 1.3.0响应变化 |
| --- | --- | --- |
| GET | `/api/v1/yunqi/year/{year}` | 六气各步增加边界节气；无输入时刻，不带进度 |
| GET | `/api/v1/yunqi/current` | 六气边界节气及当前气进度 |
| POST | `/api/v1/yunqi/calculate` | 同上，进度相对提交的输入时刻 |
| GET | `/api/v1/yunqi/learning/current` | facts带当前气进度，另带运关系、运边界标签及当前运进度 |
| POST | `/api/v1/yunqi/learning/calculate` | 同上，进度相对提交的输入时刻 |
| POST | `/api/v1/yunqi/learning/birth-comparison` | current与各候选learning均复用完整教学结构 |
| GET | `/api/v1/constitution/questionnaire` | 无变化 |
| POST | `/api/v1/constitution/assess` | 无变化 |

成功信封及400/500/503错误结构、路径、method、operationId、请求语法、支持年份范围和时间语义保持。
`GET /health`不在业务冻结投影中，仍受全量OpenAPI生成漂移检查。

## 新增字段与schema

以下字段全部required；所有新增对象及扩展对象均为`additionalProperties: false`。

| DTO / schema | 新增字段或取值 | 含义 |
| --- | --- | --- |
| `SixQiBoundaryTerm` | 大寒、春分、小满、大暑、秋分、小雪 | 独立闭合六值枚举；不包含仅供五运交运使用的芒种、处暑、立冬 |
| `SixQiStepDto` | `startTerm`、`endTerm`，引用`SixQiBoundaryTerm` | 本步的起止边界节气，终之气的endTerm为次年大寒 |
| `StageProgressDto` | `elapsedRatio`: number，minimum 0，exclusiveMaximum 1 | 当前阶段已过时长比例，Domain保留三位小数，末端封顶0.999；区间左闭右开 |
| `StageProgressDto` | `remainingCalendarDays`: integer，minimum 0 | 固定北京时间的结束日期减输入日期，不按剩余小时数折算 |
| `StageProgressDto` | `endsOnInputDate`: boolean | 是否在输入当天结束；为true时仍可能尚未到交气/交运钟点 |
| `YunQiCalculationDto` | `currentStepProgress`: `StageProgressDto` | 含输入时刻的当前气进度；`YunQiYearDto`没有此字段 |
| `MovementRelationDto` | `elementRelation`、`direction`、`traditionalLabel` | 枚举与`HostGuestRelationDto`对应字段平行；不含qiRelation |
| `MovementStepDto` | `relation`: `MovementRelationDto`；`startLabel`、`endLabel`: string | 五步均带主客运关系和教学交运边界文字 |
| `YunQiLearningDto` | `currentMovementProgress`: `StageProgressDto` | 含输入时刻的当前运进度 |

`elementRelation`为`SAME_ELEMENT`或`DIFFERENT_ELEMENT`；`direction`为`NONE`、
`HOST_GENERATES_GUEST`、`GUEST_GENERATES_HOST`、`HOST_CONTROLS_GUEST`、`GUEST_CONTROLS_HOST`。
五运标签按方向分别为“相得 · 主生客 / 相得 · 客生主 / 逆 · 主胜客 / 顺 · 客胜主”；
同五行太少不同为“同属{element}运 · 太少不同”，太少相同为“同属{element}运 · 太少相同”，均为中性。
教学规则 1.3.0 采用 2026-11-19 专家确认的太少相同标签。`traditionalLabel`和`ruleVersion`继续使用string，沿用现有契约结构和冻结基线。
五步运交运口径仍待专家确认。
标签只描述运气结构，“相违”只是界面颜色语气，不是风险等级，不推导吉凶、疾病或治疗结论。
运边界标签依次为“大寒、春分后13日、芒种后10日、处暑后7日、立冬后4日、大寒”；时间事实以start/end为准。

## 输入时刻与出生候选

进度始终相对本次计算的`facts.input`（核心计算为`input`），不会随墙上时钟自动变化。
`currentStepProgress`不仅出现在calculate/current，也随learning及出生对照的`facts`出现。
出生对照`current`的进度相对本次请求的当前快照；每个候选`learning`的两个进度相对该候选的输入取样时刻。
精确出生时刻候选的输入就是所填时刻；时刻不详候选的取样点为该候选区间起点，仅为结构复用，
不能把该进度理解为当下进度或已知出生时刻。既有from/until、左闭右开候选及no-store语义不变。

UI直接显示API `localTime`。余日大于0时可显示“还有N天”；余日为0时可从end.localTime截取HH:mm显示“今日HH:mm交气/交运”。
消费方无需自行推导日期差、节气边界或生克关系。

金标输入`2026-11-18T08:44:00+08:00`：五之气秋分→小雪，
`currentStepProgress = {elapsedRatio: 0.929, remainingCalendarDays: 4, endsOnInputDate: false}`；
终运立冬后4日→大寒，主水太羽、客金少商，关系为“相得 · 客生主”，当前运余63日、比例0.095。

## 包版本与迁移

| 包 | 旧版本 | 新版本 | 原因 |
| --- | --- | --- | --- |
| `@yunqi/service` | 2.2.0 | 2.3.0 | 追加阶段事实必填字段与新契约 |
| `@yunqi/contracts` | 1.2.0 | 1.3.0 | 同步生成类型、公共facade及freeze |
| `@yunqi/client` | 1.2.0 | 1.3.0 | 随契约升minor；transport、端点和方法签名无代码变化 |

依赖Domain 1.4.0（E1），不在本卡更改Domain。运气语义不变，旧字段原样保留。
新增字段采用SemVer minor；对响应进行闭合校验的消费方须升级schema与类型后再消费1.3.0，
模拟响应的fixture也须补齐required字段。Contract ID精确检查应切换到`YQ-API-CONTRACT-1.3.0`。

learning系列（含出生对照顶层、current及候选learning）的当前`ruleVersion`为
`YQ-LEARNING-RULES-1.3.0`。契约1.3.0最初引入阶段事实时由教学规则1.0.0升级到1.1.0，E4升级到1.2.0，E5升级到1.3.0。
facts的核心ruleVersion保持不变，契约1.3.0结构及冻结基线不变。
做精确版本检查或按版本缓存的消费方须显式处理新教学版本，保留历史来源，不把旧结果重标为新规则。
当前标签依据见[教学规则1.3](../../rules/LEARNING_RULES_V1_3.md)，阶段事实定义仍见[历史教学规则1.1](../../rules/LEARNING_RULES_V1_1.md)。工程冻结和测试通过均不能替代专家或临床验收。
