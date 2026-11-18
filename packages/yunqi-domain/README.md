# @yunqi/domain

`@yunqi/domain` 是独立的 TypeScript 领域包。当前版本 `1.4.0`，以纯函数计算运气年、年干支、岁运、太过不及、五音、司天在泉、主气、客气、六步时间轴、五步运、教学关系、当前阶段进度与经典摘录，并独立完成版本化体质量表计分。不依赖 UI、数据库、API 框架、HIS、EMR 或大模型，也没有运行时依赖。

本轮增量见[阶段事实补全 E1](../../docs/plans/2026-11-18-stage-facts/cards/E1-domain.md)，此前范围见[医生反馈实施计划](../../docs/plans/2026-11-16-clinician-feedback.md)。
当前 API 契约为 [Contract 1.2.0](../../docs/contracts/YQ-API-CONTRACT-1.2.0.md)；本轮 Domain 新字段的 Service 投影及契约 1.3.0 由后续 E2 处理。
核心规则、教学规则和量表规则分别版本化，工程实现不代表专家冻结或临床验证。

## 架构边界

- `YunQiCalendarTime` 是有日期五运六气计算的权威输入。
- `YunQiInstant` 保留公共命名，但其规范定义是
  `BeijingStandardTime+08:00 Absolute Representation`。它仅承担传输、
  排序、持久化、审计、兼容及阶段时长比例职责，结构为
  `{ epochMilliseconds, offset: '+08:00' }`，不是普通 civil-time instant。
- `calculateYunQiByCalendarTime()` 是唯一的有日期计算实现。
- `calculateYunQi(YunQiInstant)` 是兼容包装器：先投影为 `YunQiCalendarTime`，再调用权威入口，最后保留原始 instant 对象作为兼容结果的 `input`。
- `calculateYearYunQi`、两个有日期入口和 `getCurrentStep` 都要求显式注入 `CalendarProvider`，没有默认 Provider。
- `CalendarProvider` 只提供节气瞬时，不决定运气年、六步归属、区间开闭或任何规则映射。

## 固定北京时间模型

领域业务时间统一采用固定北京时间 `UTC+08:00`，不引入地域时区历史或夏令时规则。

```ts
interface YunQiInstant {
  readonly epochMilliseconds: number;
  readonly offset: '+08:00';
}

interface BeijingLocalDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

interface YunQiCalendarTime {
  readonly localDateTime: BeijingLocalDateTime;
  readonly calendarTimeStandard: 'BeijingStandardTime+08:00';
  readonly instant: YunQiInstant;
}
```

`createYunQiCalendarTime()` 与 `createYunQiCalendarTimeFromInstant()` 使用确定性整数公历算法完成双向转换，并冻结聚合及其嵌套对象。工厂始终校验字段范围、公历日期、纪元毫秒安全范围与双向一致性；`assertYunQiCalendarTime()` 可执行完整的深度往返及不可变性诊断。

运气年从当年大寒实际交节时刻起，到下一年大寒实际交节时刻止。年度和六步归属均比较固定北京时间的七字段元组：

```text
year, month, day, hour, minute, second, millisecond
```

所有区间均为左闭右开。`epochMilliseconds` 继续保留在结果边界中，但不是运气年或六步判断的唯一依据。

## 公共 API

权威日历入口：

```ts
import {
  calculateYunQiByCalendarTime,
  createYunQiCalendarTime,
  type CalendarProvider,
  type YunQiCalendarResult,
} from '@yunqi/domain';

declare const provider: CalendarProvider;

const input = createYunQiCalendarTime({
  year: 2024,
  month: 5,
  day: 20,
  hour: 21,
  minute: 0,
  second: 0,
  millisecond: 0,
});

const result: YunQiCalendarResult = calculateYunQiByCalendarTime(
  input,
  provider,
);
```

兼容 instant 入口：

