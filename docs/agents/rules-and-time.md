# 规则、领域与时间

修改Domain、calendar adapter、时间解析/展示或设计持久化前读取本页。
规则源为 [YQ-MVP-RULES-1.1.0](../../rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md)；
状态为[待正式冻结](../../rules/RULE_FREEZE_NOTE.md)。时间语义以
[ADR-001](../architecture/adr/ADR-001-fixed-beijing-time-semantics.md)为长期依据。

## 领域所有权

`packages/yunqi-domain` 只使用TypeScript、纯函数、不可变领域对象及版本化规则。
保持可独立测试、运行和发布。禁止依赖React/Vue、Fastify/Express、数据库/ORM、
UI库、浏览器API及Contracts/Client。Service和adapter也不得反向依赖Contracts/Client。

规则文件 → Domain → 结构化结果 → 展示。禁止在UI写规则、让大模型生成计算结果，
或从自然语言/网络资料临时推断和更换规则。每次规则变更同时更新版本、说明、测试、
原因及专家审核状态；不能直接改常量而绕过版本流程。

## 五运六气

十干化运、太过/不及、五音、年支司天在泉、主气与客气次序只维护于规则源。
甲己土、乙庚金、丙辛水、丁壬木、戊癸火；阳干甲丙戊庚壬太过，阴干乙丁己辛癸不及。
六气须保留厥阴风木、少阴君火、太阴湿土、少阳相火、阳明燥金、太阳寒水全称。
少阴君火与少阳相火均属火但不是同一六气，不能合称“火气”代替。

客主关系分别表达六气关系、五行关系及方向，不能压成good/bad。
同气、同五行但不同气、主生客/客生主、主胜客/客胜主的判定以规则表为准；
“相得”“主胜客，逆”“客胜主，从”只能作解释，不含吉凶、疾病或治疗结论。
当前客生主传统描述为“客生主，相得”，方向枚举仍独立保存。

## 固定时间语义

- 标准为固定UTC+08:00，字面量 `BeijingStandardTime+08:00`；不采用IANA
  `Asia/Shanghai`历史规则、1986–1991夏令时、DST或服务器/浏览器本地时区。
- `YunQiCalendarTime` 的本地公历字段是权威。领域内禁止Date；各业务层不得通过
  Date、Temporal、Intl、locale/ISO格式化重新解释运气时间。
- `YunQiInstant` 的规范定义为 `BeijingStandardTime+08:00 Absolute Representation`，
  不是civil timezone instant。epochMilliseconds只作排序、传输、持久化、审计、兼容及
  一致性检查；不得经UTC/IANA/DST重新解释后成为判年、判步或展示日历含义的唯一来源。
- 运气年从当年大寒实际交节时刻开始，至次年大寒前结束，左闭右开；春节、立春、
  固定日期或当天零时均不能替代交节。各步也按实际节气边界唯一归属。
- CalendarProvider只提供节气瞬间，不决定运气年、六步归属、开闭边界及五运/六气/客主规则。

## 服务与前端时间

所有API业务时间解析、归一化、格式化通过
[time-normalizer](../../packages/yunqi-service/src/modules/time-normalizer/index.ts)。
Controller、route、DTO mapper和serializer不得自行创建Date、调用Date.parse/toISOString，
或使用Temporal/Intl/IANA转换。系统时钟只提供epoch，立即转CalendarTime，再调用
`calculateYunQiByCalendarTime()`。

React组件、hook、selector、mapper、serializer和formatter直接使用API规范localTime，
或只处理固定北京时间字段/字符串的专用formatter；标注“北京时间 UTC+08”。
不得用`new Date(result.epochMilliseconds)`等方式重建展示时间。前端epoch仅可作排序、缓存键、审计和兼容。

## 未来持久化合同

持久化仍需独立授权；设计时不依赖数据库连接、会话或服务器时区重建业务语义。

最小字段冻结为：

```text
calendar_time_local varchar
epoch_ms bigint
offset char(6)
calendar_time_standard varchar
```

calendar_time_local保存规范固定北京时间，如2026-06-19T12:00:00+08:00；
epoch_ms只作绝对表示辅助；offset必须+08:00；calendar_time_standard必须BeijingStandardTime+08:00。

timestamptz/timestamp with time zone只能作派生查询辅助，不能是唯一、权威或重建必需字段。

## 必须核验

60甲子的干支、岁运、司天和在泉；大寒前/当刻/后；第三客气=司天、第六客气=在泉。
属性检查覆盖固定6步、连续、无重叠、任意有效输入唯一归属。
当前对外范围为1900–2100运气年，即 `[1900大寒, 2101大寒)`；相邻年内部节气不是额外业务范围。
`pnpm test:rule-consistency` 和 `pnpm test:time-governance` 是相关入口。
计算边界与适配器一致不等于独立证明节气天文准确性或专家参考答案。
