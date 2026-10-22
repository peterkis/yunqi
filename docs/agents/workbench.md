# Workbench约束

修改 `apps/yunqi-workbench` 的源码、运行时依赖、路由或展示前读取本页；
时间和医疗约束分别见[规则与时间](rules-and-time.md)、[医疗与阶段范围](clinical-scope.md)。

## 依赖和导入

运行时白名单仅有 `@tanstack/react-query`、`@yunqi/client`、`@yunqi/contracts`、
`react`、`react-dom`、`react-router-dom`；router必须精确锁定7.18.1。
白名单同时覆盖dependencies、optionalDependencies、peerDependencies；devDependencies只放开发/测试工具，
不得通过把运行时包列入devDependencies绕过源码检查。

所有静态import、动态import和require均受约束。禁止Service、Domain、calendar adapter、
内部生成OpenAPI、Axios或其他未批准router；DTO从Contracts公共入口导入。
相对路径解析后须仍在Workbench内；禁止../、Windows ..\逃逸、绝对本地路径和file:导入。
Contracts/Client公共包入口是允许边界，不允许改为内部文件路径。

## 职责所有权

| 层 | 职责 |
| --- | --- |
| AppProviders | 组合Error Boundary、Theme、Query、YunQi Client Provider |
| QueryProvider | 拥有QueryClient |
| YunQiClientProvider | 创建/注入YunQiClient和transport |
| feature query/hook | 使用注入client与Client query options获取数据 |
| AppRoutes/Router/Navigation | URL匹配、页面、导航、重定向、历史恢复 |
| presentation mapper | 纯DTO转换；不依赖React Router、TanStack Query或Client |
| component/Page | 接收状态和DTO/展示模型，呈现与局部交互 |

Router、Page、Navigation不直接调用client，数据获取继续通过feature query/hook。
component职责按路径判定：`src/components/**`、`src/app/**`、
`src/features/**/components/**`、`src/features/**/pages/**`，不因扩展名改变。
component禁止runtime import/re-export Client，禁止fetch/Axios/client调用、拼接业务API路径和执行领域计算。
optional chaining、方法引用、bracket access、解构也不能取得client方法能力。
纯type-only client import/re-export不产生运行时能力；混合type/runtime re-export仍按runtime拒绝。

## 当前导航和状态

| 路径 | 行为 |
| --- | --- |
| / | replace重定向到/yunqi/current |
| /yunqi/current | 当前规则状态 |
| /yunqi/year | 年度入口，零年度查询 |
| /yunqi/year/:year | URL驱动指定运气年分析 |
| /yunqi/calculate | E1指定时点，仅用户提交后查询 |
| /yunqi/inquiry | 只读规划入口，零业务查询 |

年份是URL导航状态，阶段选择是页面局部状态；年度子路径继续激活年度导航。
当前范围1900–2100，列表、校验和提示使用
[共享年份范围](../../apps/yunqi-workbench/src/lib/yunqi-year-range.ts)。
“enabled”只表示入口可访问，不代表问诊业务上线。不得自动新增问诊子路由。

## 展示和交互

直接显示API localTime并标注“北京时间 UTC+08”，不从epoch或浏览器时区重建时间。
岁运主要展示“五行运＋太过/不及”，五音作为补充；API事实与解释不可由UI重新计算。
方向“客生主”与传统描述“客生主，相得”是两个展示项，不能互相替代。
年度视图不冒用当前态；指定时点采用中性所选阶段语义。

结果编辑后立即隐藏旧结果，提交中限制重复激活，错误使用固定脱敏提示。
原生required会先于submit触发，空值错误/焦点及真实datetime-local值需经过实际控件验证。
不能为jsdom自动补出的.000修改业务输入语法。

机械约束已有 `pnpm test:workbench-governance` 和 `pnpm test:time-governance`。
新增语法绕过需扩展原AST/绑定分析与正反变异用例，不另建正则式替代品。
