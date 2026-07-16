# @yunqi/domain

`@yunqi/domain` 是 Phase 1 的独立 TypeScript 领域包。它以纯函数组合运气年、年干支、岁运、太过不及、五音、司天在泉、主气、客气、六步时间轴、结构化客主关系和规则事实解释，不依赖 UI、数据库、API 框架、HIS、EMR 或大模型，也没有运行时依赖。

## 架构边界

- `YunQiCalendarTime` 是有日期五运六气计算的权威输入。
- `YunQiInstant` 保留公共命名，但其规范定义是
  `BeijingStandardTime+08:00 Absolute Representation`。它仅承担传输、
  排序、持久化、审计和兼容职责，结构为
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
    term: '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪',
  ): YunQiInstant;
}
```

推荐实现是 `@yunqi/calendar-adapter-tyme4ts`。适配器负责取得真实节气字段并返回固定 `+08:00` 的 `YunQiInstant`；领域层负责全部运气规则和区间归属。

包入口还保留已经审查的基础计算器、公共结果类型和冻结规则常量。`RULE_VERSION` 为 `YQ-MVP-RULES-1.0.0`。根导出的规则对象/集合、六步集合及解释集合均在运行时冻结；每次年度计算会创建新的解释集合。

## 规则与安全边界

唯一映射来源是仓库根目录的 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 及 `src/rules/phase1-rules.ts`。本次版本调整只更新规则元数据，不改变 Phase 1 映射、节气顺序、客气序列或客主关系表；规则状态仍受 `RULE_FREEZE_NOTE.md` 的“待正式冻结”约束。

输出解释只陈述时间边界和规则映射事实。包禁止输出诊断、辨证、证型、处方、方剂、中药、药物、剂量、用药、治疗、预后、疾病预测或个性化建议，也不参与医疗决策。

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
