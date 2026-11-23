# YunQi API Contract 1.4.0

2026-11-23。OpenAPI 文档 1.6.0，Service 2.4.0，历法适配器 1.2.0，Contracts 与 Client 1.4.0。核心规则 1.1.0 与教学规则 1.3.0 继续生效。由 [1.3.0](YQ-API-CONTRACT-1.3.0.md) 增量扩展，旧端点和可达 schema 保留原结构。精确比对契约 ID 的消费者应同步升级。

| POST 路径（相对 `/api/v1/yunqi/learning`） | 请求 | 成功响应 data |
| --- | --- | --- |
| `birth-date-preview` | 公历 `year`、`calendar: solar / lunar`、`month`、`day`；农历可指定布尔 `leap` | `matches` 按公历时间排序，每项带公历日期、农历回显及闰月标识、候选年度标签和实际交界时刻 |
| `birth-year-comparison` | `year`（1900–2100 范围内已开始的公历年） | `birthPrecision: year`、本次 `current`、说明、年度候选。每项有可计算区间、干支、岁运、司天、在泉、三项与当下的关系和年度原文 |

公历出生年与农历月日可以混合输入。适配器按该公历年的起止日期寻找所有对应农历月日；省略 leap 时同时检查普通月与闰月。无匹配、整日尚未发生或早于可计算范围返回空 matches。非法公历日期、未来年份及无效参数按现有 400 信封返回。普通日期的 boundaries 为空；年、气、运在同一时刻切换时分别标注。

年度候选范围是公历年与有效运气年以及已发生时间的交集，起点包含，终点不包含。当年截止于 now 的下一毫秒。最低支持年份的范围从 1900 年实际大寒起，日精度在该交界日也只返回可计算时段。时间戳统一经 time-normalizer 输出。日期精确到日或时刻的正式对照仍使用原 birth-comparison。

两个操作沿用内存处理、no-store、现有错误信封和契约生成冻结机制。出生资料通过 POST 请求体传输。桌面传输层允许对应的两个 POST，复用同一 Service/Client。
