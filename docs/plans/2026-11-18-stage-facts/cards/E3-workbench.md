# E3 Workbench：运关系、阶段副标题、进度分割

## 允许修改

`apps/yunqi-workbench/**`、`scripts/check-yunqi-workbench-governance.mjs` 及其根测试、`tests/browser/**`、`docs/agents/workbench.md`（局部）、本计划 `evidence/`。
不改 Domain、Service、Contracts、Client、OpenAPI。

## 必读

- `docs/agents/workbench.md`、`docs/design/README.md`、`docs/design/design-system/2-constraints.md`
- `docs/contracts/YQ-API-CONTRACT-1.3.0.md`
- `features/yunqi/components/CurrentYunQiPage.tsx`、`CurrentYunQiParts.tsx`、对应 presentation mapper、`presentation/visual-mappings.ts`、`styles/views/current-yunqi.css`
- `components/layout/PanelShell.tsx` 收起态胶囊、`features/yunqi/birth/presentation/map-birth-view.ts`
- `tests/browser/` 当下页、胶囊、视觉矩阵相关用例

## 要求

1. **阶段副标题**（当下页“气”“运”两段对称）：
   - 气：`{startTerm} → {endTerm} · {进度文案}`；运：`{startLabel} → {endLabel} · {进度文案}`。
   - 进度文案：`remainingCalendarDays > 0` → “还有 N 天”；等于 0 → “今日 HH:mm 交气”/“今日 HH:mm 交运”，HH:mm 截取当前步/当前运 `end.localTime`。
   - 取代 D1 的 compact 起止时刻副标题；完整时刻仍在“精确时刻/计算说明与版本”中可达。
2. **运关系标签**：运段新增与气段同款的关系标签，文字为 DTO `traditionalLabel`，后接说明如“客金生主水”——
   只允许用 DTO 的 host/guest 五行与 `direction` 拼接（方向→“生/克”的展示映射），不写五行生克表。`elementRelation` 为同五行时显示 traditionalLabel 即可。
   语气映射写在 `visual-mappings.ts`：生（两个方向）→ 相合（蓝）；同五行 → 中性；克（两个方向）→ 中性（专家确认前不用相违色）。
   “其余阶段”列表中的运行可复用同一映射显示各步关系（如布局允许；不允许则报告）。
3. **进度条**：当前段内“已过”部分为实色硬边填充，宽度 = `elapsedRatio × 100%`（经 ViewModel 传入，CSS 自定义属性或 inline style 均可）；
   未过部分保持当前段的底色，分割处为硬边（不用渐变、不对分割边做圆角）。原计划“2px 宽”理解为分割处的硬边标记，可用 2px 的 `accent` 竖线或直接硬边，
   以清晰为准并在报告中说明。可访问名称在当前步追加“已过约 N%”（N 取整，由 ratio×100 四舍五入，属展示格式化而非时间运算）。
4. **收起态胶囊**：可选第二行“还有 N 天”。仅当在 400×64 内不改变胶囊尺寸、不触发字号断言失败、axe 零违规时实现；否则不做并在报告中说明。
5. **先天对照“所处运”**：保持现有出生客运 × 当前客运的 DTO `comparisons` 关系，不替换为主客运关系（混层，见计划 README 调整表）。只核实该行无 UI 自算。
6. **治理断言**：`check-yunqi-workbench-governance.mjs` 增加检查——workbench 非测试源码中不得出现包含 `大寒|春分|小满|大暑|秋分|小雪` 中任意两项及以上的数组字面量；
   根测试补正反例。UI 不得出现时间差运算（现有时间治理已覆盖的除外）。
7. 页脚“五步运为教学口径，待专家确认 · 辅助参考，不作诊断依据”不变。

## 检查（机械约束）

- 单测：副标题两种文案分支、四种语气映射、进度宽度来自 ratio、胶囊（若实现）。
- 浏览器：当下页副标题文本、运关系标签存在且语气 class 正确、当前段已过填充宽度 ≈ ratio×段宽（±1px）、无渐变（computed `background-image` 为 none）；
  400×860、1366×768、1920×1080 三档截图；axe 零违规；现有 5 档字号断言仍过。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`、`pnpm test`
- `pnpm test:browser`（评审方运行）

## 不做

Domain/契约变更、“相得/顺/逆”、相违色、HIS/病历/宿主停靠。