```ts
import {
  calculateYunQi,
  createYunQiInstant,
  type CalendarProvider,
  type YunQiResult,
} from '@yunqi/domain';

declare const provider: CalendarProvider;

const input = createYunQiInstant(1_716_210_000_000);
const result: YunQiResult = calculateYunQi(
  input,
  provider,
);

console.log(result.input === input); // true
```

领域历法端口保持最小职责：

```ts
interface CalendarProvider {
  getSolarTermInstant(
    year: number,
    term: '大寒' | '春分' | '小满' | '芒种' | '大暑'
      | '处暑' | '秋分' | '立冬' | '小雪',
  ): YunQiInstant;
}
```

推荐实现是 `@yunqi/calendar-adapter-tyme4ts`。适配器负责取得真实节气字段并返回固定 `+08:00` 的 `YunQiInstant`；领域层负责全部运气规则和区间归属。`SolarTerm` 类型从包根导出。调用新增教学计算的自定义 Provider 还须支持芒种、处暑、立冬；原六气边界的节气定义不变。

包入口还保留已经审查的基础计算器、公共结果类型和冻结规则常量。`RULE_VERSION` 为 `YQ-MVP-RULES-1.1.0`。根导出的核心规则对象/集合、六步集合及解释集合均在运行时冻结；每次年度计算会创建新的解释集合。

## 教学计算与出生对照基础

`calculateLearning(input: YunQiCalendarTime, provider: CalendarProvider)` 返回同一次计算的核心 `facts`、`annualRelation`、`currentQi`、`currentMovement`、`currentMovementProgress`、完整 `movements`、匹配的 `annualPassages` / `currentPassages` 及解释边界。`facts.currentStepProgress` 是本次输入的六气进度，与五运分别计算。

年度相临比较司天与中运，当步加临比较客气与主气；两者不混用顺逆术语。经典摘录按实际岁运以及“司天＋六气阶段”匹配，原文与工程阅读释义分开。`annualRelation`、`currentQiRelation` 和 `compareElements` 也从包根导出。

`buildMovementSteps` 独立生成五步运。采用 `TERM_OFFSET_TEACHING_V1`：初运起于大寒；其后边界分别为春分后 13 日、芒种后 10 日、处暑后 7 日、立冬后 4 日，保留交节钟点；终运止于次年大寒。该教学工程口径须由专家确认，不能替换为六步气索引或冒称古代定长计刻法。

每步运增加 `relation: MovementRelationResult`、`startLabel`、`endLabel`。`calculateMovementRelation(host, guest)` 比较五行生克及同五行的太少异同，返回冻结的五行关系、方向和教学标签，不含 `qiRelation`。相生为“相得 · 主生客 / 相得 · 客生主”，客克主为“顺 · 客胜主”，主克客为“逆 · 主胜客”；同五行太少不同为“同属{element}运 · 太少不同”，太少相同为“主客同运”（中性陈述，待下次专家确认）。标签只描述运气结构；界面“相违”只是颜色语气，不是风险等级，不推导吉凶、疾病或治疗结论。关系标签和交运偏移单一常量 `MOVEMENT_RELATION_LABELS` / `MOVEMENT_BOUNDARY_OFFSETS` 从包根公开，时刻与标签同源。六气每步增加 `startTerm` / `endTerm`，闭合类型 `SixQiBoundaryTerm` 直接取自 `STEP_BOUNDARY_TERMS` 的六个值；终之气结束于次年大寒。这些派生投影不改变核心规则版本。

`calculateStageProgress(start, end, input)` 要求 `start <= input < end`、`end > start`，否则抛 `RangeError`。冻结的 `StageProgress` 包含时长比例 `elapsedRatio`（epochMilliseconds 之比，四舍五入到 3 位小数，最大 0.999）、剩余日历日数 `remainingCalendarDays`（固定北京时间年月日的公历日序号差，不看钟点）及 `endsOnInputDate`（日差为 0）。不读取时钟。权威日历入口从输入本地字段构造比例所需的规范 instant，保留原有归属语义；`YunQiCalendarResult` 及兼容 `YunQiResult` 均带 `currentStepProgress`。其余步和年度结果不带进度。

