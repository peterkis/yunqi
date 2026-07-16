# Phase1 Fix - yunqi-domain Architecture Improvement

## 项目

中医五运六气与问诊结构化原型系统

## 当前状态

已有 Phase1 实现：

commit:

34d4f7913e39f1789a500be788840681c61cae54

当前目标：

在不推倒重写的情况下，对 Phase1 进行架构和领域模型修复，使其达到 Phase2 开发准入标准。

---

# 一、必须先阅读

开始修改前必须阅读：

README.md

AGENTS.md

docs/PRD.md

docs/YunQi-Domain-领域模型设计.md

rules/RULE_FREEZE_NOTE.md

并检查当前：

packages/yunqi-domain

实现。

---

# 二、本次修复范围

只处理以下问题：

## FIX-001

CalendarProvider 解耦

## FIX-002

统一时间模型

## FIX-003

升级 HostGuestRelation 模型

## FIX-004

增强测试体系

禁止：

- 添加 React
- 添加 API
- 添加数据库
- 添加高级五运六气规则
- 修改专家冻结规则

---

# 三、FIX-001：CalendarProvider 解耦

## 当前问题

当前：

yunqi-domain
|
|
tyme4ts

领域层知道具体历法实现。

这违反：

领域层应该只依赖抽象。

---

# 修改目标

调整为：

packages/

yunqi-domain

calendar/
provider.ts

adapters/

tyme4ts-calendar/

    provider.ts

---

# 新设计

## yunqi-domain

只定义：

````ts
interface CalendarProvider {

 getSolarTermInstant(
   year:number,
   term:SolarTerm
 ):YunQiInstant;

}

禁止：

import tyme4ts
adapter层

新增：

packages/

calendar-adapters/

    tyme4ts/

负责：

Tyme4tsCalendarProvider

实现：

CalendarProvider
四、FIX-002：统一时间模型
当前问题

领域层大量使用：

Date

JavaScript Date存在：

时区隐式转换；
字符串解析差异；
测试困难。
新增领域时间类型

创建：

calendar/time.ts

定义：

export interface YunQiInstant {

 epochMilliseconds:number;

 timezone:"Asia/Shanghai";

}
修改原则

领域层：

禁止：

Date

允许：

YunQiInstant
输入处理

允许：

外部：

string
Date

进入：

adapter

转换为：

YunQiInstant

领域内部只使用：

YunQiInstant
五、FIX-003：升级客主关系模型
当前问题

当前：

enum Relation

信息不足。

专家规则要求：

必须区分：

同一六气
同五行不同六气

例如：

少阴君火

少阳相火

二者：

五行同属火

但不是同一个六气。

新模型

替换：

HostGuestRelation

为：

interface HostGuestRelationResult {


 qiRelation:
   | "SAME_QI"
   | "DIFFERENT_QI";


 elementRelation:
   | "SAME_ELEMENT"
   | "DIFFERENT_ELEMENT";


 direction:
   | "NONE"
   | "HOST_GENERATES_GUEST"
   | "GUEST_GENERATES_HOST"
   | "HOST_CONTROLS_GUEST"
   | "GUEST_CONTROLS_HOST";


 traditionalLabel:string;


}
示例
少阴君火 vs 少阳相火

返回：

{
 "qiRelation":"DIFFERENT_QI",

 "elementRelation":"SAME_ELEMENT",

 "direction":"NONE",

 "traditionalLabel":"同属火，六气不同"
}
少阴君火 vs 少阴君火

返回：

{
 "qiRelation":"SAME_QI",

 "elementRelation":"SAME_ELEMENT",

 "direction":"NONE",

 "traditionalLabel":"同气"
}
主生客

返回：

{
 "direction":
 "HOST_GENERATES_GUEST",

 "traditionalLabel":
 "主生客，相得"
}
六、FIX-004：增强测试
1. 60甲子完整测试

新增：

sexagenary-cycle-full.test.ts

要求：

遍历：

甲子

到

癸亥

验证：

年干
年支
岁运
司天
在泉
2. 时间边界测试

新增：

solar-term-boundary.test.ts

必须覆盖：

大寒

测试：

大寒前1毫秒

大寒精确时刻

大寒后1毫秒
六步交界

覆盖：

春分

小满

大暑

秋分

小雪
3. 属性测试

新增：

property.test.ts

使用：

fast-check

验证：

六步数量

任意年份：

steps.length===6
客气不变量

任意年份：

steps[2].guestQi===sitian

steps[5].guestQi===zaiquan
时间连续

任意年份：

step1.end == step2.start
step2.end == step3.start
...
唯一归属

任意时间：

只能属于一个六步。

七、代码质量要求

必须：

TypeScript

开启：

strict:true

禁止：

any
常量

所有规则必须集中：

rules/

禁止：

业务代码：

if(yearBranch==="午")

应该：

BRANCH_RULES["午"]
八、不要修改规则含义

以下专家冻结规则不可改变：

历法
大寒为运气年起点
北京时间
实际交节时刻
五运
十干化运
太过不及
六气
六气名称
主气
客气
司天
在泉
医疗边界

禁止：

自动诊断
自动辨证
方药推荐
九、完成后执行

运行：

pnpm test

必须输出：

PASS

✓ existing phase1 tests

✓ sexagenary cycle

✓ calendar boundary

✓ guest qi invariant

✓ host guest relation

✓ property tests
十、提交要求

创建 commit：

refactor(yunqi-domain):
improve calendar abstraction and domain models
十一、最终报告

完成后输出：

1. 修改摘要

列出：

文件变化
架构变化
2. 测试结果
3. 与专家规则一致性说明
4. 是否满足 Phase2 准入

必须明确：

Phase1 READY FOR PHASE2: YES / NO

---

## 执行建议

这次不要让 Codex 自主发挥，建议：

1. 创建分支：

```bash
git checkout -b refactor/yunqi-domain-phase1-fix
执行 Prompt。
Review 重点看：
Date 是否已经从 domain 消失；
tyme4ts 是否移动到 adapter；
relation 是否结构化；
测试是否增加。
````
