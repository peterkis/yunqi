# E2 评审（第 1 轮）：通过（评审方补一处机械修改）

- 评审人：Claude；日期 2026-11-18；对象：Codex 实现（未提交工作区）。
- 结论：**通过**。无返工轮；评审方补做卡片范围遗漏的 Workbench 契约 ID 断言更新。

## 核对

- Schema：`SixQiBoundaryTerm` 六值闭合枚举；`StageProgressDto`（0 ≤ ratio < 1、整数日 ≥ 0）；`MovementRelationDto` 复用 `HostGuestRelationDto` 的三项字段定义、无 `qiRelation`；
  `YunQiCalculationDto.currentStepProgress`、`MovementStepDto.relation/startLabel/endLabel`、`YunQiLearningDto.currentMovementProgress` 均 required、闭合。year 不带进度。
- Mapper 只复制 Domain 字段，无业务计算；时间仍经 time-normalizer。
- `x-yunqi-contract-id` 1.3.0；registry 追加；1.0/1.1/1.2 freeze 与 `main` 无差异（`git diff --stat main` 为空）。
- `scripts/yunqi-contract-projection.mjs` 仅把 learning 路径的必选范围扩到 1.3.0，必要且最小；治理测试增补差异白名单与变异检查。
- 契约文档写明出生候选进度的含义（相对候选取样时刻，仅结构复用）与 learning `ruleVersion` 迁移。

## 评审方修改

卡片“允许修改”只放行 Workbench 夹具，导致 Workbench 中对当前契约 ID 的精确断言（4 个单测、`contract.typecheck.ts`、2 个浏览器用例、README）仍为 1.2.0。
这些是随契约升级的机械替换，评审方直接改为 1.3.0（含正则写法 `1\.3\.0`），不涉及界面行为。

## 评审方本机门禁

`pnpm test`、`typecheck`、`test:coverage`、`contracts:check`、`test:contract-governance`、`schema:validate`、`test:project-guidance`、
`test:time-governance`、`test:workbench-governance` 全部 PASS；`test:browser` 208 项 PASS。
