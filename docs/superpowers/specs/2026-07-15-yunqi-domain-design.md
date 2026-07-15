# YunQi Domain Phase 1 Design

## 目标与范围

在 `packages/yunqi-domain` 创建独立 TypeScript 领域包，只实现运气年、年干支、岁运、太过不及、五音、司天在泉、主气、客气、六步时间轴、客主关系和规则解释。包不依赖 React、数据库、API 框架、登录、HIS、EMR 或大模型，也不输出诊断、辨证、方剂、中药或剂量。

用户指定 `codex/CODEX-PHASE1-STARTER-PROMPT.md` 为批准规范。项目规则文件未给出可执行映射，因此先以 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 显式记录版本、来源、变更原因和完整表格，再让代码只消费对应常量。

## 方案选择

采用“显式规则表 + 纯计算器 + CalendarProvider 适配器”。

- 选定方案：规则集中、可追溯、可逐项测试；默认 `tyme4ts` 适配器提供实际节气时刻，测试可注入内存 Provider。
- 未选方案一：在各计算器中散落 `switch` 或日期常量，会破坏规则优先和版本审计。
- 未选方案二：只定义 Provider 接口而不提供默认实现，会让完整服务无法直接计算实际大寒和六步边界。

## 模块边界

```text
src/
  calendar/     北京时间解析、CalendarProvider、tyme4ts 适配器
  rules/        版本化规则常量
  ganzhi/       六十甲子与年干支
  wuyun/        岁运、太过不及、五音
  liuqi/        司天在泉、主气、客气、六步
  relation/     客主五行关系
  explanation/ 仅生成规则解释和教学提示
  services/     calculateYunQi、calculateYearYunQi、getCurrentStep
  types.ts      公共领域类型
  index.ts      唯一公共导出面
```

每个计算函数只依赖参数和规则常量。默认 Provider 是确定性的历法适配层；核心计算器支持注入 `CalendarProvider`，以便测试边界且不模拟业务规则。

## 公共接口

```ts
type DateTimeInput = string | Date;

interface CalendarProvider {
  getSolarTermTime(year: number, term: SixStepBoundaryTerm): BeijingDateTime;
}

function calculateYearYunQi(
  year: number,
  provider?: CalendarProvider,
): YunQiYearResult;

function calculateYunQi(
  dateTime: DateTimeInput,
  provider?: CalendarProvider,
): YunQiResult;

function getCurrentStep(
  dateTime: DateTimeInput,
  provider?: CalendarProvider,
): SixQiStep;
```

`YunQiYearResult` 包含运气年、干支、年干年支、岁运、司天、在泉、六步、规则版本和解释。`YunQiResult` 在年度结构上增加规范化输入时间与当前六步。

## 时间与数据流

字符串输入必须携带 `Z` 或 UTC 偏移；`Date` 输入按其绝对毫秒值处理。所有比较转换为 Unix 毫秒，所有对外时间输出为秒精度北京时间字符串 `YYYY-MM-DDTHH:mm:ss+08:00`。

1. 将输入解析为绝对瞬时并取得北京公历年。
2. 从 Provider 获取该公历年大寒实际交节时刻。
3. 输入早于该大寒则归入前一运气年，否则归入当前运气年。
4. 运气年决定年干支、岁运和司天在泉。
5. 以大寒、春分、小满、大暑、秋分、小雪和下一年大寒构造六个左闭右开区间。
6. 司天对齐三之气，按客气序列循环生成六步客气。
7. 逐步计算唯一客主关系；输入瞬时只匹配一个当前步骤。

交节时刻本身属于新区间。无时区、无效日期、非整数年份、Provider 返回错误节气名或不连续边界时立即抛出描述性错误。

## 规则与安全

- 规则版本固定为 `V1.0-2026.7.7-implementation.1`。
- 所有映射只定义在规则模块，不在服务中复制。
- 规则解释只陈述输入、映射和边界，不推断疾病、证型或治疗。
- “少阴君火”和“少阳相火”始终保留为不同枚举值。
- 当前规则仍是“待正式冻结”的实现基线；这会作为未解决问题交付，不伪称临床共识已正式批准。

## 测试设计

Vitest 按 RED-GREEN-REFACTOR 建立以下证据：

1. 六十甲子：60 项唯一、顺序正确、1984/2044 回环一致，并覆盖 1900–2100 每年计算。
2. 典型年份：2024–2028 的干支、岁运、状态、五音、司天和在泉逐项断言。
3. 大寒边界：前一秒属于上一运气年，交节秒属于新运气年。
4. 六步边界：每个边界前一秒属于前一步，交节秒属于后一步；六步首尾连续且无重叠。
5. 不变量：三之气客气等于司天、终之气客气等于在泉，覆盖十二地支。
6. 客主关系：六种关系各有实例，并验证君火/相火返回同元素不同气。
7. 输入校验：拒绝无时区和无效时间；输出统一为北京时间。
8. 默认适配器：对真实 `tyme4ts` 节气做集成测试，证明没有固定日期替代交节时刻。

## 验收

完成必须同时满足：Vitest 全绿、TypeScript 类型检查通过、包构建成功、公共 API 可从 `src/index.ts` 导入、依赖树不含前端/数据库/API 框架、提示文件的每个必测项都有直接测试证据，并输出文件结构、实现说明、测试结果和未解决问题。

## 本地版本控制

项目初始化时执行本地 Git 初始化，默认分支为 `main`。现有规范、规则表、设计和计划形成初始化基线提交；Phase 1 实现在 `feat/yunqi-domain-phase1` 分支完成。`.gitignore` 必须排除 `node_modules`、`dist`、`coverage`、日志和临时执行产物，禁止把依赖或构建结果纳入版本库。
