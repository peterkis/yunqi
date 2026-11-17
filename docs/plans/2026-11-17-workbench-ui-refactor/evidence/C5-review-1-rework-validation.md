# C5 评审第1轮返工验证（2026-11-17）

## 基线与授权

- 主检出 `/Users/petervans/Projects/YunQi`，分支 `feat/workbench-ui-refactor`，HEAD `d7f076e`。
- 起始已有26个修改/未跟踪文件，包括前轮实现、前轮验证记录和评审方新增的 `reviews/C5-review-1.md`。本轮只处理评审的两项必改。
- 未运行 git add/commit/push、切换分支或修改 Git 配置；没有修改 Service、Domain、Contracts、Client、OpenAPI、规则、冻结文件、依赖、字号/样式、覆盖率阈值、exclude 或治理检查器。
- 已重新阅读 AGENTS.md、DESIGN.md、Workbench/验证指引和第1轮评审；使用 diagnosing-bugs 回归流程。评审已确认根因，因此没有重复假设或启动 Chromium，先建立可执行的最小 DOM 和空会话回归。

## 完成内容

| 必改 | 状态 | 实现与回归 |
| --- | --- | --- |
| 1 面板夹具选择器 | DONE | `expectPanelLayout` 的 main、navigation、footer 均收紧为 panel 的直接子元素；header 已是 `:scope > header`，继续保留。所有尺寸/位置期望未改，尤其 header=52、footer=36。量表卡片内 footer 保留，未调整 CSS 迎合断言。 |
| 2 空会话销毁按钮 | DONE | `ConstitutionForm` 依据实际答案是否非空或是否已有结果显示唯一的次按钮；入口、仅选性别、性别切换后、销毁后均不显示。面板的加载/失败空状态也不再提供该销毁入口，原会话页脚继续保留。已有答案、评分中和结果态仍可销毁；原清理、取消跳题、mutation reset、出生会话卸载和旧评分响应隔离逻辑未改。 |
| 单测及浏览器断言 | DONE（代码） | 新增全状态按钮单测；按新要求改写原加载/失败空会话单测，没有删除、跳过用例。flows/helper/六种量表 visual 状态增加按钮0/1、次按钮及页脚保留断言；既有旧响应隔离用例保留并通过。 |
| 本机真实浏览器复跑 | PARTIAL | 用例和语法已更新；本轮 pnpm test:browser 为 NOT_RUN，由评审方运行并补看结果屏⑤。 |

## 反馈循环与失败记录

1. 修复前运行：

   `pnpm --filter @yunqi/workbench exec vitest run src/test/panel-layout-fixture.test.mjs src/features/constitution/components/ConstitutionForm.test.tsx`

   **FAIL / 退出1**：2项失败、8项通过。最小 DOM 用例调用实际 `expectPanelLayout`，复现期望36、实得34；空会话用例复现期望0个销毁按钮、实得1个。DOM的几何值为合成值，只验证真实选择器的元素归属，不作为真实浏览器尺寸证据。

2. 修改选择器和按钮条件后，定向三个文件的24项全部通过（退出0）。

3. 第一次 `pnpm test:workbench-governance` **FAIL / 退出1**，293项中292通过、1失败：新增 Workbench 夹具测试静态导入仓库外 `tests/browser/fixtures.mjs`，被现有相对导入边界拒绝。该轮串联的时间治理因 `&&` 未执行，不能记PASS。将夹具回归移动到仓库级 `tests/browser-fixtures.test.mjs`，使用 Node 测试和 Workbench 已有的 jsdom 测试依赖；移除了本轮新建的临时 Workbench 测试文件。未改治理规则、配置或测试期望。

4. `node --test tests/browser-fixtures.test.mjs` **PASS / 退出0**，3项：卡片 footer 先出现时仍测到面板footer=36；错误面板footer=34仍失败；错误面板header=50仍失败。

5. 最终 Workbench 全量与覆盖率均为59文件/352项通过；3项夹具回归单独计数。移动前的60文件/355项仅为中间快照，不冒充最终 Workbench 计数或真实浏览器验收。

评审方独立浏览器结果 **FAIL / 退出1，185通过、48失败** 保留在 `reviews/C5-review-1.md`；这是评审方本机的前轮结果，本轮没有据此宣称233项已经复跑通过。

