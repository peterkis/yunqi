# 数据结构设计

## 设计原则

规则计算结果需要保存快照。

原因：

规则未来可能升级。

历史病例必须可以复现当时结果。

------------------------------------------------------------------------

## yunqi_rule_version

保存规则版本。

字段：

id version status created_at approved_at

------------------------------------------------------------------------

## yunqi_snapshot

保存一次计算结果。

字段：

id input_datetime yunqi_year ganzhi suiyun_json sixqi_json rule_version

------------------------------------------------------------------------

## intake_record

问诊记录。

字段：

id record_type visit_date onset_date answers_json yunqi_snapshot_id

------------------------------------------------------------------------

## clue_record

线索结果。

字段：

id record_id category content rule_version
