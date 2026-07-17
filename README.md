# TCM YunQi Lab

## 项目简介

中医五运六气与问诊结构化原型系统。

项目目标： - 五运六气规则推算； - 中医问诊结构化； - 教学复盘； -
专家规则审核。

本项目不是自动诊断、自动开方或医疗决策系统。

## 当前版本

V1.0 MVP

已冻结： - 第一阶段五运六气基础规则； - 问诊关联边界； - 医疗安全边界。

## Workspace packages

- `@yunqi/domain`: deterministic YunQi rules and authoritative calendar-time
  calculation;
- `@yunqi/calendar-adapter-tyme4ts`: solar-term adapter;
- `@yunqi/service`: Fastify runtime and OpenAPI schema source;
- `@yunqi/contracts`: generated, browser-safe public DTO facade;
- `@yunqi/client`: Fetch/Axios-structural typed browser client.

The Phase3 business API is frozen as `YQ-API-CONTRACT-1.0.0`. React consumers
must import DTOs from `@yunqi/contracts` and client behavior from
`@yunqi/client`; they must not duplicate API DTOs.

Key gates:

    pnpm contracts:check
    pnpm test:time-governance
    pnpm test
    pnpm typecheck
    pnpm test:coverage
