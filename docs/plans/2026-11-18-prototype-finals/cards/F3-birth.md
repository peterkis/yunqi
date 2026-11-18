# F3 先天对照：B02 镜像中轴

## 目标

按[参考稿 03](../reference/03-birth.html)把对照表改成“先天 | 关系 | 当下”镜像布局，关系放在中轴，左右两侧对称阅读。

## 必读

- 参考稿 `reference/03-birth.html`
- `features/yunqi/birth/components/BirthComparisonPage.tsx`、`BirthComparisonTable.tsx`、`BirthAssessmentSession.tsx`
- `features/yunqi/birth/presentation/map-birth-view.ts`
- `styles/views/birth.css`
- `tests/browser/birth-assessment.flows.spec.mjs`、`birth-helpers.mjs`、`workbench.visual.spec.mjs`

## 要求

1. 摘要条（D1 实现）、先天原文线索卡、底部主按钮“同时测评体质”保持不变。
2. **对照卡列头**为三列 `minmax(0,1fr) 96px minmax(0,1fr)`：
   - 左列右对齐，写眉标“先天”和宋体 26 的出生年干支。
   - 中列写 `meta`“关系”。
   - 右列左对齐，写眉标“当下”和宋体 26 的当下干支。
   - 年份与当下时间不进列头，保留在摘要条与现有说明位置。
3. **每个维度一行**，同样三列，行间用 1px `border-subtle` 分隔：
   - 左列右对齐：先天值加五行圆点，**圆点在值之后**；下一行 `meta` 写音名或主客明细，没有则留空位，保持行高一致。
   - 中列居中：上方 `meta` 写维度名（岁运 / 司天 / 在泉 / 所处气 / 所处运），下方 20px 高的 RelationChip，语气沿用现有映射。
   - 右列左对齐：五行圆点加当下值，**圆点在值之前**；下一行 `meta` 写明细。
4. 原表格里每行下方的说明句（如“金生水”）改为 RelationChip 的读屏文本（`visually-hidden`），视觉上不再单独占一行。
5. 结构用真实表格语义：`<table>` 加 `<th scope="col">` 与 `<th scope="row">`（维度名所在的中列单元格为行标题），保证读屏按行朗读“维度、先天、关系、当下”。视觉布局用 CSS Grid 或表格样式实现均可。
6. 出生时刻不详、存在多个候选时，现有的多候选展示方式不变，每个候选各自一张镜像卡。

## 检查（机械约束）

- 单测：五行维度齐全，关系标签的文字与语气正确，读屏文本包含说明句，行标题与列标题的语义正确。
- 浏览器：400×860 下，每行左列值的右边缘到中轴的距离与右列值的左边缘到中轴的距离相等（误差 ≤2px）；1366×768 下提交后，列头与岁运行在视口内（沿用 D1 断言）。

## 不做

不改出生表单、摘要条、原文线索、主按钮和多候选逻辑；不改 Service/Domain/Contracts/Client。

## 验收标准

- 镜像中轴布局与参考稿一致。
- 读屏顺序正确。
- 全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