教学规则版本为 `YQ-LEARNING-RULES-1.2.0`，经典数据版本仍为 `YQ-CLASSICAL-READING-1.1.0`。来源及本轮标签增量见[教学规则 1.2](../../rules/LEARNING_RULES_V1_2.md)，阶段事实定义保留于[教学规则 1.1](../../rules/LEARNING_RULES_V1_1.md)，此前逐条审核和摘录边界见[经典阅读 1.1 说明](../../rules/CLASSICAL_READING_V1_1.md)。52 则摘录及其 ID、匹配键、条目数、原文与阅读说明本轮保持不变；消费者不应把旧文案作为匹配条件。`calculateLearning().notes` 继续包含经典数据版本。出生日期解析、当前时钟与未知时刻候选划分由 Service 组织；Domain 不读取系统时间或保存出生信息。

## 体质量表

`getConstitutionQuestionnaire()` 返回固定 `GBT46939-2025` 版次的题目、选项、性别适用性和九质条目映射。共 27 个独立问题，每个性别实际作答 26 题；共享问题只回答一次，再按分量表映射计分。

`evaluateConstitution({ questionnaireId, sex, answers })` 要求 `sex` 为 `male` 或 `female`，`answers` 为适用问题 ID 到整数 1–5 的完整映射。缺题、未知题、另一性别题、无效分值或错误版次均抛出 `RangeError`，不把未答题补为最低分。

结果包含全部九质的条目数、原始分、未舍入转换分及判定，保留所有兼夹和倾向类型。平和质需结合另外八质的阈值判断，不能只选最高分。详细题目来源、反向条目、阈值优先级及测试边界见[量表规则说明](../../rules/CONSTITUTION-GBT46939-2025.md)，实现版本为 `YQ-CONSTITUTION-1.0.0`。

本实现先依据公开正式 `GB/T 46939-2025`；Windows设备恢复在线后，已与用户本地同版PDF的第5章及附录A核对，题目、反向项与阈值一致。读取过程、原件哈希与限制见上述量表说明。量表结果与出生时令分别解释，不从生日自动判定九种体质。

## 规则与安全边界

当前规则来源是仓库根目录的 `rules/PHASE1_IMPLEMENTATION_RULES_V1_1.md` 及 `src/rules/phase1-rules.ts`。本版按 Word 确认单 R-21 将客生主的解释标签改为“客生主，相得”，保留其 `GUEST_GENERATES_HOST` 方向及四字段关系结构。规则版本随结果升级到 `YQ-MVP-RULES-1.1.0`，其余岁运映射、节气顺序、客气序列及固定北京时间语义保持不变。

按确认单 R-08，对外查询范围为 1900–2100 年，具体输入边界由对应 API Contract 约束。Domain 与历法适配器可使用相邻年节气完成跨年计算；这不扩大对外查询范围。旧版 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 及原始资料保留，规则状态仍受 `RULE_FREEZE_NOTE.md` 的“待正式冻结”约束；本次修改没有产生专家签署或临床验证证据。

输出限于时间边界、规则映射、传统理论学习材料及独立量表评估。经典原文中的病候属于文献内容，不能转成当前使用者的疾病预测；量表判定不等于自动辨证或疾病诊断。包不生成诊断、证型、处方、方药、剂量、治疗、预后或个体疾病风险，也不参与医疗决策。

## 本地验证

在仓库根目录执行：

```powershell
pnpm --filter @yunqi/domain test
pnpm --filter @yunqi/domain typecheck
pnpm --filter @yunqi/domain test:typecheck
pnpm --filter @yunqi/domain test:coverage
pnpm --filter @yunqi/domain test:time-purity
pnpm --filter @yunqi/domain build
```

纯度门禁递归检查 Domain 的 `src` 与 `tests`，防止系统时间 API、地域时区标识或时区数据库依赖进入领域实现。
