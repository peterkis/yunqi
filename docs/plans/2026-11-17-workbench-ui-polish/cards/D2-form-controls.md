# D2 表单控件统一与量表性别折叠

## 目标

去掉破坏统一感的原生控件；作答开始后性别不再占首屏。

## 必读

- 本计划 `README.md`、`source-checklist.md` P0-4、P0-5
- `docs/design/design-system/README.md` 与 `2-constraints.md`（控件、可访问性、高度令牌 `--input-height`、`--segment-height`）
- `components/design/*`（尤其 `SegmentedNav.tsx`、`Button.tsx`、`ScaleOption.tsx`）、`styles/design-components.css`
- `features/yunqi/birth/components/BirthComparisonPage.tsx`（D1 后的折叠表单）、`styles/views/birth.css`
- `features/constitution/components/ConstitutionForm.tsx`、`styles/views/constitution.css`
- `features/yunqi/year-analysis/components/YearSelector.tsx`、`YearEntryPage.tsx`、`styles/views/drilldown.css`
- `tests/browser/birth-helpers.mjs`、`constitution-helpers.mjs`、`design-foundations.flows.spec.mjs`

## 要求

1. **DateField**（`components/design/DateField.tsx`）：年 / 月 / 日三段数字输入，`inputmode="numeric"`，满位自动跳到下一段，退格在空段时回到上一段；
   对外值为 `YYYY-MM-DD` 字符串或空。只做字符串与整数位数校验（年 1900–2100、月 1–12、日 1–31），不用 Date/Intl 判断月份天数；
   非法日期仍由 API 校验返回并按现有错误路径展示。整体有一个可见标签“出生日期（公历）”，三段各有可访问名称（年/月/日）。
   出生时刻同理可用 `HH:mm[:ss]` 两/三段，或保留 `type="time"` 但统一样式；二选一，在报告中说明。
2. **SegmentedControl**（`components/design/SegmentedControl.tsx`）：按钮型分段（不依赖路由），`role="radiogroup"` + `role="radio"`/`aria-checked`，
   方向键切换，30px 变体与现有 compact 分段视觉一致。用于：量表性别（男 / 女）、出生时刻（时刻不详 / 已知时刻）。
   不改 `SegmentedNav`；原文页的“全年 / 当下阶段”不在本卡迁移。
3. 全局 `accent-color: var(--accent)`，覆盖仍存在的原生复选/单选。
4. **年度页**：进入 `/yunqi/year`（无年份）时默认选中当前运气年。当前运气年必须来自 API（当下查询的 DTO/ViewModel 字段），不得用本机时钟；
   API 不可用时保持现有空态。下拉框统一 `--input-height`、`radius-sm`、内联 SVG 自定义箭头（`appearance: none`），保持原生 `<select>` 可访问性。
5. **量表性别折叠（P0-5）**：开始作答（已选性别且进入第一题）后，性别区折叠为眉标“男性版 · 更换”/“女性版 · 更换”；
   “更换”先弹出页内确认（文字说明“更换将清空已作答的 N 题”，确认 / 取消两个按钮，焦点管理正确，Esc 取消），确认后才清空答卷并回到性别选择。
   未作答任何题时可直接更换，无需确认。
6. 本地文档：在 `docs/agents/workbench.md` 的组件一节与 `docs/design/README.md` 的本地扩展一节记录 DateField、SegmentedControl 的用途与约束。
   不改 `docs/design/design-system/**`。

## 检查（机械约束）

- 单测：DateField 跳格、退格、粘贴 `1980-03-12`、范围校验；SegmentedControl 键盘与 ARIA；性别更换确认/取消/零作答直接更换。
- 浏览器：改写 `birth-helpers.mjs` 与 `constitution-helpers.mjs` 的填写方式；新增一条用例覆盖更换性别确认流程；
  断言先天页与量表页不存在 `input[type="date"]` 与 `input[type="radio"]`；年度页直接进入时选中值等于当下 API 年份。
- axe 零违规（含新组件）。

## 不做

结果页与操作区（D3）、当下页与原文页（D4）、动效（D5）。不改 Service/Domain/Contracts/Client。

## 验收标准

- 先天、量表、年度页无浏览器默认样式控件（`<select>` 仅保留原生元素但统一外观）。
- 作答中首屏不再出现性别选择；更换有确认。
- 全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
