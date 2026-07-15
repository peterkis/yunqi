# Domain Implementation Guide

## 开发顺序

Phase 1:

1.  CalendarProvider
2.  YunQiYearResolver
3.  StemBranchCalculator
4.  SuiYunCalculator
5.  SixQiCalculator
6.  HostGuestCalculator
7.  ExplanationTemplate

------------------------------------------------------------------------

## 禁止

不要：

-   在React组件计算五运六气
-   在Controller写规则
-   在数据库保存算法结果作为唯一来源

------------------------------------------------------------------------

## 推荐结构

src/domain/

calendar/ resolver.ts

wuyun/ sui-yun.ts

liuqi/ sitian.ts zaiquan.ts host.ts guest.ts

relation/ host-guest.ts
