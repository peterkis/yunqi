1. **完成内容**

   - DONE：当前段使用黛青描边、浅底卡头及 22px 实色“正在此段”徽标；全年和出生原文使用中性徽标。实现于 `ClassicsReadingCard.tsx`、`classics.css`。
   - DONE：原文、释义、出处按顺序分层；宋体原文带隐藏于读屏的装饰开引号，释义使用黑体，出处拆为两行及“出处 ›”链接。两页共用组件，保留选段、释义、来源地址、全文展开、分段导航、下钻头和页脚。
   - DONE：说明移至阅读列表末尾，前置 14px 内联信息图标；当下及先天阅读页均接入。
   - PARTIAL：截图辨识与全部门禁验收尚待浏览器执行。四个阅读状态已注册 400×860、1366×768、1920×1080 矩阵，并保留深色、最小高度及其他现有项目；已加入徽标/标签对比度 ≥4.5:1、字体栈、顺序、滚动说明与 axe 断言。

2. **修改文件清单**

   以下目录均相对仓库根目录，列出的文件共 20 个。

   | 目录 | 文件 |
   | --- | --- |
   | `apps/yunqi-workbench/src/features/yunqi/components/` | `ClassicsReadingCard.tsx`（新增）、`CurrentClassicsPage.tsx`、`CurrentClassicsPage.test.tsx`、`CurrentClassicsView.test.tsx`、`LearningPanels.test.tsx` |
   | `apps/yunqi-workbench/src/features/yunqi/presentation/` | `map-classics.ts`（新增） |
   | `apps/yunqi-workbench/src/features/yunqi/birth/components/` | `BirthClassicsView.tsx`、`BirthComparisonNavigation.test.tsx`、`BirthComparisonSession.test.tsx` |
   | `apps/yunqi-workbench/src/features/yunqi/birth/presentation/` | `map-birth-view.ts`（仅增加阅读卡投影） |
   | `apps/yunqi-workbench/src/styles/views/` | `classics.css`（新增） |
   | `apps/yunqi-workbench/src/` | `main.tsx`（仅追加样式导入） |
   | `tests/browser/` | `README.md`、`birth-assessment.flows.spec.mjs`、`birth-helpers.mjs`、`consistency-helpers.mjs`、`learning.flows.spec.mjs`、`visual-assertions.mjs`、`workbench.visual.spec.mjs` |
   | `docs/plans/2026-11-18-prototype-finals/evidence/` | `F2-implementation.md`（本报告，新增） |

3. **检查结果**

   | 命令 | 退出码与结果 |
   | --- | --- |
   | `pnpm build` | PASS，0；先于首次包内测试执行 |
   | `pnpm --filter @yunqi/workbench test` | 首次 FAIL，1：421/422，遗漏一条旧界面的结尾引号/标签断言；更新后 PASS，0：422/422 |
   | `pnpm --filter @yunqi/workbench build` | PASS，0 |
   | `pnpm --filter @yunqi/workbench typecheck` | PASS，0 |
   | `pnpm --filter @yunqi/workbench test:typecheck` | PASS，0 |
   | `pnpm --filter @yunqi/workbench test:coverage` | PASS，0；语句 99.25%、分支 98.09%、函数 99.68%、行 99.59%，阈值未改 |
   | `pnpm test`、`pnpm typecheck`、`pnpm test:coverage` | PASS，各 0 |
   | `pnpm test:workbench-governance`、`pnpm test:project-guidance`、`pnpm test:time-governance` | PASS，各 0 |
   | `pnpm contracts:check`、`pnpm schema:validate` | PASS，各 0 |
   | 对 `tests/browser/*.mjs` 逐文件执行 `node --check` | PASS，均为 0 |
   | `pnpm exec playwright test --list` | PASS，0；223 个用例、12 个文件，仅验证发现清单 |
   | `git diff --check` | PASS，0 |
   | `pnpm test:browser` | NOT_RUN，无退出码；按任务约束，沙箱不能启动 Chromium，由评审方执行并生成截图 |

   基线：`feat/finals-f2` @ `0083cf534e0593822f627ea9c7d4d575d68d5ed1`，初始工作区干净；Node `24.18.0`、pnpm `10.32.1`。最终构建为 `index-K6vrlfmQ.js`、`index-D3M0Knrd.css`，生产 CSS 检查通过。

   19 个非证据改动文件按路径排序，对每行“路径 + NUL + 文件 SHA-256 十六进制 + LF”再次求 SHA-256：`91fe6c0d7449b6d7cce0ddf760a58044cceb1c19d39e328f02ae14e02a08b9be`。

4. **与设计规范或原型的差异及原因**

   - 按五档字号要求：原文 16→15px，释义 13→14px，小字归并为 12px，装饰开引号 34→30px；原文行高用既有令牌 1.85。其余尺寸由现有令牌映射或组合，未新增字号与间距档。
   - 长内容时，列表末尾说明吸附在阅读区下缘，保留病候原文与医疗边界同屏的硬约束；先天页继续使用原有完整出生边界说明。

5. **待决问题或风险**

   - 浏览器尚未执行，不能宣称截图、实际计算字体/对比度或 axe 已通过；评审方运行 `pnpm test:browser` 后完成视觉验收。
   - OpenAPI lint 返回 3 项非阻塞 warning：本地示例服务器、health 缺少 4XX、未使用的 YearParams；相关 API 文件未改，本卡未处理。
   - 未提交、推送、切换分支或修改 git 配置；本轮工程检查不替代专家或临床验收。
