# 五运六气规则规格包 V1.0

本压缩包用于将 PRD 转换为可开发、可测试的五运六气规则规格。

## 文件说明

- `五运六气规则规格说明书_V1.0.md`：主说明书
- `rules/yunqi-mvp-rules.v1.json`：机器可读规则常量
- `fixtures/sexagenary-cycle-baseline.v1.json`：60 甲子完整基线
- `fixtures/sexagenary-cycle-baseline.v1.csv`：便于中医专家审核的表格
- `fixtures/mvp-test-cases.v1.json`：年份、日期、边界测试样例
- `schemas/yunqi-result.v1.schema.json`：推荐输出 JSON Schema
- `reference/yunqi-reference.ts`：不含节气算法的 TypeScript 参考实现
- `专家审核清单.md`：规则冻结前的审核清单

## 建议使用顺序

1. 中医专家先审核主说明书和 CSV；
2. 根据审核意见修改 JSON 规则；
3. 将 JSON 基线转成 Vitest 单元测试；
4. 实现 `CalendarProvider`；
5. 通过全部测试后再开发 React 页面。

## 重要状态

MVP 基础规则已形成可开发规格，但仍标记为 `DRAFT_FOR_EXPERT_REVIEW`。  
二期天符、岁会、主运交司等规则仅为候选设计，必须逐项审核。
