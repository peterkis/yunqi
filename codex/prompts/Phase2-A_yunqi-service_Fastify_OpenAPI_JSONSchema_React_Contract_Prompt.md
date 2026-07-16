# Phase2-A：yunqi-service（Fastify + OpenAPI + JSON Schema + React 工作台契约层）完整开发 Prompt

## 目标

基于已通过 Phase1 验收的 `packages/yunqi-domain`，建设 Phase2-A
服务契约层：

-   Fastify 服务层
-   OpenAPI 3.1 API 文档
-   JSON Schema 数据契约
-   React 工作台消费契约
-   Domain 到 API 的安全映射层

目标不是实现完整业务系统，而是建立稳定、可演进、可测试的服务边界。

------------------------------------------------------------------------

# 总体开发原则 Prompt

你是一名负责医疗级领域系统架构的高级 TypeScript 架构师。

请基于当前仓库 `peterkis/yunqi` 的 Phase1 成果继续开发。

必须遵守：

1.  不修改 `packages/yunqi-domain` 的核心计算逻辑。
2.  不把 Fastify、HTTP、JSON Schema、React 类型污染 Domain 层。
3.  Domain 永远保持纯函数领域包。
4.  所有外部输入必须经过 Schema 校验。
5.  所有 API 输出必须稳定、版本化。
6.  所有契约必须可以被 React 工作台直接消费。

------------------------------------------------------------------------

# Phase2-A 目录设计 Prompt

新增：

    packages/
    ├── yunqi-domain/
    └── yunqi-service/
        ├── src/
        │   ├── app.ts
        │   ├── server.ts
        │   ├── routes/
        │   ├── schemas/
        │   ├── mappers/
        │   ├── plugins/
        │   └── contracts/
        ├── openapi/
        ├── tests/
        └── package.json

要求：

-   domain 不依赖 service
-   service 单向依赖 domain

依赖方向：

    React
     |
    HTTP JSON
     |
    yunqi-service
     |
    yunqi-domain

------------------------------------------------------------------------

# Fastify 服务层 Prompt

实现 Fastify 服务：

技术要求：

-   Fastify 5
-   TypeScript strict mode
-   @fastify/swagger
-   @fastify/swagger-ui
-   JSON Schema validation

提供：

    GET /health

    GET /api/v1/yunqi/year/:year

    GET /api/v1/yunqi/current

    POST /api/v1/yunqi/calculate

------------------------------------------------------------------------

# API 设计要求

## GET /api/v1/yunqi/year/:year

输入：

``` json
{
  "year": 2024
}
```

输出：

``` json
{
  "ruleVersion": "V1.0",
  "year": 2024,
  "stemBranch": {},
  "suiYun": {},
  "sixQi": {},
  "explanations": []
}
```

要求：

-   保持 domain 返回事实结构
-   不增加医学解释
-   不增加预测内容

------------------------------------------------------------------------

# JSON Schema Prompt

所有 API 必须拥有 JSON Schema。

要求：

-   请求 schema
-   response schema
-   error schema

统一：

``` json
{
  "code": "SUCCESS",
  "message": "",
  "data": {}
}
```

错误：

``` json
{
  "code": "INVALID_ARGUMENT",
  "message": "",
  "details": {}
}
```

------------------------------------------------------------------------

# OpenAPI Prompt

生成：

    openapi/yunqi-service.openapi.yaml

要求：

OpenAPI 3.1。

必须包含：

-   paths
-   schemas
-   examples
-   error responses
-   version metadata

支持：

-   Swagger UI
-   React 自动生成 client

------------------------------------------------------------------------

# React 工作台契约 Prompt

不要开发完整 React 页面。

只设计消费契约。

新增：

    contracts/
    ├── yunqi-api.ts
    ├── yunqi-types.ts
    └── generated-client.ts

要求：

支持：

-   TanStack Query
-   Axios/fetch
-   自动类型推导

示例：

``` ts
const result = await yunqiClient.getYear(2024)
```

------------------------------------------------------------------------

# Mapper 层 Prompt

禁止：

Controller 直接返回 Domain 对象。

必须：

    Domain Result
          |
          v
    Mapper
          |
          v
    API DTO

原因：

避免：

-   Domain 演进影响 API
-   前端绑定内部结构

------------------------------------------------------------------------

# 测试要求 Prompt

必须增加：

## API 测试

覆盖：

-   正常年份
-   非整数年份
-   超范围年份
-   Provider 异常

## Contract 测试

验证：

-   OpenAPI schema 与实际响应一致
-   JSON Schema 校验通过

## Boundary 测试

验证：

-   domain error 转 HTTP error
-   RangeError 转 400

------------------------------------------------------------------------

# 安全边界 Prompt

禁止：

API 返回：

-   诊断
-   疾病判断
-   治疗建议
-   个体预测

允许：

-   时间事实
-   规则映射
-   历法计算结果

------------------------------------------------------------------------

# CI 验收标准 Prompt

完成后必须通过：

    npm test

    npm run typecheck

    npm run build

    npm run test:coverage

新增：

    openapi validation
    schema validation

------------------------------------------------------------------------

# Phase2-A 完成定义 Definition of Done

必须满足：

-   [ ] yunqi-service 独立 package
-   [ ] Fastify 服务启动成功
-   [ ] OpenAPI 生成成功
-   [ ] JSON Schema 完整
-   [ ] React 契约稳定
-   [ ] Domain 无侵入
-   [ ] API 测试覆盖
-   [ ] CI 全绿

最终交付：

Phase2-A = "领域能力服务化，但不进入业务应用层"
