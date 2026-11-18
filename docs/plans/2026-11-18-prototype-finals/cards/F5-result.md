# F5 体质结果：结果组合 1

## 目标

按[参考稿 05](../reference/05-result.html)整理结果页：判定卡（标题旁加“倾向”染色标签）、九质转化分条形卡、与运气互参卡。

## 必读

- 本计划 `README.md` 中关于“条形顺序”和“倾向标签”的两行调整，以及参考稿 `reference/05-result.html`
- `features/constitution/components/ConstitutionResults.tsx` 及其单测
- `features/constitution/presentation/map-constitution.ts`
- `styles/views/constitution.css`
- `tests/browser/constitution-actions.flows.spec.mjs`、`constitution-helpers.mjs`、`workbench.visual.spec.mjs`

## 要求

1. **判定卡**：
   - 眉标“判定”。
   - 下一行左侧是宋体 30/1.1/700 的标题，规则沿用 D3：平和质 / 单一偏颇质名 / “偏颇质兼夹”。
   - 标题右侧依次排列“倾向”体质的染色标签，写作 `<简称> 倾向`（如“阳虚 倾向”），用 RelationChip 相合语气（`relation-favorable`），**不带分数**。多个时换行排列，与标题垂直居中。
   - 标题为“偏颇质兼夹”时，标题下方一行用中性标签列出全部“是”的体质，沿用 D3。
   - 判定规则说明（`meta`）放在卡片最后一行。
2. **条形卡**：
   - 眉标“九质转化分”，右侧“刻度 30 · 40”。
   - 每行依次为：简称（宽 52）、8px 条形、分数（宽 36，等宽数字），30 与 40 两条刻度线。
   - 条形配色：“是”用 `data-primary`，“倾向”用 `data-secondary`，其余用 `data-neutral`。
   - 顺序保持标准附录顺序，不按分数排序。
3. **互参卡**：眉标“与运气互参”，下面三个等宽小块：
   - 体质：“是”的简称，加“· 倾向”简称；
   - 先天：有出生资料时显示摘要，没有时写“未填写”；
   - 当下：当步客气摘要。

   卡片最后一行写 `meta`：“体质、先天、当下三者并列供医师综合判断，系统不自动辨证、不给方药。”
4. **页头与操作区**：页头保持现行的“体质测评结果 · 版本 · 题数 · 时间”。操作区保持 D3：左侧“‹ 返回修改”文字按钮，右侧“结束并销毁答卷”次按钮。
5. 所有标签、条形颜色与说明的语义都来自 mapper 已有的判定状态（yes / tendency / basically / no）。组件内不比较分数。

## 检查（机械约束）

- 单测：四种标题情形（平和质；单一偏颇质；偏颇质兼夹；无“是”只有“倾向”），倾向标签的数量、文字与语气，条形顺序与 DTO 标准顺序一致。
- 浏览器：倾向标签与标题在同一行，`boundingBox` 的垂直中心差 ≤2px；标签内不含数字；`axe` 零违规。

## 不做

不改计分、判定规则、作答页（F4）和操作区行为；不实现“复制结论到病历”；不改 Service/Domain/Contracts/Client。

## 验收标准

- 结果页结构与参考稿一致，条形保持标准顺序，倾向标签不带分数。
- 全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
