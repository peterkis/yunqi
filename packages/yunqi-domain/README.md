# @yunqi/domain

`@yunqi/domain` 是 Phase 1 的独立 TypeScript 领域包。它以纯计算器组合运气年、年干支、岁运、太过不及、五音、司天在泉、主气、客气、六步时间轴、客主关系和规则事实解释，不依赖 UI、数据库、API 框架、HIS、EMR 或大模型。

## 时间与年份约定

- 字符串输入必须带 `Z` 或明确的 UTC 偏移，例如 `2024-05-20T21:00:00+08:00`；无时区字符串会被拒绝。
- `Date` 输入按其绝对毫秒值解释。
- 所有公开时间输出都确定性规范化为北京时间（UTC+08:00）秒精度字符串：`YYYY-MM-DDTHH:mm:ss+08:00`。
- 运气年从当年大寒实际交节时刻起，到下一年大寒实际交节时刻止；所有区间均左闭右开。
- 默认历法适配器使用精确锁定的运行时依赖 `tyme4ts@1.5.2`，不以固定公历日期代替节气时刻。
- 自动化测试直接覆盖 1900–2100。Phase 1 不声明 BCE 年份或五位数公历年份的支持范围。

## 公共 API

三个主要服务都可省略 Provider，也可注入同一个 `CalendarProvider`：

```ts
import {
  calculateYunQi,
  calculateYearYunQi,
  defaultCalendarProvider,
  getCurrentStep,
  type CalendarProvider,
  type YunQiResult,
  type YunQiYearResult,
} from '@yunqi/domain';

const provider: CalendarProvider = defaultCalendarProvider;

const annual: YunQiYearResult = calculateYearYunQi(2024, provider);
const dated: YunQiResult = calculateYunQi(
  '2024-05-20T21:00:00+08:00',
  provider,
);
const currentStep = getCurrentStep(
  '2024-05-20T21:00:00+08:00',
  provider,
);

console.log(annual.ganzhi); // 甲辰
console.log(dated.input); // 2024-05-20T21:00:00+08:00
console.log(currentStep.name); // 三之气
```

Provider 契约返回同一瞬时的规范北京时间与纪元毫秒值：

```ts
interface CalendarProvider {
  getSolarTermTime(
    year: number,
    term: '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪',
  ): {
    iso: string;
    epochMilliseconds: number;
  };
}
```

包入口还保留已经审查的基础计算器、公共结果类型和冻结规则常量。`RULE_VERSION` 固定为 `V1.0-2026.7.7-implementation.1`。默认 Provider、根导出的规则对象/集合、六步集合及每条解释集合均在运行时冻结；每次年度计算会创建新的解释集合。

## 规则与安全边界

唯一映射来源是仓库根目录的 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 及 `src/rules/phase1-rules.ts`。当前版本是实现基线，状态仍为“待正式冻结”，不应表述为已经完成正式规则共识冻结。

输出解释只陈述时间边界和规则映射事实。包禁止输出诊断、辨证、证型、处方、方剂、中药、药物、剂量、用药、治疗、预后、疾病预测或个性化建议，也不参与医疗决策。

## 本地验证

在本目录 `packages/yunqi-domain` 执行：

```powershell
npm test -- tests/public-api.test.ts tests/acceptance.test.ts
npm test -- tests/year-and-suiyun.test.ts
npm test
npm run typecheck
npm run build
npm run test:coverage
npm ls --all
npm ls --omit=dev
```

构建只读取 `src/**/*.ts`，输出到已忽略的 `dist/`。覆盖率输出位于已忽略的 `coverage/`。
