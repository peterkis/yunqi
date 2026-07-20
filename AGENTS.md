# AGENTS.md

# 中医五运六气与问诊结构化原型系统

## 1. 项目身份与开发目标

你正在参与开发：

> 中医五运六气与问诊结构化原型系统（TCM YunQi Lab）

这是一个面向院内中医医生的：

-   五运六气理论学习工具；
-   五运六气规则计算平台；
-   中医问诊结构化辅助平台；
-   教学复盘平台。

本项目不是：

-   自动诊断系统；
-   自动辨证系统；
-   自动处方系统；
-   自动治疗决策系统。

任何代码、接口、提示文本均不得突破医疗安全边界。

------------------------------------------------------------------------

# 2. 核心开发原则

## 2.1 规则优先（Rule First）

五运六气计算属于确定性规则系统。

所有核心结果必须来源于：

-   已冻结规则；
-   版本化规则文件；
-   自动化测试。

禁止：

-   根据自然语言自行推断规则；
-   根据网络资料临时修改规则；
-   使用大模型生成五运六气计算结果；
-   在 UI 层直接编写规则。

正确：

    规则文件
        ↓
    yunqi-domain
        ↓
    结构化结果
        ↓
    展示层

错误：

    React组件
        ↓
    if(year === ...)
        ↓
    直接计算

------------------------------------------------------------------------

# 3. 架构约束

## 3.1 领域层隔离

核心领域：

    packages/yunqi-domain

必须保持纯净。

允许：

-   TypeScript；
-   纯函数；
-   领域对象；
-   规则计算；
-   单元测试。

禁止依赖：

-   React；
-   Vue；
-   Fastify；
-   Express；
-   PostgreSQL；
-   ORM；
-   UI组件库；
-   浏览器 API。

领域层必须可以：

-   单独测试；
-   单独发布；
-   单独运行。

------------------------------------------------------------------------

## 3.2 API Contract 与前端依赖边界

Phase3 及后续前端只能通过以下公共包消费 YunQi API：

```text
@yunqi/contracts
@yunqi/client
```

职责冻结：

- `@yunqi/service` 是 Fastify 运行时和 TypeBox schema 的唯一来源；
- `@yunqi/contracts` 从 OpenAPI 生成类型派生公共 DTO facade；
- `@yunqi/client` 只依赖 `@yunqi/contracts`，提供浏览器安全 transport 和 client；
- React/Next 不得自行声明、复制或扩展 YunQi DTO；
- Service、Domain 和 calendar adapter 不得反向依赖 contracts 或 client。

当前业务 API Contract ID：

```text
YQ-API-CONTRACT-1.0.0
```

该 Contract ID 精确冻结三个 `/api/v1/yunqi/**` 业务端点的路径、method、
operationId、参数、请求体、响应状态码及其所有可达 schema，包括公共 schema
名称、required、enum、validation constraints 和 `additionalProperties`。

任何冻结投影变化都必须：

1. 分配新的 Contract ID；
2. 按兼容性选择 package SemVer；
3. 更新 OpenAPI、冻结基线、契约文档和测试；
4. 记录迁移影响。

禁止直接更新 snapshot 绕过 Contract ID 变更。

`main` 的合入门禁必须包含固定名称的 GitHub Actions job：

```text
quality-gates
```

该检查必须执行时间治理、契约生成/冻结漂移、测试、类型检查、覆盖率和 schema
校验。仓库 ruleset 或 branch protection 必须阻止未通过检查的 PR 合并和绕过
规则直接 push。

长期架构依据：

```text
docs/architecture/ADR-002-yunqi-contract-freeze.md
docs/contracts/YQ-API-CONTRACT-1.0.0.md
```

------------------------------------------------------------------------

## 3.3 React Workbench 治理边界

Phase3-B Workbench 的依赖链固定为：

```text
apps/yunqi-workbench
  ├── @yunqi/client
  │     └── @yunqi/contracts
  └── @tanstack/react-query
```

