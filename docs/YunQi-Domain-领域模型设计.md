# yunqi-domain 领域模型设计 V1.0

## 1. 设计目标

yunqi-domain 是中医五运六气系统的核心领域层。

设计原则：

-   纯业务规则；
-   不依赖前端；
-   不依赖数据库；
-   不依赖 API 框架；
-   输入输出结构化；
-   所有规则可测试、可追溯。

------------------------------------------------------------------------

# 2. 领域边界

## 包含

-   运气年计算
-   干支计算
-   岁运
-   太过不及
-   五音
-   司天
-   在泉
-   主气
-   客气
-   六步
-   客主关系
-   规则解释

## 不包含

-   UI展示
-   用户权限
-   数据库
-   医疗诊断
-   方药推荐

------------------------------------------------------------------------

# 3. 核心实体

## YunQiYear

表示五运六气年度。

``` ts
interface YunQiYear {
  year:number;
  ganzhi:string;
  stem:string;
  branch:string;
}
```

------------------------------------------------------------------------

## SuiYun

表示岁运。

``` ts
interface SuiYun {
 element:
 "木"|"火"|"土"|"金"|"水";

 state:
 "太过"|"不及";

 tone:string;
}
```

------------------------------------------------------------------------

## SixQiStep

表示六步。

``` ts
interface SixQiStep {
 index:number;
 name:string;

 start:string;
 end:string;

 hostQi:string;
 guestQi:string;

 relation:HostGuestRelation;
}
```

------------------------------------------------------------------------

## HostGuestRelation

第一阶段：

``` ts
type HostGuestRelation =
 | SAME_QI
 | SAME_ELEMENT_DIFFERENT_QI
 | HOST_GENERATES_GUEST
 | GUEST_GENERATES_HOST
 | HOST_CONTROLS_GUEST
 | GUEST_CONTROLS_HOST
```

------------------------------------------------------------------------

# 4. 核心服务

calculateYunQi()

输入：

日期时间

输出：

完整五运六气结果。

calculateYearYunQi()

输入：

年份

输出：

年度结构。

getCurrentStep()

输入：

日期时间

输出：

当前六步。

------------------------------------------------------------------------

# 5. 不变量

必须满足：

1.  三之气客气 = 司天
2.  终之气客气 = 在泉
3.  六步时间连续
4.  任意时间只能属于一个六步
5.  君火和相火不可合并
