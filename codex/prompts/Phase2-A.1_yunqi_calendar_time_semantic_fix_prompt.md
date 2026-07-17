# Phase2-A.1 修正任务：YunQiCalendarTime 北京时间历法语义增强

## 背景

当前 Phase2-A 已完成 Fastify、TypeBox、OpenAPI 3.1、JSON Schema、DTO
Mapper 与 React Client Contract。

审计发现：当前时间链路虽然支持 Asia/Shanghai 输入，但最终转换为
YunQiInstant(epoch milliseconds) 后参与领域计算。

对于五运六气系统，应明确：

北京时间历法时间是领域语义，Instant 是工程表示。

目标链路：

API输入 → Asia/Shanghai 历法时间解析 → YunQiCalendarTime → 五运六气计算

------------------------------------------------------------------------

## 修正目标

1.  保留现有 YunQiInstant。
2.  新增 YunQiCalendarTime 模型。
3.  Service 层负责时间解析。
4.  Domain 计算入口明确支持历法语义。
5.  Instant 仅用于日志、审计、排序、传输。

禁止： - 修改规则表。 - 修改 Phase1 计算逻辑。 - 引入 UI 逻辑。

------------------------------------------------------------------------

## 新增模型

定义：

``` ts
YunQiCalendarTime
```

包含：

``` ts
{
 localDateTime,
 timezone: "Asia/Shanghai",
 instant: YunQiInstant
}
```

要求： - localDateTime 为主语义。 - instant 为派生值。 - 两者必须一致。

------------------------------------------------------------------------

## Service 修改

将：

``` ts
parseApiDateTime(): YunQiInstant
```

调整为：

``` ts
parseApiDateTime(): YunQiCalendarTime
```

支持：

本地：

    2026-01-01T12:00:00

解释为：

    Asia/Shanghai

兼容：

    2026-01-01T12:00:00+08:00
    2026-01-01T04:00:00Z

------------------------------------------------------------------------

## Domain调整

保持：

``` ts
calculateYunQi(YunQiInstant)
```

兼容。

新增：

``` ts
calculateYunQiByCalendarTime(YunQiCalendarTime)
```

要求：

五运六气边界判断优先使用北京时间历法语义。

Instant 只作为辅助。

------------------------------------------------------------------------

## 节气边界测试

必须保持：

-   大寒前一秒
-   大寒交界秒
-   大寒后一秒

例如：

    2024-01-20T22:07:21+08:00
    2024-01-20T22:07:22+08:00
    2024-01-20T22:07:23+08:00

结果不得变化。

------------------------------------------------------------------------

## API兼容

保持：

    POST /api/v1/yunqi/calculate

输入：

``` json
{
 "dateTime":"2026-01-01T12:00:00"
}
```

输出结构保持不变。

------------------------------------------------------------------------

## 测试要求

新增：

-   本地时间测试
-   offset测试
-   UTC测试
-   TZ=UTC环境测试
-   TZ=Asia/Shanghai环境测试

验证：

同一北京时间历法时刻必须得到一致计算结果。

------------------------------------------------------------------------

## 禁止事项

禁止：

-   使用服务器默认时区。
-   使用 Date.parse 解析业务时间。
-   React处理历法逻辑。
-   Controller处理规则计算。

------------------------------------------------------------------------

## 完成标准

-   [ ] 北京时间成为明确领域语义
-   [ ] Instant 不再承担唯一时间含义
-   [ ] Phase1测试全部通过
-   [ ] Phase2-A API兼容
-   [ ] OpenAPI无漂移

最终原则：

> 北京时间是历法语义，Instant 是工程表示。
