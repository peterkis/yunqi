# YQ-API-CONTRACT-1.2.0

- 日期：2026-11-16；OpenAPI 3.1.0；文档版本1.4.0；API路径仍为 `/api/v1`。
- 核心规则 `YQ-MVP-RULES-1.1.0`；新增教学规则 `YQ-LEARNING-RULES-1.0.0` 和量表 `YQ-CONSTITUTION-1.0.0`。
- 原有1.0.0、1.1.0冻结文件及注册记录保留。工程冻结不等于专家或临床认可。

## 范围与兼容性

原有年、当前、指定时点三个端点和所有原有schema保持不变。追加：

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/api/v1/yunqi/learning/current` | 同一次计算的当前事实＋年度/当步关系、五步运、匹配原文 |
| POST | `/api/v1/yunqi/learning/calculate` | 既有CalculateRequest语法的教学计算 |
| POST | `/api/v1/yunqi/learning/birth-comparison` | 公历生日和可选时分秒，与请求时当前运气对照 |
| GET | `/api/v1/constitution/questionnaire` | 固定版次完整量表、适用性别、选项、分量表映射 |
| POST | `/api/v1/constitution/assess` | 完整合法作答的九质评分及兼夹结果 |

新端点均加入契约冻结投影；任一端点或可达schema漂移均需新Contract ID，不只检查生成文件。所有关系的sources是可显示的标题和链接，sourceIds用于追溯。所有业务时间复用唯一YunQiTimeDto。

## 出生请求

`{birthDate: "YYYY-MM-DD", birthTime?: "HH:mm:ss"}`。日期必须真实存在、在支持范围内且不在未来；采用固定北京时间。省略时刻时不默认认定出生在零时，返回当日全部候选区间。候选含from/until、对应教学结果及同维度比较；ambiguous明确提示交界。精确时刻的from=until，表示点输入，不解释为时间段。

结果中的current是本次请求时点的快照，input.localTime可核对。未知时刻候选里的内部取样input不能当出生时间展示。生日只在POST body中传输，响应no-store，不持久化、不关联患者身份。

## 量表请求与结果

问卷id及request.questionnaireId固定为 `GBT46939-2025`；sex只能male/female。answers为适用问题ID到JSON整数1–5的映射；共27题，任一性别实际答26题。必须全答且不包含未知题或另一性别题；字符串数字、布尔、数组、越界值均拒绝。

结果返回9行原始分、条目数、未舍入转换分、是/倾向是/基本是/否，及多个匹配类型。平和质结合其他八类阈值判断；结果不回显原始答案。具体正式来源及算法见[量表规则](../../rules/CONSTITUTION-GBT46939-2025.md)。无数据库、答卷保存或疾病预测端点。

## 版本与迁移

Domain1.3.0、Service2.2.0、Contracts1.2.0、Client1.2.0。既有客户端方法继续工作；实现或模拟YunQiClient接口的消费方须补充5个新方法。组件经presentation mapper消费服务端事实，不在UI重复推演或评分。

本次新增SolarTerm的芒种、处暑、立冬用于教学交运；现有六气边界定义不变。自定义历法provider需支持这些新节气才能调用教学端点；只调用原三个端点的行为保持。
