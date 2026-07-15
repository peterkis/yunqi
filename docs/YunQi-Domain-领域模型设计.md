# yunqi-domain 领域模型设计 V1.0

## 1. 设计目标

`@yunqi/domain` 是中医五运六气系统的核心领域层。

设计原则：

- 纯业务规则；
- 不依赖前端、数据库或 API 框架；
- 不依赖具体历法库；
- 输入输出结构化；
- 所有规则可测试、可追溯。

------------------------------------------------------------------------

## 2. 领域边界

### 包含

- 运气年、干支、岁运、太过不及与五音计算
- 司天、在泉、主气、客气与六步计算
- 结构化客主关系
- 规则事实解释

### 不包含

- UI 展示、用户权限、数据库或网络访问
- 对 `string | Date` 的接收或解析
- 具体历法库实现
- 医疗诊断、辨证、处方、方药、剂量、治疗、预后或个性化建议

领域层不参与医疗决策。其输出只能表达时间边界与当前实现基线中的规则映射事实，不能被表述为诊疗结论。

------------------------------------------------------------------------

## 3. 时间与历法端口

领域层唯一接受的时间值是绝对瞬时 `YunQiInstant`：

```ts
interface YunQiInstant {
  epochMilliseconds: number;
  timezone: 'Asia/Shanghai';
}
```

`timezone` 是 Phase 1 固定 UTC+08:00 语义的北京时间标签，不表示由领域层处理历史时区或夏令时规则。领域层不接收、解析或构造应用层的 `Date` 或时间字符串。

领域层只依赖以下历法端口：

```ts
type SolarTerm = '大寒' | '春分' | '小满' | '大暑' | '秋分' | '小雪';

interface CalendarProvider {
  getSolarTermInstant(year: number, term: SolarTerm): YunQiInstant;
}
```

调用方必须向需要节气边界的服务显式注入 `CalendarProvider`，领域层不提供默认 Provider，也不依赖 `tyme4ts`。应用层的 `string | Date` 只能在外部包 `@yunqi/calendar-adapter-tyme4ts` 中通过 `toYunQiInstant` 转换，再将所得 `YunQiInstant` 传入领域层。

时间边界遵循以下约定：

1. 运气年从当年大寒实际交节时刻开始，到下一年大寒实际交节时刻结束。
2. 六步分别以大寒、春分、小满、大暑、秋分、小雪的实际交节时刻为起点，终之气结束于下一年大寒实际交节时刻。
3. 运气年与六步区间统一采用左闭右开 `[start, end)`；交节精确时刻属于新区间，前一毫秒仍属于旧区间。
4. `epochMilliseconds` 保存绝对瞬时；所有领域展示和年份判定使用上述固定 UTC+08:00 北京时间语义。
5. 禁止用固定公历日期代替节气实际交节时刻。

------------------------------------------------------------------------

## 4. 核心实体

### YunQiYear

表示五运六气年度的干支身份。

```ts
interface YunQiYear {
  year: number;
  ganzhi: string;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}
```

### SuiYun

表示岁运。

```ts
interface SuiYun {
  element: '木' | '火' | '土' | '金' | '水';
  state: '太过' | '不及';
  tone: Tone;
}
```

### SixQiStep

表示六步。起止边界保留为绝对瞬时，客主关系保留为结构化结果。

```ts
type Qi =
  | '厥阴风木'
  | '少阴君火'
  | '太阴湿土'
  | '少阳相火'
  | '阳明燥金'
  | '太阳寒水';

type StepName = '初之气' | '二之气' | '三之气' | '四之气' | '五之气' | '终之气';

interface SixQiStep {
  index: 1 | 2 | 3 | 4 | 5 | 6;
  name: StepName;
  start: YunQiInstant;
  end: YunQiInstant;
  hostQi: Qi;
  guestQi: Qi;
  relation: HostGuestRelationResult;
}
```

### HostGuestRelationResult

客主关系不是单一字符串，而是四字段结构。各字段的完整联合类型如下：

```ts
type QiRelation = 'SAME_QI' | 'DIFFERENT_QI';

type ElementRelation = 'SAME_ELEMENT' | 'DIFFERENT_ELEMENT';

type HostGuestDirection =
  | 'NONE'
  | 'HOST_GENERATES_GUEST'
  | 'GUEST_GENERATES_HOST'
  | 'HOST_CONTROLS_GUEST'
  | 'GUEST_CONTROLS_HOST';

interface HostGuestRelationResult {
  readonly qiRelation: QiRelation;
  readonly elementRelation: ElementRelation;
  readonly direction: HostGuestDirection;
  readonly traditionalLabel: string;
}
```

`qiRelation`、`elementRelation` 与 `direction` 分层保存可计算事实；`traditionalLabel` 只呈现当前已实现映射对应的标签，不新增或推导规则表之外的专家结论。

------------------------------------------------------------------------

## 5. 核心服务

所有依赖节气边界的服务都要求显式 Provider 注入：

```ts
function calculateYunQi(
  input: YunQiInstant,
  provider: CalendarProvider,
): YunQiResult;

function calculateYearYunQi(
  year: number,
  provider: CalendarProvider,
): YunQiYearResult;

function getCurrentStep(
  input: YunQiInstant,
  provider: CalendarProvider,
): SixQiStep;
```

- `calculateYunQi` 返回输入瞬时所属运气年的完整结构及当前六步。
- `calculateYearYunQi` 返回指定运气年的年度结构；该年仍以实际大寒交节时刻为起点。
- `getCurrentStep` 返回输入瞬时唯一所属的六步。

------------------------------------------------------------------------

## 6. 不变量

必须满足：

1. 三之气客气 = 司天。
2. 终之气客气 = 在泉。
3. 六步时间连续，相邻步骤的 `end` 与 `start` 相等。
4. `[year.start, year.end)` 内任意瞬时只能属于一个六步。
5. 下一年大寒精确交节时刻只属于下一运气年。
6. 君火和相火不可合并；二者仅在五行层面同属火。

------------------------------------------------------------------------

## 7. 规则状态与变更边界

规则唯一来源是 `rules/PHASE1_IMPLEMENTATION_RULES_V1.md` 及领域包中的对应规则表。当前版本是 Phase 1 实现基线，仍受 `rules/RULE_FREEZE_NOTE.md` 的“待正式冻结”状态约束，不应表述为已经完成正式专家共识冻结。

本设计只对齐已经实现并测试的公共契约，不扩展客主关系、诊疗含义或其他专家规则。后续规则变更必须先更新可追溯规则来源、版本和测试，再修改领域实现。
