# YunQi Domain Phase 1 Verification

## 结论与边界

- 验证日期：2026-07-15（Asia/Shanghai）。
- 工作分支：`feat/yunqi-domain-phase1`。
- Task 6 基线：`0bfae2b30ed4268837f56e690151e4077ae296cb`。
- 实现范围：`packages/yunqi-domain`，以及本验证报告；未实现 React、登录、HIS、EMR、数据库、API 框架或大模型功能。
- 规则版本：`V1.0-2026.7.7-implementation.1`。
- 安全边界：解释仅包含确定性的时间边界和规则映射事实；自动化测试禁止诊断、辨证、证型、处方、方药、剂量、用药、治疗、预后和个性化建议词汇。
- `calculateStemBranch` 的干支规则循环测试逐年覆盖 1900–2100。
- 完整年度服务 `calculateYearYunQi` 的独立验收矩阵覆盖 2024–2028。
- Phase 1 不声明 BCE 或五位数公历年份支持。

## 交付文件树

```text
packages/yunqi-domain/
├── README.md
├── package.json
├── package-lock.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── calendar/
│   │   ├── beijing-time.ts
│   │   ├── calendar-provider.ts
│   │   ├── tyme-calendar-provider.ts
│   │   └── yunqi-year-resolver.ts
│   ├── explanation/
│   │   └── explanation-template.ts
│   ├── ganzhi/
│   │   └── stem-branch.ts
│   ├── liuqi/
│   │   ├── host-guest.ts
│   │   ├── sitian-zaiquan.ts
│   │   └── six-qi.ts
│   ├── relation/
│   │   └── host-guest-relation.ts
│   ├── rules/
│   │   └── phase1-rules.ts
│   ├── services/
│   │   ├── calculate-year-yunqi.ts
│   │   ├── calculate-yunqi.ts
│   │   └── get-current-step.ts
│   └── wuyun/
│       └── sui-yun.ts
└── tests/
    ├── acceptance.test.ts
    ├── calendar.test.ts
    ├── liuqi-rules.test.ts
    ├── public-api.test.ts
    ├── public-entry.test.ts
    ├── rules.test.ts
    ├── services.test.ts
    └── year-and-suiyun.test.ts

rules/
├── PHASE1_IMPLEMENTATION_RULES_V1.md
├── PHASE1_RULE_SOURCES.md
└── RULE_FREEZE_NOTE.md

docs/superpowers/verification/
└── 2026-07-15-yunqi-domain-phase1.md
```

`dist/`、`coverage/` 和 `node_modules/` 是被 `.gitignore` 排除的生成或安装目录，不属于交付源树。

## 实现说明

1. `src/rules/phase1-rules.ts` 是代码中的唯一映射表，完整承载 60 甲子、十干岁运、十二支司天在泉、主客气序列、六步名/边界、五行及关系优先级；所有根导出的规则对象和集合均运行时冻结。
2. `CalendarProvider` 隔离历法能力。默认冻结适配器以锁定的 `tyme4ts@1.5.2` 获取实际节气秒值。共享内部校验器在默认适配器、运气年 resolver 和六步构建器三个消费边界统一验证 finite epoch、可解析 ISO、同一瞬时和规范北京时间秒格式；该内部校验器不从包根导出。
3. 纯计算器按“绝对瞬时 → 北京公历年 → 实际大寒 → 运气年 → 干支/岁运/司天在泉 → 六步 → 客主关系”组合；所有边界左闭右开。
4. `calculateYearYunQi` 每次调用都新建并冻结一组确定性规则解释。解释覆盖实际年份起止、年干/岁运、年支/司天在泉、三之气等于司天和终之气等于在泉，不产生医疗判断。
5. `calculateStemBranch`、年度主服务与 `buildSixQiSteps` 均对非有限或非整数年份抛出 `RangeError('年份必须是有限整数')`；`buildSixQiSteps` 在调用 Provider 前完成校验。
6. `src/index.ts` 保留 Tasks 1–5 已审查的入口，不删除或替换既有 API；解释模板仅供年度服务内部组合，并通过 `calculateYearYunQi`/`calculateYunQi` 的 `explanations` 结果公开事实，不把 helper 暴露为根 API。根入口继续公开三个主服务、Provider 类型/默认适配器、公共结果类型和 `RULE_VERSION`。

