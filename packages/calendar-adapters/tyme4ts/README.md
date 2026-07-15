# @yunqi/calendar-adapter-tyme4ts

`@yunqi/calendar-adapter-tyme4ts` 是 `@yunqi/domain` 的外部历法适配器。它负责严格解析应用层时间输入、调用锁定版本 `tyme4ts@1.5.2` 取得真实节气交节时刻，并把结果转换成领域层唯一接受的 `YunQiInstant`。它不拥有、复制或改写五运六气规则。

## 使用方式

```ts
import { calculateYunQi, formatYunQiInstant } from '@yunqi/domain';
import {
  toYunQiInstant,
  tyme4tsCalendarProvider,
} from '@yunqi/calendar-adapter-tyme4ts';

const input = toYunQiInstant('2024-05-20T21:00:00+08:00');
const result = calculateYunQi(input, tyme4tsCalendarProvider);

console.log(result.currentStep.name);
console.log(formatYunQiInstant(result.currentStep.start));
```

应用层应先用 `toYunQiInstant` 转换 `string | Date`，再将 `tyme4tsCalendarProvider` 显式注入领域服务。年度和六步边界均以 `{ epochMilliseconds, timezone: 'Asia/Shanghai' }` 返回；`timezone` 是 Phase 1 固定 UTC+08:00 语义的领域标签。

## 输入契约

- 字符串只接受 `YYYY-MM-DDTHH:mm:ss`，其后可选 1–3 位毫秒（`.S`、`.SS` 或 `.SSS`），末尾必须带 `Z` 或 `±HH:mm` UTC 偏移。
- 无时区、偏移格式错误或不存在的公历日期时间字段会抛出 `RangeError`，不会被 JavaScript 日期解析器自动规范化。
- `Date` 按绝对纪元毫秒解释；无效 `Date` 会被拒绝。
- 适配器把 `tyme4ts` 返回的北京时间字段转换为绝对纪元毫秒，并核验请求年份、节气名称和返回年份一致。

## 区间契约

领域层按左闭右开区间解释适配器边界。真实节气边界测试覆盖 2024 大寒、春分、小满、大暑、秋分、小雪和结束边界 2025 大寒的 `-1 ms`、精确时刻与 `+1 ms`；结束大寒精确时刻及其后一毫秒只归属下一运气年的初之气。

性质测试在 1901–2099 年范围内以 200 次运行验证六步结构、连续性、区间唯一归属与跨年大寒契约，并以独立五行映射完整验证 6 × 6 客主关系组合。

## 规则与安全边界

规则唯一来源仍是仓库根目录的 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 和 `@yunqi/domain` 的规则实现；当前规则状态仍为“待正式冻结”。本适配器只提供时间和历法基础设施，不输出诊断、处方、治疗建议或个性化医疗结论，也不参与医疗决策。

## 本地验证

在仓库根目录执行：

```powershell
pnpm --filter @yunqi/domain build
pnpm --filter @yunqi/calendar-adapter-tyme4ts test
pnpm --filter @yunqi/calendar-adapter-tyme4ts typecheck
pnpm --filter @yunqi/calendar-adapter-tyme4ts test:typecheck
```
