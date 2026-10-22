# Phase3-B React Workbench 基础架构实施 Prompt

## 目标

基于 Phase3-A Contract Freeze，建设 React Workbench 基础架构。

冻结条件：

-   API: /api/v1
-   Contract ID: YQ-API-CONTRACT-1.0.0
-   OpenAPI: 1.2.0
-   Rule: YQ-MVP-RULES-1.0.0
-   @yunqi/contracts@1.0.0
-   @yunqi/client@1.0.0

本阶段只建设前端基础设施，不实现业务页面。

------------------------------------------------------------------------

## 依赖方向

必须：

    React
     |
     v
    @yunqi/client
     |
     v
    @yunqi/contracts

禁止：

    React -> @yunqi/service
    React -> @yunqi/domain

------------------------------------------------------------------------

## Contract 使用

所有 DTO 必须来自：

``` ts
@yunqi/contracts
```

禁止：

-   React 自定义 YunQi DTO
-   复制 OpenAPI 类型
-   修改 wire contract

示例：

``` ts
import type {
 YunQiTimeDto,
 YunQiCalculationInputTimeDto
} from "@yunqi/contracts";
```

------------------------------------------------------------------------

## Client 使用

所有 HTTP 调用必须通过：

``` ts
import { yunqiClient } from "@yunqi/client";
```

禁止：

-   组件直接 fetch API
-   组件直接调用 Axios
-   依赖 Service runtime

------------------------------------------------------------------------

## 时间语义约束

统一：

    BeijingStandardTime+08:00

展示：

``` ts
result.input.localTime
```

禁止：

``` ts
new Date(result.epochMilliseconds)
```

禁止：

-   Date
-   Temporal
-   Intl.DateTimeFormat
-   IANA timezone
-   browser local timezone
-   toISOString

重新解释 YunQi 时间。

------------------------------------------------------------------------

## 应用结构

建议：

    apps/yunqi-workbench

    src/

    app/
    components/
    features/
    hooks/
    providers/
    services/

基础能力：

-   Layout
-   Navigation
-   Query Provider
-   Error Boundary
-   Theme Provider
-   Client Provider

------------------------------------------------------------------------

## 数据层

采用：

TanStack Query（如项目技术栈允许）

结构：

    features/yunqi/

    api/
    hooks/
    components/

组件不得直接请求 API。

------------------------------------------------------------------------

## 时间组件

新增：

    YunQiTimeDisplay

输入：

``` ts
YunQiTimeDto
```

直接展示：

    北京时间 UTC+08

不得通过 epoch 二次转换。

------------------------------------------------------------------------

## 测试

增加：

### Contract 测试

验证：

-   client 可调用
-   contracts 类型正确

### 时间治理测试

扫描：

    apps/yunqi-workbench/src

禁止：

    Date
    Temporal
    Intl
    IANA
    Asia/Shanghai

### UI测试

覆盖：

-   Loading
-   Error
-   Empty
-   Success

------------------------------------------------------------------------

## CI

必须保持：

    quality-gates

执行：

    pnpm contracts:check
    pnpm test:time-governance
    pnpm typecheck
    pnpm test

------------------------------------------------------------------------

## Definition of Done

-   [ ] React Workbench 创建
-   [ ] 只依赖 client/contracts
-   [ ] 无 Service/Domain 依赖
-   [ ] DTO 全部来自 contracts
-   [ ] API 全部通过 client
-   [ ] 时间语义符合北京时间规范
-   [ ] 无 Date/Temporal/IANA 泄漏
-   [ ] Query 层建立
-   [ ] Error Boundary 建立
-   [ ] CI 全绿

------------------------------------------------------------------------

## 最终原则

React 是 YunQi 契约消费者，不是规则实现者。

UI 展示计算结果，但不重新计算结果。