## Starter Prompt 逐项证据

| Starter Prompt 要求 | 实现证据 | 直接测试证据 | 结论 |
| --- | --- | --- | --- |
| 只实现 `packages/yunqi-domain` | `packages/yunqi-domain/package.json`、本报告的范围审计 | `npm ls --omit=dev` 运行时仅 `tyme4ts@1.5.2`；禁止依赖 `rg` 无匹配 | 通过 |
| 纯函数领域包 | `src/ganzhi`、`src/wuyun`、`src/liuqi`、`src/relation`；唯一外部能力经参数化 `CalendarProvider` 注入 | `services.test.ts` 的 injected Provider identity 三项测试 | 通过 |
| 严格时间输入 | `calendar/beijing-time.ts` 捕获固定语法字段，并按输入 offset 对本地字段 round-trip | `calendar.test.ts` 拒绝 02-30、非闰年 02-29、04-31、24:00 和非契约语法；接受 2024-02-29、1–3 位毫秒，以及正负/非整小时 offset | 通过 |
| 1. 运气年判断 | `calendar/yunqi-year-resolver.ts` | `year-and-suiyun.test.ts` 的 exact 2024 Dahan second，以及 malformed Dahan Provider 的 finite/ISO/同瞬时/canonical 四项拒绝；`services.test.ts` 七个边界行 | 通过 |
| 2. 年干支 | `ganzhi/stem-branch.ts` | `year-and-suiyun.test.ts` 的 60-cycle、2044 回环，以及 `calculateStemBranch` 在 1900–2100 的逐年干支规则循环测试 | 通过 |
| 3. 岁运 | `wuyun/sui-yun.ts` | `year-and-suiyun.test.ts` 的 2024–2028 与 fresh-object 测试 | 通过 |
| 4. 太过不及 | `STEM_RULES` 与 `calculateSuiYun` | `acceptance.test.ts` 的五个独立 scratch 年度行 | 通过 |
| 5. 司天在泉 | `liuqi/sitian-zaiquan.ts` | `liuqi-rules.test.ts` 的十二支完整映射 | 通过 |
| 6. 主气 | `liuqi/host-guest.ts#getHostQi` | `liuqi-rules.test.ts` 的六个 1-based 主气位置 | 通过 |
| 7. 客气 | `liuqi/host-guest.ts#calculateGuestQi` | 十二支不变量及 `acceptance.test.ts` 的 2024–2028 六项客气序列 | 通过 |
| 8. 六步 | `liuqi/six-qi.ts` | `services.test.ts` 的完整 2024 时间轴、七个边界前一秒/交界秒、Provider 双表示、冻结断言，以及 invalid year 时 Provider 0 calls | 通过 |
| 9. 客主关系 | `relation/host-guest-relation.ts` | 六类代表值、6×6 全组合，以及 2024–2028 独立关系序列 | 通过 |
| Vitest：60 甲子 | `SIXTY_CYCLE` 完整 60 项冻结序列 | `rules.test.ts` 精确顺序/唯一性；`year-and-suiyun.test.ts` 完整循环 | 通过 |
| Vitest：2024–2028 | 不从生产表生成验收期望 | `acceptance.test.ts` 内的 scratch 常量直接断言干支、岁运 element/state/tone、司天、在泉、六客气和六关系 | 通过 |
| Vitest：大寒边界 | Provider 的真实秒值 | 2024 大寒前一秒/交界秒；2025 下一大寒前一秒/交界秒 | 通过 |
| Vitest：全部六步边界 | 六个同年 term start 加下一年大寒 | `services.test.ts` 七行参数化测试，每行均断言前一秒与交界秒 | 通过 |
| 三之气 = 司天 | 客气以司天对齐第三项 | 十二支测试、五年验收和 2024 service 断言 | 通过 |
| 终之气 = 在泉 | 客气第六项与在泉一致 | 十二支测试、五年验收和 2024 service 断言 | 通过 |
| 文件结构 | 本报告“交付文件树” | `rg --files`/工作树审计 | 通过 |
| 实现说明 | 本报告“实现说明” | 源文件和测试逐项互证 | 通过 |
| 测试结果 | 本报告“命令与结果” | Vitest/typecheck/build/coverage/依赖树均为 fresh exit 0 | 通过 |
| 未解决问题 | 本报告“唯一已知未决项” | `rules/RULE_FREEZE_NOTE.md`、`rules/PHASE1_IMPLEMENTATION_RULES_V1.md` | 已明确 |

