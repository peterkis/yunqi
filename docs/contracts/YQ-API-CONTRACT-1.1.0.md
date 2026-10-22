# YQ-API-CONTRACT-1.1.0

- 日期：2026-10-18
- 状态：工程契约冻结；专家规则状态仍为待正式冻结
- API path：`/api/v1`；OpenAPI dialect：`3.1.0`
- OpenAPI document：`1.3.0`
- 规则版本：`YQ-MVP-RULES-1.1.0`
- 机器基线：`packages/yunqi-contracts/contract/YQ-API-CONTRACT-1.1.0.freeze.json`
- 历史基线：`YQ-API-CONTRACT-1.0.0`，原文件和注册记录保留

## 变更依据

用户于2026-10-18明确选择以原始 Word 确认单为目标，完成必要的规则和契约升级，
专家状态仍保留待冻结。文件名为“中医五运六气第一阶段规则共识确认单_V1.0-2026.7.7.docx”，
正文版本为V1.1。只采用已明确的 R-08 查询范围和 R-21 客生主描述。
固定北京时间、领域隔离、只读展示和医疗边界继续遵守当前 ADR/AGENTS。

规则说明见 [1.1.0实现基线](../../rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md)。
原始Word、原始规格包、旧规则表和旧冻结文件不因本次升级被改写。

## 冻结范围与差异

三个业务端点保持：

```text
GET /api/v1/yunqi/year/{year}
GET /api/v1/yunqi/current
POST /api/v1/yunqi/calculate
```

相对 [1.0.0契约](YQ-API-CONTRACT-1.0.0.md)，冻结投影仅改变：

1. Contract ID：1.0.0 → 1.1.0。
2. OpenAPI document version：1.2.0 → 1.3.0。
3. 年度path参数，以及 `YunQiYearDto.year`、`YunQiCalculationDto.year`：
   minimum 1901 → 1900，maximum 2099 → 2100。

路径、method、operationId、成功和失败状态码、字段结构、required、枚举、
additionalProperties、时间输入语法和其他校验约束均保持不变。
`GET /health`仍在业务冻结投影之外，继续接受全量OpenAPI生成漂移检查。

响应中的 `ruleVersion` 改为 `YQ-MVP-RULES-1.1.0`。
`GUEST_GENERATES_HOST` 的 `traditionalLabel` 改为“客生主，相得”。
这两个字段在schema中仍为字符串；结构化关系枚举及方向判定不变。
传统标签属于解释文本，不能被解释为疾病因果或治疗建议。

## 时间边界

范围是包含1900和2100的**运气年**，不是公历1900年1月1日至2100年12月31日。
计算与当前状态端点接受的区间为：

```text
[1900年大寒实际交节时刻, 2101年大寒实际交节时刻)
```

1900大寒之前归1899运气年，返回400 `INVALID_ARGUMENT`；
1900大寒当刻进入1900运气年并成功。
2101大寒之前仍归2100运气年并成功；2101大寒当刻进入2101运气年并返回400。
所有输入先经Service time-normalizer归一化为固定北京时间UTC+08的CalendarTime。
使用无后缀、`+08:00`、等价`Z`输入时，归属和支持范围一致。

## 包版本与迁移

| 包 | 旧版本 | 新版本 | 理由 |
| --- | --- | --- | --- |
| `@yunqi/domain` | 1.1.0 | 1.2.0 | 新规则版本与解释标签；公共结构及计算分类不变 |
| `@yunqi/service` | 2.0.0 | 2.1.0 | 扩大可接受年度，保留既有合法请求的结构与状态码 |
| `@yunqi/contracts` | 1.0.0 | 1.1.0 | 生成约束更新及新Contract ID；DTO形状不变 |
| `@yunqi/client` | 1.0.0 | 1.1.0 | 同步消费新契约；transport和方法签名不变 |

按新增可接受请求范围采用minor版本。已有1901–2099业务输入继续可用，
结构化计算结果保持相同；规则版本和R-21说明文字有明确的可观察变化。
消费方须同步更新Contract ID检查、1901/2099范围限制、精确文案断言和缓存。
若消费方把旧响应的year限制硬编码为1901–2099，必须先更新再请求新增年份。
若按`ruleVersion`持久化或缓存结果，应保留历史版本，避免将旧结果标为新规则。
API路径仍为v1；不会同时提供两个可切换规则引擎。

## 检查

生成OpenAPI和类型后，为新ID追加冻结文件与registry记录。
`contracts:check`继续核对所有历史基线，不能借升级覆盖旧文件。
契约治理测试将新冻结投影与旧投影按上述三项差异比较，防止无关schema漂移。
规则一致性、201年边界、真实API、类型、覆盖率和浏览器验收结果见
[本次验收报告](../superpowers/verification/2026-10-18-word-rule-upgrade.md)。

工程检查通过不改变 `rules/RULE_FREEZE_NOTE.md` 的状态。
专家签认、节气天文准确性独立评估和真实临床验证仍需各自证据。
