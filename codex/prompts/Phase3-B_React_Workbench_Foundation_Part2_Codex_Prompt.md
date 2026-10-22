# Phase3-B React Workbench 基础架构实施 Prompt（第二部分）

## 目标

基于 Phase3-B 技术选型：

-   React 19
-   Vite 8
-   TypeScript
-   TanStack Query v5
-   Vitest
-   Testing Library

建设完整 Workbench 基础设施。

本阶段不实现：

-   五运六气业务页面
-   问诊流程
-   专家审核流程
-   规则管理页面

只建设：

-   应用骨架
-   Provider体系
-   Client集成
-   Query数据层
-   测试体系
-   CI治理

------------------------------------------------------------------------

# 一、目录结构设计

新增：

    apps/yunqi-workbench/

    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    │
    └── src/

        ├── main.tsx
        ├── app/
        │   ├── App.tsx
        │   └── routes.ts
        │
        ├── providers/
        │   ├── AppProviders.tsx
        │   ├── QueryProvider.tsx
        │   ├── ThemeProvider.tsx
        │   ├── YunQiClientProvider.tsx
        │   └── ErrorBoundaryProvider.tsx
        │
        ├── components/
        │   ├── layout/
        │   ├── feedback/
        │   └── time/
        │
        ├── features/
        │   └── yunqi/
        │       ├── api/
        │       ├── hooks/
        │       ├── components/
        │       └── types/
        │
        ├── hooks/
        ├── lib/
        ├── styles/
        └── test/

------------------------------------------------------------------------

# 二、Provider 架构

统一入口：

    main.tsx

    <AppProviders>

        ErrorBoundary

            |
        ThemeProvider

            |
        QueryProvider

            |
        YunQiClientProvider

            |
        App

    </AppProviders>

------------------------------------------------------------------------

# 三、QueryProvider设计

使用：

    @tanstack/react-query v5

要求：

创建：

    providers/QueryProvider.tsx

配置：

-   staleTime
-   retry策略
-   error处理
-   query cache

示例：

``` ts
new QueryClient({
 defaultOptions:{
   queries:{
     retry:false
   }
 }
})
```

不要在组件中创建 QueryClient。

------------------------------------------------------------------------

# 四、YunQiClientProvider

职责：

管理：

    @yunqi/client

实例。

禁止：

组件直接：

``` ts
createClient()
```

------------------------------------------------------------------------

设计：

    YunQiClientProvider

        |
        |
     YunQiClientContext

        |
        |
     useYunQiClient()

------------------------------------------------------------------------

未来支持：

-   token
-   baseURL
-   tenant

------------------------------------------------------------------------

# 五、Error Boundary

新增：

    providers/ErrorBoundaryProvider.tsx

负责：

-   React runtime error
-   API异常展示
-   fallback UI

禁止：

显示：

-   stack trace
-   backend exception

------------------------------------------------------------------------

# 六、Workbench Shell

只建设基础：

    AppShell

    ├── Header
    ├── Navigation
    └── Main Content

不引入：

React Router。

Navigation：

只提供：

-   首页入口
-   占位菜单

------------------------------------------------------------------------

# 七、Feature目录规范

业务模块必须：

    features/

    yunqi/

    ├── api

        client调用封装


    ├── hooks

        TanStack Query hooks


    ├── components

        UI组件


    └── types

        feature内部类型

------------------------------------------------------------------------

禁止：

组件直接：

``` ts
yunqiClient.getYear()
```

正确：

    component

    ↓

    hook

    ↓

    client

    ↓

    contracts

------------------------------------------------------------------------

# 八、Query Hook规范

示例：

    features/yunqi/hooks/

    useYunQiYearQuery.ts

使用：

``` ts
useQuery(
 yunqiClient.getYearQueryOptions(year)
)
```

禁止：

手写：

``` ts
fetch()
```

------------------------------------------------------------------------

# 九、时间展示组件

新增：

    components/time/

    YunQiTimeDisplay.tsx

输入：

``` ts
YunQiTimeDto
```

显示：

    2026-01-01 12:00:00
    北京时间 UTC+08

禁止：

``` ts
new Date(epochMilliseconds)
```

禁止：

任何：

-   timezone转换
-   locale格式化

------------------------------------------------------------------------

# 十、测试体系

## 测试工具

采用：

-   Vitest
-   Testing Library
-   jsdom

------------------------------------------------------------------------

# 十一、组件测试要求

至少：

## App Shell

验证：

-   渲染成功

## Provider

验证：

-   QueryProvider正常

## ErrorBoundary

验证：

-   错误fallback

## TimeDisplay

验证：

-   localTime直接展示

------------------------------------------------------------------------

# 十二、Contract测试

验证：

React只能：

    @y​unqi/contracts

获取类型。

禁止：

    @y​unqi/service

------------------------------------------------------------------------

# 十三、时间治理测试

新增：

扫描：

    apps/yunqi-workbench/src

禁止：

    Date(
    Date.parse
    new Date
    Temporal
    Intl.DateTimeFormat
    Asia/Shanghai
    toISOString

------------------------------------------------------------------------

允许：

    result.input.localTime

------------------------------------------------------------------------

# 十四、CI集成

加入：

GitHub Actions:

    quality-gates

执行：

    pnpm contracts:check

    pnpm test:time-governance

    pnpm typecheck

    pnpm test

    pnpm test:coverage

------------------------------------------------------------------------

# 十五、依赖检查

CI必须验证：

允许：

    yunqi-workbench

     -> @yunqi/client

     -> @yunqi/contracts

禁止：

    yunqi-workbench

     -> @yunqi/service

    yunqi-workbench

     -> @yunqi/domain

------------------------------------------------------------------------

# 十六、Definition of Done

完成：

-   [ ] apps/yunqi-workbench 创建
-   [ ] React 19 + Vite运行成功
-   [ ] Provider体系完成
-   [ ] TanStack Query接入
-   [ ] client provider完成
-   [ ] Error Boundary完成
-   [ ] Shell布局完成
-   [ ] 无React Router
-   [ ] 无业务页面
-   [ ] DTO全部来自contracts
-   [ ] API全部来自client
-   [ ] 时间治理通过
-   [ ] 测试通过
-   [ ] CI通过

------------------------------------------------------------------------

# 最终原则

> Workbench 是契约消费者，不是业务规则实现者。

> React负责展示和交互，不负责计算五运六气。

> 所有领域事实来自 @yunqi/contracts 和 @yunqi/client。