## Task 6 TDD 证据

### RED

1. `npm test -- tests/public-api.test.ts tests/acceptance.test.ts`：exit 1。`public-api.test.ts` 因 `../src/explanation/explanation-template.js` 不存在而无法导入；`acceptance.test.ts` 的五个独立年度矩阵行通过，解释断言明确显示期望 6 条事实、实际收到 `[]`。
2. 增加模板模块但尚未接入服务后，同一命令仍 exit 1：10 项中 4 项失败，证明服务仍返回空集合并共享该集合；其中一项来自当时草案的公共 helper identity 期待，该边界已由后续独立审查纠正为内部实现。
3. `npm test -- tests/year-and-suiyun.test.ts`：exit 1，15 项中 4 项失败。`NaN`、`Infinity`、`-Infinity` 和 `2024.5` 均收到旧的 `TypeError: Cannot read properties of undefined (reading '0')`，而非要求的描述性 `RangeError`。

### GREEN

- `npm test -- tests/public-api.test.ts tests/acceptance.test.ts`：exit 0，2 files / 10 tests。
- `npm test -- tests/year-and-suiyun.test.ts`：exit 0，1 file / 15 tests。
- 安全测试逐字断言六条事实，并以中英文禁止词模式检查诊断、证型、处方、药物、剂量、治疗、预后和个性化建议语言。
- 不可变性测试确认两次结果内容相等但解释数组引用不同，两个集合均冻结；动态枚举的全部根导出 singleton/collection 及嵌套规则值均冻结。

### 独立审查修复

- RED：将公共边界测试改为断言根入口不含 `createYearExplanations` 后，`npm test -- tests/public-api.test.ts tests/acceptance.test.ts` exit 1；10 项中唯一失败明确显示实际为 `true`、期望为 `false`。
- GREEN：删除 `src/index.ts` 的 helper 根导出后，`npm test -- tests/public-api.test.ts tests/acceptance.test.ts tests/year-and-suiyun.test.ts` exit 0；3 files / 25 tests。
- 解释模板仍由 `calculateYearYunQi` 内部使用；六条事实、安全词、新集合和冻结行为继续通过主服务结果测试。
- 全仓 `rg` 措辞审计确认：README 与本报告的 1900–2100 均仅描述 `calculateStemBranch` 干支规则循环测试；完整年度服务验收均明确为 2024–2028。

## 最终审查修复 TDD 证据

### RED

在任何生产代码修改前运行：

```text
npm test -- tests/calendar.test.ts tests/year-and-suiyun.test.ts tests/services.test.ts
```

结果为 exit 1；3 files failed，13 tests failed / 49 passed：

- 5 个带时区但语法或字段溢出的字符串均未抛错，证明旧实现把 `Date.parse` 的宽松规范化误当成合法输入；
- 4 个 malformed Dahan Provider（non-finite epoch、invalid ISO、同瞬时非规范 `Z`、ISO/epoch mismatch）均未抛错，证明 resolver 在年比较前没有校验 Provider 双表示；
- `NaN`、`Infinity`、`-Infinity`、`2024.5` 四个六步年份均先触发测试 Provider 的 sentinel error，证明年份守卫发生在 Provider 调用之后。