## 最终检查

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `node --test tests/browser-fixtures.test.mjs` | 0 | PASS，3项仓库级夹具回归，真实DOM选择器、合成几何值。 |
| `pnpm --filter @yunqi/workbench test` | 0 | PASS，59文件/352项。 |
| `pnpm --filter @yunqi/workbench typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | 0 | PASS。 |
| `pnpm --filter @yunqi/workbench test:coverage` | 0 | PASS，语句98.52%（668/678）、分支97.32%（509/523）、函数97.90%（281/287）、行98.73%（622/630）；原阈值与排除项未改。 |
| `pnpm --filter @yunqi/workbench build` | 0 | PASS，Vite 160 modules，当前dirty源码构建；产物哈希见下。 |
| `pnpm test:workbench-governance` | 0 | PASS，293项及检查脚本。 |
| `pnpm test:time-governance` | 0 | PASS，12项及检查脚本。 |
| `pnpm test:project-guidance` | 0 | PASS，15项及文档预算、链接、命令和迁移完整性检查。 |
| `node --check tests/browser/fixtures.mjs` | 0 | PASS。 |
| `node --check tests/browser/constitution-helpers.mjs` | 0 | PASS。 |
| `node --check tests/browser/learning.flows.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/workbench.flows.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/birth-assessment.flows.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser/workbench.visual.spec.mjs` | 0 | PASS。 |
| `node --check tests/browser-fixtures.test.mjs` | 0 | PASS。 |
| `pnpm exec playwright test --list` | 0 | PASS，仅发现233项/8文件，没有执行浏览器。 |
| `git diff --check` | 0 | PASS。 |
| `pnpm test:browser` | 无 | NOT_RUN：按用户要求，沙箱无法启动Chromium，由评审方本机运行。没有本轮截图、trace、axe或真实布局通过证据。 |

## 差异、保留与待决事项

- 本轮仅按评审调整销毁入口的显示时机；已通过截图核对的作答屏结构、字号、颜色和卡片页脚不变。
- 仅选性别不构成答卷内容，空加载/失败状态也不显示销毁按钮；已有作答/结果的按钮继续是次按钮且唯一。
- 17个不属于本轮修改范围的既有dirty文件哈希保持不变，包含评审文件和上一轮验证记录；没有覆盖历史证据。
- 待评审方复跑真实浏览器并补看结果屏⑤；本轮不能宣称48项真实浏览器失败已经转为PASS，也不改变专家/临床验收状态。

## 本轮修改文件及 SHA-256

下列11个实现/测试文件相对于本轮开始有变化；另新增本证据文件，不写入自身哈希。

| 文件 | SHA-256 |
| --- | --- |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionAssessmentPanel.tsx` | `b9f016639109fe53df999827296128451d2372e226f75d4867d7a972f20ec4b5` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx` | `7e4bca8b8e43aab547bf3990a326a37996b8fdd92ddee23615b6ecb7f2a8c69f` |
| `apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx` | `6c294e5aea2a014008c752527010eae8d977d4358fa2b684d52b2785e1113d69` |
| `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx` | `150b99a01ec7ec3b3957b5b6d32e98b8f4349df22e19f5328bbbb3a224b8b0e1` |
| `tests/browser-fixtures.test.mjs` | `94af3a6d7985fefce3ce23a26e557ded19fba93a1c7d22f111bb5e30298305c3` |
| `tests/browser/birth-assessment.flows.spec.mjs` | `517ab7b01375a6c4cbc22f6e126abe6a5c07425cd4190859b525011d844b2983` |
| `tests/browser/constitution-helpers.mjs` | `ddc18f31e8f88b85eaf3eec8a529d33403ebd3914c41ed74a8cdc56dd7f83dc3` |
| `tests/browser/fixtures.mjs` | `7e4fc9dd5ce860a383cc6d4d39801d46d2030c25ddc0b85a8284954ad952c87c` |
| `tests/browser/learning.flows.spec.mjs` | `ba65397fd66d29b9799890463493a34b0b781d7eeb19e868f9673109634eac5f` |
| `tests/browser/workbench.flows.spec.mjs` | `be3490b9190816d5296d639cfb8bd0e65660fc6a92d117a78f0ecb1fabea625e` |
| `tests/browser/workbench.visual.spec.mjs` | `40b007c04649106d5851bf60ac2569a14ed72f3c6dd34ebfa439bb7b8063df4b` |

## 构建产物

| 文件 | 字节 | SHA-256 |
| --- | --- | --- |
| `apps/yunqi-workbench/dist/index.html` | 563 | `437903dbad8c2431d5884721c73c8e3d6e1e0224f78e1d1819a96fe550dce618` |
| `apps/yunqi-workbench/dist/assets/index-CySJyDQV.css` | 86794 | `8ba3b504662681aeff4bad3850c774d43974b094da87c140a247d7f33f354bef` |
| `apps/yunqi-workbench/dist/assets/index-DcW0o_at.js` | 346582 | `1df2ef1dc64f384dce921e14c7301522c89e53f1ce9fed304ea0072d2bed039c` |
