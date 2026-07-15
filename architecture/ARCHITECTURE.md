# 技术架构说明

## 总体

React Web \| OpenAPI REST \| Fastify API \| Application Layer \|
yunqi-domain \| Calendar Adapter

## 原则

核心规则纯函数化。

禁止： - UI直接计算五运六气； - 数据库直接修改核心算法； -
大模型参与规则计算。

## 测试

需要覆盖： - 60甲子； - 1900-2100范围； - 大寒边界； - 六步边界； -
司天在泉校验。