同一 RED 运行中，合法闰日和现有 `.987Z` 兼容性断言通过。

### GREEN

- 首次最小实现后，affected focused command exit 0；3 files / 62 tests passed。
- 严格字符串解析只接受 `YYYY-MM-DDTHH:mm:ss`、可选 1–3 位毫秒及 `Z`/`±HH:mm`，使用捕获字段与 offset 后本地字段 round-trip 拒绝自动规范化。
- Provider 双表示校验抽为 `beijing-time.ts` 的共享内部 utility，由默认 tyme adapter、resolver 和 six-qi 共同调用，但不从包根导出。
- `buildSixQiSteps` 在任何 Provider 调用前拒绝非有限或非整数年份。
- `rules/PHASE1_RULE_SOURCES.md` 的 EOF 额外空行已删除；formal-freeze 状态未改变。
- 整分支复审后的测试收口将 `.01Z`、`+05:30` 和 `-04:30` 固化为精确瞬时回归用例；该项是对已验证正确行为的 characterization coverage，生产代码未再改变。

## 命令与结果

以下命令均在 `packages/yunqi-domain` 执行（Git 命令在仓库根执行），记录的是最终审查修复后的 fresh 结果：

| 命令 | 结果 |
| --- | --- |
| `npm test -- tests/calendar.test.ts tests/year-and-suiyun.test.ts tests/services.test.ts` | exit 0；3 files / 64 tests passed |
| `npm test` | exit 0；8 files / 107 tests passed，0 failures |
| `npm run typecheck` | exit 0；`tsc -p tsconfig.json --noEmit` 无诊断 |
| `npm run build` | exit 0；`tsc -p tsconfig.json` 成功生成声明与 ESM 输出 |
| `npm run test:coverage` | exit 0；8 files / 107 tests；statements 93.71%，branches 89.41%，functions 100%，lines 93.63% |
| `npm ls --all` | exit 0；完整开发树可解析；68 行 `UNMET OPTIONAL DEPENDENCY` 均为可选平台或可选集成，无 `ELSPROBLEMS` |
| `npm ls --omit=dev` | exit 0；运行时树只有 `tyme4ts@1.5.2` |
| `git diff --check` | exit 0；无空白错误 |
| 禁止依赖键 `rg` 扫描 | exit 1；零匹配，符合预期 |
| `git diff --cached --check` | exit 0；2 个最终测试收口文件无空白错误 |
| `git diff --check fc97cbe9654ec2c38a65c236faab5b50bd215341..HEAD` | exit 0；从初始化基线至修复提交无空白错误，原 `PHASE1_RULE_SOURCES.md` EOF 额外空行已消除 |

禁止依赖审计对 `package.json` 与 `package-lock.json` 的包键搜索 React、Fastify、数据库客户端、OpenAI/模型 SDK、HIS 和 EMR 标识；`rg` 原始退出码为 1（零匹配），符合预期。

## 依赖审计

- 唯一直接运行时依赖：`tyme4ts@1.5.2`（精确版本，无范围符号）。
- 直接开发依赖：`typescript@7.0.2`、`vitest@4.1.10`、`@vitest/coverage-v8@4.1.10`。
- 未发现 React、Fastify、PostgreSQL/Prisma/MySQL/MongoDB/SQLite/Redis 等数据库客户端、OpenAI/Anthropic/Google GenAI/LangChain 等模型 SDK、HIS 或 EMR 包。
- `package.json` 和 `package-lock.json` 在 Task 6 未发生变更。

## 唯一已知未决项

Phase 1 规则版本 `V1.0-2026.7.7-implementation.1` 仍是“待正式冻结”的实现基线。规则来源、工程分类和证据边界已记录在 `rules/PHASE1_RULE_SOURCES.md`，但正式共识冻结不属于本实现任务，不能将当前计算结果表述为已经完成临床规则批准。除这一 formal freeze 外，本次验收未识别出其他已知 Phase 1 交付缺口。