Workbench 运行时只允许依赖：

```text
@tanstack/react-query
@yunqi/client
@yunqi/contracts
react
react-dom
```

上述白名单同时约束 `dependencies`、`optionalDependencies` 和
`peerDependencies`；`devDependencies` 只允许承载开发和测试工具，不能借此
绕过源码 import 治理。

禁止依赖或导入 Service、Domain、calendar adapter、内部生成的 OpenAPI 文件，
Axios 或 React Router，也不得复制冻结 DTO。所有源码的静态 import、动态
import 和 `require` 均受此约束，即使对应包只出现在 `devDependencies`。
DTO 必须从 `@yunqi/contracts` 导入。

相对 import 解析后必须仍位于 `apps/yunqi-workbench` 内；禁止使用 `../` 或
Windows `..\` 逃逸到仓库中的 Service、Domain、calendar adapter、generated
contract 或其他本地实现。禁止绝对本地路径和 `file:` import。公共
`@yunqi/contracts` 与 `@yunqi/client` 包入口不受此限制。

Provider ownership 固定如下：

- `AppProviders` 负责组合 Error Boundary、Theme、Query 和 YunQi Client Provider；
- `QueryProvider` 拥有 `QueryClient`；
- `YunQiClientProvider` 拥有 `YunQiClient` 与 transport 的创建和注入；
- feature query/hook 层通过注入的 client 与 `@yunqi/client` query options 获取数据；
- `src/components/**`、`src/app/**` 和 `src/features/**/components/**`
  按路径职责视为 component，不因文件扩展名改变；
- component 只接收状态和 DTO，不得 runtime import `@yunqi/client`，不得调用
  `fetch`、Axios 或 YunQi client 方法，不得通过 optional chaining、方法引用、
  bracket access 或解构取得 client 方法能力，不得拼接 `/api/v1/yunqi/**`
  路径或执行五运六气业务计算。type-only client import 不创建运行时能力。

Phase3-B 只建立非路由 Workbench foundation。未经后续阶段明确授权，不得加入
router、业务页面、问诊流程、专家审核、规则管理、诊断或治疗输出。

Workbench 展示业务时间必须直接使用 API 的规范 `localTime`，并标注：

```text
北京时间 UTC+08
```

不得从 `epochMilliseconds`、浏览器本地时区、`Date`、Temporal、Intl、
locale/ISO formatter 或 `Asia/Shanghai` 重建展示时间。

以上规则由根命令自动检查：

```text
pnpm test:workbench-governance
pnpm test:time-governance
```

------------------------------------------------------------------------

# 4. 时间处理规范

五运六气最重要的工程风险是时间边界。

必须遵守：

## 4.1 时间标准

本项目五运六气计算统一采用：

    固定北京时间 UTC+08:00

领域标准字面量：

    BeijingStandardTime+08:00

必须明确：

-   这里的“北京时间”不是 IANA `Asia/Shanghai` 历史时区规则；
-   不应用 1986–1991 历史夏令时；
-   不使用服务器本地时区；
-   不使用 DST 调整；
-   同一输入必须在不同运行环境得到完全一致结果。

禁止使用：

-   IANA `Asia/Shanghai` 作为业务计算依据；
-   `Date`、Temporal 或 Intl 推导五运六气业务时间；
-   服务器默认时区参与边界判断；
-   将 `epochMilliseconds` 作为五运六气历法语义的唯一来源。

`YunQiInstant` 保留现有公共命名，但其规范定义必须写作：

    BeijingStandardTime+08:00 Absolute Representation

它不是 civil timezone instant。其
`epochMilliseconds` 只用于固定北京时间模型下的排序、传输、持久化、审计、
兼容与一致性校验；不得经 UTC、IANA 时区、服务器本地时区或 DST
重新解释后作为运气年或六步边界依据。

`CalendarProvider` 只提供节气瞬间，不得决定：

-   运气年；
-   六步归属；
-   区间开闭或边界所有权；
-   五运、六气、客主加临规则。

所有 API 业务时间解析、归一化和格式化必须通过
`packages/yunqi-service/src/modules/time-normalizer`。Controller、route、DTO
mapper、serializer 不得为五运六气业务时间创建 `Date`、调用
`Date.parse()`/`toISOString()`，或自行使用 Temporal、Intl、IANA
时区完成转换。

允许系统时钟只提供 epoch milliseconds，随后必须立即执行：

    epochMilliseconds
        ↓
    YunQiCalendarTime
        ↓
    calculateYunQiByCalendarTime()

以上固定时间标准同时用于展示和业务判断。

------------------------------------------------------------------------

## 4.2 运气年边界

第一阶段规则：

    当年大寒实际交节时刻开始

    下一年大寒之前结束

禁止：

-   使用春节作为年份边界；
-   使用立春替代运气年；
-   使用固定日期模拟大寒。

------------------------------------------------------------------------

## 4.3 时间模型

领域内部禁止直接使用：

``` ts
Date
```

推荐：

``` ts
YunQiCalendarTime
```

或等价不可变时间对象。

原因：

避免：

-   时区漂移；
-   环境差异；
-   边界计算错误。

`YunQiInstant` 仅作为固定北京时间模型下的绝对表示，用于：

-   排序；
-   传输；
-   持久化；
-   审计；
-   兼容。

它不是权威历法语义，不得成为运气年或六步边界判断的唯一依据。

长期架构依据：

    docs/architecture/adr/ADR-001-fixed-beijing-time-semantics.md

------------------------------------------------------------------------

## 4.4 持久化时间合同

Phase3/Phase4 或任何后续持久化必须保证：不依赖数据库连接、会话或服务器
时区配置，也能完整重建五运六气业务时间语义。

最小持久化字段冻结为：

```text
calendar_time_local varchar
epoch_ms bigint
offset char(6)
calendar_time_standard varchar
```

字段约束：

- `calendar_time_local` 保存规范固定北京时间字符串，例如
  `2026-06-19T12:00:00+08:00`；
- `epoch_ms` 只承担排序、传输、审计、兼容和持久化绝对表示；
- `offset` 必须为 `+08:00`；
- `calendar_time_standard` 必须为
  `BeijingStandardTime+08:00`。

`timestamp with time zone` 或 `timestamptz` 只能作为派生查询辅助字段，不能
成为唯一字段、权威字段或重建五运六气业务时间的必要前提。

------------------------------------------------------------------------

## 4.5 React 工作台时间合同

React/Next 展示五运六气业务时间时，必须直接使用 API 返回的规范
`localTime`，或者使用仅处理规范固定北京时间字段/字符串的专用 formatter。

明确禁止：

```ts
new Date(result.epochMilliseconds)
```

React component、hook、selector、mapper、serializer 和 formatter 均不得
通过 `Date`、Temporal、`Intl.DateTimeFormat`、IANA 时区、浏览器本地时区、
`toISOString()` 或 locale formatter 重新解释五运六气业务时间。

`epochMilliseconds` 在前端只允许用于排序、缓存键、审计和兼容，不得作为
展示日历含义的来源。UI 文案显示“北京时间 UTC+08”，不得显示
`Asia/Shanghai` 作为业务时间标准。

------------------------------------------------------------------------

# 5. 五运六气规则约束

## 5.1 五运

必须遵守：

    甲己 → 土
    乙庚 → 金
    丙辛 → 水
    丁壬 → 木
    戊癸 → 火

太过：

    甲 丙 戊 庚 壬

不及：

    乙 丁 己 辛 癸

------------------------------------------------------------------------

## 5.2 六气

六气名称必须保持：

    厥阴风木
    少阴君火
    太阴湿土
    少阳相火
    阳明燥金
    太阳寒水

特别注意：

少阴君火 ≠ 少阳相火

二者：

-   五行均属火；
-   六气名称和理论含义不同。

禁止合并：

``` text
火气
```

替代：

``` text
少阴君火
少阳相火
```

------------------------------------------------------------------------

# 6. 客主关系规范

客主关系必须结构化表达。

禁止简单：

``` ts
relation:"good"
relation:"bad"
```

必须区分：

## 六气关系

例如：

    同一六气
    不同六气

## 五行关系

例如：

    同五行
    相生
    相克

## 方向关系

例如：

    主生客
    客生主
    主胜客
    客胜主

传统术语：

    相得
    主胜客，逆
    客胜主，从

只能作为解释文本。

不得解释为：

-   吉凶；
-   疾病；
-   治疗建议。

------------------------------------------------------------------------

# 7. 医疗安全规范

系统输出只能属于：

-   理论说明；
-   规则解释；
-   线索整理；
-   教学提示。

禁止输出：

## 禁止疾病诊断

例如：

错误：

> 患者属于某某证。

允许：

> 问诊资料中存在某类相关线索。

------------------------------------------------------------------------

## 禁止治疗建议

禁止：

-   方剂；
-   中药；
-   剂量；
-   疗程；
-   治法。

------------------------------------------------------------------------

## 禁止因果表达

禁止：

> 因为今年某气，所以患者发生某疾病。

允许：

> 从传统五运六气理论角度存在对应关系，供医生参考。

------------------------------------------------------------------------

# 8. 问诊模块开发规范

问诊模块负责：

采集：

-   主诉；
-   发病时间；
-   就诊时间；
-   寒热；
-   汗；
-   饮食；
-   二便；
-   睡眠情志；
-   舌象；
-   脉象。

输出：

-   症状标签；
-   六淫线索；
-   八纲单项线索；
-   时气对应提示。

禁止：

自动生成：

-   证型；
-   诊断；
-   方药。

------------------------------------------------------------------------

# 9. 规则修改流程

任何规则修改必须：

1.  修改规则版本；
2.  更新规则说明；
3.  更新测试；
4.  记录变更原因；
5.  标记专家审核状态。

禁止：

直接修改代码中的规则常量。

------------------------------------------------------------------------

# 10. 测试要求

核心规则必须覆盖：

## 60甲子

验证：

-   年干支；
-   岁运；
-   司天；
-   在泉。

## 边界

必须测试：

-   大寒前；
-   大寒时刻；
-   大寒后。

## 六步

必须验证：

    三之气客气 = 司天

    终之气客气 = 在泉

## 属性测试

推荐验证：

-   六步数量固定6；
-   时间连续；
-   无重叠；
-   任意时间唯一归属。

------------------------------------------------------------------------

# 11. Git提交规范

提交信息使用：

    feat:
    新增功能

    fix:
    修复问题

    refactor:
    架构调整

    test:
    测试调整

    docs:
    文档更新

示例：

    feat(yunqi-domain):
    implement phase1 six qi calculator

------------------------------------------------------------------------

# 12. Codex工作方式要求

执行任务时：

必须：

1.  先阅读项目文档；
2.  理解领域规则；
3.  输出修改计划；
4.  再修改代码；
5.  执行测试；
6.  输出变更报告。

禁止：

直接生成大量代码后解释。

------------------------------------------------------------------------

# 13. 当前开发路线

## Phase1

完成：

-   yunqi-domain；
-   五运六气核心计算；
-   自动测试。

## Phase2

完成：

-   Fastify API；
-   OpenAPI；
-   JSON Schema；
-   服务层。

## Phase3

完成：

-   React工作台；
-   五运六气可视化；
-   问诊结构化。

## Phase4

完成：

-   教学复盘；
-   专家审核；
-   规则管理。

------------------------------------------------------------------------

# 最终原则

请始终遵守：

> 规则必须可解释，计算必须可验证，输出必须克制，医生拥有最终解释权。
