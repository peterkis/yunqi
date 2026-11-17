# D3 体质结果标题与主操作入操作区

## 目标

结果第一眼只占一行；每个视图唯一主操作放在底部操作区。

## 必读

- 本计划 `README.md`「与清单的调整」P0-2 一行（**不按分数排序**）、`source-checklist.md` P0-2、P1-8
- `packages/yunqi-domain/src/constitution/assessment.ts`（只读，了解 `matchedTypes`/`tendencyTypes`/`summary` 语义）
- `features/constitution/components/ConstitutionResults.tsx`、`ConstitutionForm.tsx`、`ConstitutionAssessmentPanel.tsx`、`styles/views/constitution.css`
- `features/yunqi/birth/components/BirthComparisonPage.tsx`、`BirthAssessmentSession.tsx`
- `components/layout/PanelShell.tsx`（`actions` 操作区）、`app/AppRoutes.tsx`、`components/design/PanelHeader.tsx`

## 要求

1. **结果标题（P0-2）**：第一眼（`display-lg` 30）只放一行：平和质判定成立 → “平和质”/“基本是平和质”（按 DTO 原意）；一种偏颇质“是” → 其名；
   多种 → “偏颇质兼夹”。**不按转化分挑主体质**。下方：“兼夹”行按标准附录顺序（DTO 顺序）用中性 RelationChip 列出全部“是”；“倾向”另起一行。
   不再重复整串文字；DTO `summary` 与 `boundaryNote` 仍须可达（可放在说明区）。标题在 400px 下单行，不截断（无省略号）。
2. **操作区（P1-8）**：通过 `PanelShell` 的 `actions` 渲染底部操作区，每个视图最多一个黛青实底主按钮：

   | 页面 | 操作区 |
   | --- | --- |
   | 先天 · 未提交 | 主按钮“查看对照”（提交表单，`form` 属性关联） |
   | 先天 · 已提交 | 主按钮“同时测评体质” |
   | 量表 · 作答中 | 左侧次按钮“结束并销毁答卷” |
   | 量表 · 结果 | 左“结束并销毁答卷”（次）+ 右“返回修改”（文字按钮） |

   内容流中删除对应重复按钮。结果页去掉错位的“返回修改 体质测评结果”行，页面标题由 PanelHeader 下钻样式承担。
   操作区在 400×640 最小高度下固定可见（不随内容滚动）。键盘顺序：内容 → 操作区 → 页脚。
3. 先天页内嵌测评（`BirthAssessmentSession`）与独立量表页共享同一操作区规则，不出现两个主按钮。

## 检查（机械约束）

- 浏览器：命中 1、2、7 种偏颇质时标题 `getClientRects().length === 1` 且高度 ≤ 一行行高；兼夹 chip 数等于 `matchedTypes` 数；
  每个视觉状态黛青实底按钮 ≤ 1 且位于 `.panel-shell__actions`；400×640 下操作区在视口内。
- 单测：标题三种分支、chip 顺序与 DTO 一致、操作区按钮随状态切换。

## 不做

按分数排序、新增判定规则；控件（D2）；一致性（D4）；动效（D5）。不改 Service/Domain/Contracts/Client。

## 验收标准

- 标题恒为一行；主操作均在操作区；全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）

## 补充（D2 评审遗留）

- 量表作答页：眉标“男性版 · 更换”与进度行“GB/T 46939-2025 · 男性版 · 26 题”重复“男性版”。保留眉标中的版本与“更换”，进度行去掉版本，只留标准号与题数。
