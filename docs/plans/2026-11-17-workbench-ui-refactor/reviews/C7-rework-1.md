# C7 第1轮返工记录（2026-11-17）

基线主检出`feat/workbench-ui-refactor` / `62df8ab`；保留本轮开始时已有C7实现、评审与证据。
本轮未执行git add/commit/push，未切分支或改git配置。

## 1. 完成内容

- DONE：删除出生mapper中的`elementNames`、`qiElements`、`comparisonTones`三张本地表。
  五行直接使用`visual-mappings.ts`的`mapMovementElement` / `mapQiElement`；关系复用
  `mapBirthComparison → mapRelation → mapRelationTone`已生成的ViewModel，取消二次覆盖。
  `ElementKind`与`LearningRelationViewModel`复用现有类型。
- DONE：保留原出生展示10例；共享分类60例扩展至出生mapper，覆盖出生/当前两侧五行、全部已知关系、
  未知/近似标签、空值、`constructor` / `__proto__`。未知关系中性，未知五行不分配色彩。
  现有五种出生关系、五行事实、文案、精确时刻、原文、候选次序与页面交互的回归仍通过。
- DONE：全仓rg检索及175个生产TS/JS模块的对象表复核，运行时视觉映射仅`visual-mappings.ts`一处，
  包含关系标签、关系方向、六气、五行四张表。其余命中为类型、直接传递、测试期望或规则一致性oracle，未发现第三份运行时视觉映射。

## 2. 本轮修改文件

1. [map-birth-view.ts](../../../../apps/yunqi-workbench/src/features/yunqi/birth/presentation/map-birth-view.ts)：共享五行映射，保留已映射关系，删除本地表。
2. [visual-mappings.test.ts](../../../../apps/yunqi-workbench/src/features/yunqi/presentation/visual-mappings.test.ts)：共享用例覆盖出生mapper，保留原测试。
3. 本返工记录`C7-rework-1.md`：追加证据，不改旧记录。

| 源文件 | SHA-256 |
| --- | --- |
| `apps/yunqi-workbench/src/features/yunqi/birth/presentation/map-birth-view.ts` | `cdefd84ffca70b56a17b35ea7b752fcfbbe71680e4b8eeb7ec898693c5384616` |
| `apps/yunqi-workbench/src/features/yunqi/presentation/visual-mappings.test.ts` | `7a5880a6402f58961f5f827e8bd49863cdd70635d641c05c32d91787e294a100` |

## 3. 检查结果

| 命令 | 状态 | 退出码与结果 |
| --- | --- | --- |
| `pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/presentation/visual-mappings.test.ts src/features/yunqi/birth/presentation/map-birth-view.test.ts`（修复前） | FAIL（预期RED） | 1；扩展断言暴露旧实现22失败/48通过，包括已知语气不一致及原型属性名回退 |
| 同一定向命令（修复后） | PASS | 0；70/70通过，未删除原案例 |
| `pnpm test` | PASS | 0；Workbench59文件、352例通过，根测试包含4条browser fixture回归 |
| `pnpm typecheck` | PASS | 0 |
| `pnpm test:coverage` | PASS | 0；Workbench语句99.22%、分支97.97%、函数99.62%、行99.49%，阈值与exclude未变 |
| `pnpm schema:validate` | PASS | 0 |
| `pnpm contracts:check` | PASS | 0 |
| `pnpm test:project-guidance` | PASS | 0 |
| `pnpm test:browser` | NOT_RUN | 无退出码；按本轮要求，沙箱不能启动Chromium |
| `node --check <file>`（全部16个浏览器模块） | PASS | 全部0 |
| `pnpm exec playwright test --list` | PASS | 0；147例/9文件，仅为发现数 |
| 全仓rg及生产对象表复核 | PASS | 0；唯一运行时视觉映射源为`visual-mappings.ts` |
| `git diff --check` | PASS | 0 |
| 本轮前已有修改/评审/证据哈希核对 | PASS | 0；除上述两个源码文件外，已有文件及删除状态保持一致 |

全仓检索包含`wood/fire/earth/metal/water/favorable/adverse/neutral`、旧表名与中文键值，
复核类型声明、组件直接使用、量表状态样式与规则测试，未把它们误算为五行/关系视觉映射表。
原始RED、GREEN、门禁、检索、基线哈希日志保存在本机忽略目录`.artifacts/c7/2026-11-17-rework-1-zv2_nlro`；本记录保留可移植摘要与源码哈希。

## 4. 与设计规范或原型的差异

无新增视觉或交互差异。此次只收敛展示映射来源；组件、CSS、路由、浏览器用例和版本化规则/契约均未修改。

## 5. 待决问题或风险

本轮浏览器NOT_RUN，不把评审方上一轮147通过冒称本次实跑；当前发现数仍为147。
本轮必改项已完成，旧实现记录中的出生映射重复问题由本记录解决，旧证据保留原样。
