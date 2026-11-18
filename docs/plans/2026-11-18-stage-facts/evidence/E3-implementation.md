**1. 完成内容**

| 验收项 | 状态与文件 |
| --- | --- |
| 气、运阶段副标题 | DONE：`map-stage-progress.ts`、两个 mapper、`CurrentYunQiPage.tsx`；覆盖“还有 N 天”和“今日 HH:mm 交气/交运”，完整 API 时刻仍可在“计算说明与版本 → 精确时刻”查看。 |
| 运关系标签 | DONE：`visual-mappings.ts`、`map-learning.ts`、当下页及五步运全表；使用 DTO 标签、五行和方向，生为蓝色，克及同五行为中性。 |
| 段内进度 | DONE：ViewModel 格式化 DTO ratio，CSS 实色填充、硬边分割、无渐变；当前步可访问名称追加四舍五入百分比。 |
| 胶囊第二行 | NOT_DONE（可选）：无法在本沙箱实测 400×64、字号和 axe 条件，本卡不实现。 |
| 先天“所处运” | DONE：核实 `map-birth-view.ts` 继续取 DTO `comparisons` 的客运对照，新增隔离回归测试。 |
| 治理断言 | DONE：原 AST 检查器禁止非测试源码数组包含两个以上指定边界节气，补充 20 项正反例（含测试排除）。 |
| 页脚声明 | DONE：原文保持，现有页脚单次出现断言通过。 |
| 浏览器验收准备 | PARTIAL：副标题、关系 class、填充宽度 ±1px、无渐变用例已补齐；当下默认态及非零进度态覆盖 400×860、1366×768、1920×1080，保留字号、布局及 axe 门禁。实际执行、截图由评审方完成。 |

**2. 修改文件清单**

下列花括号逐项表示文件，共 24 个；新增证据仅本报告和一个验证脚本。

- `apps/yunqi-workbench/src/features/yunqi/presentation/{view-model.ts,map-stage-progress.ts,map-current-yunqi.ts,map-current-yunqi.test.ts,map-learning.ts,map-learning.test.ts,visual-mappings.ts,visual-mappings.test.ts}`
- `apps/yunqi-workbench/src/features/yunqi/components/{CurrentYunQiPage.tsx,CurrentYunQiPage.test.tsx,LearningPanels.test.tsx}`
- `apps/yunqi-workbench/src/features/yunqi/birth/presentation/map-birth-view.test.ts`
- `apps/yunqi-workbench/src/styles/views/current-yunqi.css`
- `scripts/check-yunqi-workbench-governance.mjs`、`tests/yunqi-workbench-governance.test.mjs`
- `tests/browser/{README.md,learning.flows.spec.mjs,workbench.flows.spec.mjs,workbench.visual.spec.mjs,stage-facts-helpers.mjs,stage-facts.flows.spec.mjs}`
- `docs/agents/workbench.md`
- `docs/plans/2026-11-18-stage-facts/evidence/{E3-implementation.md,E3-verify-snapshots.mjs}`

基线：`feat/stage-facts`，HEAD `a2f041287bcf4f46148cd0cbd663266a9432f518`，初始工作区干净。修改范围检查通过；未提交、推送或切换分支。
22 个非证据修改文件按路径排序，以 `路径 + NUL + 文件字节 + NUL` 串接的 SHA256：`0631131bb63df744cba85579589bf2445911ab410c5371c6b4420e387a0acb85`。
本轮构建产物：`index-D9ueRr3E.js`、`index-Dk6caRDa.css`。

**3. 检查结果**

| 命令 | 退出码与结果 |
| --- | --- |
| `pnpm build` | 0，PASS（基线及全仓测试构建）。 |
| `pnpm --filter @yunqi/workbench test` | 首轮 1，FAIL（3 项断言）；修正后 0，PASS，62 文件、417 项。 |
| `pnpm --filter @yunqi/workbench typecheck` | 0，PASS。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0，PASS。 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0，PASS；语句 99.24%、分支 98.04%、函数 99.67%、行 99.58%，阈值及排除配置未变。 |
| `pnpm --filter @yunqi/workbench build` | 0，PASS，含生产 CSS 检查。 |
| `pnpm test:workbench-governance` | 0，PASS，313 项及实际源码检查。 |
| `pnpm test:time-governance` | 0，PASS，12 项及实际源码检查。 |
| `pnpm test:project-guidance` | 0，PASS，15 项及指引检查。 |
| `pnpm test` | 0，PASS；含全仓单测、契约治理、时间纯度/时区、生产入口及 OpenAPI 检查。 |
| `node --check <本卡修改的各 .mjs 文件>` | 8 个文件分别退出 0，PASS。 |
| `pnpm exec playwright test --list` | 0，PASS；发现 217 项／12 文件（65 流程、152 视觉）；仅发现用例，输出放临时目录。 |
| `node docs/plans/2026-11-18-stage-facts/evidence/E3-verify-snapshots.mjs` | 0，PASS；真实 Service/adapter 的 3 个输入分别验证余日、今日交气、气运同日结束。 |
| `git diff --check` | 0，PASS。 |
| `pnpm test:browser` | 无退出码，NOT_RUN：按任务约定，沙箱无法启动 Chromium；评审方运行。 |

首轮失败：两项文本断言未按 matcher 的空白规范化匹配，另一项仍在旧位置查找运起止时刻。已更新断言并验证完整时刻可达，未跳过或放宽现有行为检查。上述次数为工程测试及重复状态检查，不是独立专家或临床样本。

**4. 与卡片／原始计划的差异及原因**

- 遵循 README 调整表，先天对照保留“出生客运 × 当前客运”关系。
- 采用直接硬边填充分割，不额外画 2px 竖线；符合卡片对原计划“2px”的澄清。
- 可选胶囊第二行未实现，原因见第 1 项。
- 增加真实 `learning/calculate` 响应回放至当下页的用例，覆盖非零进度及结束日；默认当前态继续使用原 runner 时钟。

**5. 待决问题或风险**

- 浏览器、axe 零违规、实际字号及截图结果尚未验证；三档矩阵用例已就绪，留待评审方执行。
- 主客运标签与五步运教学口径仍待 E4 专家确认，工程通过不代表专家或临床验收。
- 全仓测试中的 OpenAPI lint 保留 3 项警告：localhost server、health 缺少 4XX、YearParams 未引用；属本卡外文件，本轮未修改。
