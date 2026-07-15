# @yunqi/domain

`@yunqi/domain` 是 Phase 1 的独立 TypeScript 领域包。它以纯计算器组合运气年、年干支、岁运、太过不及、五音、司天在泉、主气、客气、六步时间轴、结构化客主关系和规则事实解释，不依赖 UI、数据库、API 框架、HIS、EMR 或大模型。该包没有任何运行时依赖。

## 架构边界

- 领域层只接收 `YunQiInstant`，其结构固定为 `{ epochMilliseconds: number; timezone: 'Asia/Shanghai' }`。
- 外部 `string | Date` 必须先由历法适配器的 `toYunQiInstant` 转换，领域源码不解析 `Date` 或字符串，也不依赖 `tyme4ts`。
- `calculateYearYunQi`、`calculateYunQi` 和 `getCurrentStep` 都要求调用方显式注入 `CalendarProvider`，没有默认 Provider。
- 推荐的外部实现是 `@yunqi/calendar-adapter-tyme4ts`；该适配器精确锁定 `tyme4ts@1.5.2`，不以固定公历日期代替节气时刻。

## 时间与年份约定

- `YunQiInstant.timezone` 是 Phase 1 固定 UTC+08:00 语义的领域标签。
- 年度结果的 `start`、`end` 以及每一步的 `start`、`end` 都是 `YunQiInstant`，保留纪元毫秒边界。
- `formatYunQiInstant` 可将时刻确定性格式化为北京时间秒精度字符串 `YYYY-MM-DDTHH:mm:ss+08:00`。
- 运气年从当年大寒实际交节时刻起，到下一年大寒实际交节时刻止；所有区间均左闭右开。
- `calculateStemBranch` 的干支规则循环测试逐年覆盖 1900–2100；独立验收 oracle 完整覆盖从 1984 甲子起的 60 年循环。
- 真实适配器性质测试在 1901–2099 年间验证六步连续性、司天/在泉锚点、区间唯一归属和跨年大寒归属。
- Phase 1 不声明 BCE 年份或五位数公历年份的支持范围。

## 公共 API

调用方在适配器边界转换输入，并显式注入同一个 Provider：

```ts
import {
  calculateYunQi,
  calculateYearYunQi,
  formatYunQiInstant,
  getCurrentStep,
  type CalendarProvider,
  type YunQiResult,
  type YunQiYearResult,
} from '@yunqi/domain';
import {
  toYunQiInstant,
  tyme4tsCalendarProvider,
} from '@yunqi/calendar-adapter-tyme4ts';

const provider: CalendarProvider = tyme4tsCalendarProvider;
const input = toYunQiInstant('2024-05-20T21:00:00+08:00');

const annual: YunQiYearResult = calculateYearYunQi(2024, provider);
const dated: YunQiResult = calculateYunQi(input, provider);
const currentStep = getCurrentStep(input, provider);

console.log(annual.ganzhi); // 甲辰
console.log(formatYunQiInstant(dated.input)); // 2024-05-20T21:00:00+08:00
console.log(currentStep.name); // 三之气
```

领域层唯一历法端口返回绝对瞬时：

```ts
interface YunQiInstant {
  epochMilliseconds: number;
  timezone: 'Asia/Shanghai';
}

interface CalendarProvider {
  getSolarTermInstant(
    year: number,
    term: '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪',
  ): YunQiInstant;
}
```

包入口还保留已经审查的基础计算器、公共结果类型和冻结规则常量。`RULE_VERSION` 固定为 `V1.0-2026.7.7-implementation.1`。根导出的规则对象/集合、六步集合及每条解释集合均在运行时冻结；每次年度计算会创建新的解释集合。

## 规则与安全边界

唯一映射来源是仓库根目录的 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 及 `src/rules/phase1-rules.ts`。当前版本是实现基线，状态仍为“待正式冻结”，不应表述为已经完成正式规则共识冻结。

输出解释只陈述时间边界和规则映射事实。包禁止输出诊断、辨证、证型、处方、方剂、中药、药物、剂量、用药、治疗、预后、疾病预测或个性化建议，也不参与医疗决策。

## 本地验证

在仓库根目录执行：

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm --filter @yunqi/domain test:coverage
```

构建只读取 `src/**/*.ts`，输出到已忽略的 `dist/`。覆盖率输出位于已忽略的 `coverage/`。
