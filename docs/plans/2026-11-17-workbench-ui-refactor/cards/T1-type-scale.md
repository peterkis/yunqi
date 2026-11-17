# T1 全应用字号阶梯统一

## 目标

按 [字号统一决定](../../../design/type-scale.md) 把 Workbench 所有界面的字号收敛到 5 档：首眼 40/30/24（每屏只用其一）、标题 20、原文 15、正文 14、小字 12。
在 C3、C4、C6 合并后的分支上执行，统一 C1–C6 已完成部分。

## 必读

- `docs/design/type-scale.md`（本卡依据，含合并对照表）、`docs/design/design-system/README.md`「字号与排版」
- `apps/yunqi-workbench/src/styles/tokens.css`、`design-components.css`、`panel-shell.css`、`src/styles/views/*.css`
- `tests/browser/*.visual.spec.mjs`、`design-foundations.flows.spec.mjs`、`fixtures.mjs`

## 要求

1. 新建 `src/styles/type-scale.css`：定义档位变量（如 `--ts-display-hero`、`--ts-display-result`、`--ts-display-column`、`--ts-title`、`--ts-quote`、`--ts-body`、`--ts-small` 及对应行高、字重），值只引用已有令牌变量（`var(--type-display-xl-size)` 等）。在入口中于 `tokens.css` 之后引入。
2. 所有 Workbench 样式中的 `font-size` 改为只用档位变量；删除 C1 的字号类组件常量（13/13.5px 等）及对 `--type-value-*`、`--type-body-sm-*`、`--type-label-*`、`--type-meta-*`、`--type-micro-*`、`--type-question-*`、`--type-quote-sm-*` 字号的直接使用。被合并样式保留原字重、颜色、字距与行高（行高可取所在档）。
3. demo 遗留页面的样式若仍被使用，同样只用 5 档；不再使用的 demo 规则留给 C7 删除，不要在本卡大范围清理。
4. 检查（机械约束）：
   - 单测：扫描 `src/styles/**/*.css`，断言除 `tokens.css`、`type-scale.css` 外没有任何直接字号值或非档位字号变量。
   - 浏览器：在 `fixtures.mjs` 增加共享断言，并在全部视觉状态与设计夹具中调用：可见文字计算字号 ∈ {40, 30, 24, 20, 15, 14, 12}；同屏不超过 5 种；首眼档同屏只出现一种。替换 C3 的 5 级断言为该共享断言。
5. 更新 C1 设计夹具的期望值（按钮、分段、标题栏等改为 14；眉标、出处等改为 12），不放宽其他断言。

## 不做

不改 `tokens.json` 及 `docs/design/` 下同步文件；不改布局、颜色、组件结构；不做 C5 量表与 C7 矩阵迁移。

## 验收标准

- 全部样式只用 5 档；单测与浏览器共享断言生效（各给一个反例思路说明）。
- 当下、对照、下钻、设计夹具各视觉状态截图层次清楚，无溢出、无截断。
- 测试全绿（含浏览器）。

## 检查

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
