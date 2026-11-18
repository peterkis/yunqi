**1. 完成内容**

基线：`feat/finals-f1`，HEAD `0083cf534e0593822f627ea9c7d4d575d68d5ed1`，开始时工作区干净；未提交、推送或切换分支。

| 验收项 | 状态与对应文件 |
| --- | --- |
| 上半屏结构 | DONE：年度眉标与交运、双环年轮、图例、三要素、年度关系、七行气运网格；见 `CurrentYunQiPage.tsx`、`YunQiWheel.tsx`、`CurrentPeriodGrid.tsx`、`current-finals.css`。原文卡、更多列表及关系来源入口保留。 |
| 两栏逐行对齐 | PARTIAL：单一 Grid 与 14 单元格的行列单测通过；三档视觉矩阵覆盖 `current`、`current-stage-facts`，含七行 y 差 ≤1px、1366×768 首屏标题断言；见 `CurrentYunQiPage.test.tsx`、`stage-facts-helpers.mjs`、`workbench.visual.spec.mjs`。真实几何与截图待评审方执行。 |
| 年轮可读 | DONE：读屏标签包含当前气步、运步及各自 API 段内进度；当前段整段实色。第 1／5／6 气 × 第 1／5 运共 6 个组合通过；见 `YunQiWheel.test.tsx`、`map-learning.ts`。 |
| 全部门禁 | PARTIAL：构建、包内测试、全仓测试、类型、覆盖率及治理检查通过；浏览器验收 NOT_RUN。 |

**2. 修改文件清单**

以下目录均相对仓库根；新增文件标注“新增”。

| 目录 | 文件 |
| --- | --- |
| `apps/yunqi-workbench/src/features/yunqi/components/` | `CurrentYunQiPage.tsx`、`CurrentYunQiPage.test.tsx`、`LearningPanels.test.tsx`（仅当下用例）、`CurrentPeriodGrid.tsx`（新增）、`YunQiWheel.tsx`（新增）、`YunQiWheel.test.tsx`（新增） |
| `apps/yunqi-workbench/src/features/yunqi/presentation/` | `map-learning.ts`、`map-learning.test.ts`、`map-stage-progress.ts`、`map-current-yunqi.test.ts`、`view-model.ts` |
| `apps/yunqi-workbench/src/styles/views/` | `current-finals.css`（新增）、`current-yunqi.test.tsx` |
| `apps/yunqi-workbench/src/` | `main.tsx`（仅追加样式导入） |
| `tests/browser/` | `stage-facts-helpers.mjs`、`stage-facts.flows.spec.mjs`、`learning.flows.spec.mjs`（仅当下断言）、`workbench.visual.spec.mjs`（仅当下断言） |
| `docs/plans/2026-11-18-prototype-finals/evidence/` | `F1-implementation.md`（新增，本报告） |

**3. 检查结果**

先完成 `pnpm build`，再运行包内测试。下表保留首轮失败与最终结果。

| 命令 | 结果／退出码 |
| --- | --- |
| `pnpm build` | PASS / 0；含 Workbench 构建与生产 CSS 检查。 |
| `pnpm --filter @yunqi/workbench test` | 首轮 FAIL / 1：`LearningPanels.test.tsx` 仍期待主客运音名；按新界面更新后 PASS / 0，63 文件、429 用例。 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS / 0 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS / 0 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS / 0；语句 99.26%、分支 98.07%、函数 99.68%、行 99.59%；阈值未变。 |
| `pnpm --filter @yunqi/workbench build` | PASS / 0，已由根构建串行执行。 |
| `pnpm test:workbench-governance` | PASS / 0，313 用例。 |
| `pnpm test:time-governance` | PASS / 0，12 用例。 |
| `pnpm test:project-guidance` | PASS / 0，15 用例及指引检查。 |
| `pnpm test` | PASS / 0；OpenAPI lint 有 3 项非阻断 warning，见风险。 |
| `pnpm typecheck` | PASS / 0 |
| `pnpm test:coverage` | PASS / 0 |
| `node --check tests/browser/stage-facts-helpers.mjs` | PASS / 0 |
| `node --check tests/browser/stage-facts.flows.spec.mjs` | PASS / 0 |
| `node --check tests/browser/learning.flows.spec.mjs` | PASS / 0 |
| `node --check tests/browser/workbench.visual.spec.mjs` | PASS / 0 |
| `pnpm exec playwright test --list` | PASS / 0，发现 217 用例／12 文件；三档为 `panel-light` 400×860、`workstation-768` 1366×768、`workstation-1080` 1920×1080。 |
| `pnpm test:browser` | NOT_RUN / —；按通用要求，沙箱无法启动 Chromium，由评审方运行及生成截图。 |
| `git diff --check` | PASS / 0 |

构建产物：`index-V6l13dqh.css`、`index-BjnOXLH7.js`。18 个改动源码与用例文件的 SHA-256 为 `81aec8d3b986f0baef05e141c07099602eb5f0edae9ef497a176a622ba9431e3`（相对路径排序，逐项串联 `路径 + NUL + 文件字节 + NUL`；不含本报告）。重复检查沿用同一批用例，不代表独立专家或临床样本。

**4. 与设计规范或原型的差异及原因**

- 字号映射到现行五档阶梯：当下干支沿用 40，参考稿为 30；阶段名 20，正文与元信息使用 14／12，间距使用已有 `--space-*`。
- 按计划 README 保留参考稿未绘出的原文卡、更多列表和现有关系阅读入口；当前气运短值去音名，完整音名仍在其余阶段与年度详情可查。

**5. 待决问题或风险**

- 评审方仍需执行浏览器矩阵、axe、外部请求与字号断言，生成三档首屏截图，并对照 `06-pill.html` 复核收起态；收起态代码未改，本轮没有实际截图结论。
- 范围外保留：OpenAPI lint 的 localhost 服务地址、`/health` 缺 4XX 响应、未引用 `YearParams` 三项 warning；本卡未修改 API 文件。
