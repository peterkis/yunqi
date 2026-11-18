# F5 实现证据

2026-11-18；分支 `feat/prototype-finals`；基线 HEAD `b80ccb883baf069972232b3bdd6a55cfa101f6bf`。
初始工作区仅有用户未跟踪补丁；未提交、推送或切换分支。Node `v24.18.0`，pnpm `10.32.1`。

## 1. 完成内容

- **DONE：判定卡。** `ConstitutionResults` 保留 D3 标题；标题旁使用相合色、无分数的 `<简称> 倾向` 标签，允许换行并将整组垂直居中；兼夹中性标签在下一行，规则说明在卡片末尾。
- **DONE：条形与互参卡。** mapper 保留 DTO 标准顺序，按状态映射 primary / secondary / neutral（包括 basically → neutral）；三列为 52px / 8px 高条形 / 36px 分数，保留 30/40 刻度和完整可访问说明。互参为三个等宽块，显示体质简称、出生干支与岁运、当步客气；无出生资料为“未填写”。结果态隐藏重复的作答上下文。
- **DONE：回归与矩阵用例。** 单测覆盖四种标题情形及“基本是”、标签数量/文本/语气、标准顺序和上下文；结果视觉状态使用真实 Service 答卷（痰湿“是”，气郁/特禀“倾向”），覆盖 400×860、1366×768、1920×1080 及其余现行矩阵，保留字号、外网拒绝和 axe 检查。
- **PARTIAL：全部门禁验收。** 非浏览器检查通过；真实几何、axe、截图与视觉对照由评审方运行，未宣称浏览器通过。`ConstitutionForm.tsx` 与 `keepFocus` 回归测试段落逐字节核对未变，表单测试仅更新结果空态文字断言。

## 2. 修改文件清单

以下 10 个文件及本证据文件，共 11 个：

```text
apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx
apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.test.ts
apps/yunqi-workbench/src/features/constitution/presentation/map-constitution.ts
apps/yunqi-workbench/src/styles/views/constitution.css
tests/browser/README.md
tests/browser/constitution-actions.flows.spec.mjs
tests/browser/constitution-helpers.mjs
tests/browser/workbench.visual.spec.mjs
```

以上顺序连接 `UTF8(路径) + NUL + 文件字节 + NUL` 的 SHA-256：
`a924c47f57c5e6b0519f53cc4809df18177fa2eec39ab0758aeeb4287ad26bb2`（不含本证据）。
用户 `0001-…F1-F5.patch` 保持未跟踪，前后 SHA-256 相同：
`da5d1d9e19d3af990bb2dd6915c9e0ee0efdddc79c191c74a7cfe30870af3337`。

## 3. 检查结果

先 `pnpm build`（0），再跑包内测试。首轮 Workbench 测试 **FAIL / 1，2 项失败**：新增上下文字段尚未加入旧精确断言，以及窄空格断言未按测试库归一化；更新断言后复跑通过。未删除现有测试或调整覆盖率配置。

| 命令 | 最终结果 / 退出码 |
| --- | --- |
| `pnpm build` | PASS / 0；最终生产 CSS 检查通过 |
| `pnpm --filter @yunqi/workbench build` | PASS / 0（根 build 调用） |
| `pnpm --filter @yunqi/workbench test` | PASS / 0；65 文件、443 测试 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS / 0 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS / 0 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS / 0（根覆盖率调用）；语句 99.29%、分支 98.22%、函数 99.70%、行 99.61% |
| `pnpm test` | PASS / 0 |
| `pnpm typecheck` | PASS / 0 |
| `pnpm test:coverage` | PASS / 0 |
| `pnpm test:workbench-governance` | PASS / 0 |
| `pnpm test:project-guidance` | PASS / 0 |
| `pnpm test:time-governance` | PASS / 0 |
| `pnpm contracts:check` | PASS / 0 |
| `pnpm schema:validate` | PASS / 0；6 测试 |
| `node --check tests/browser/constitution-actions.flows.spec.mjs` | PASS / 0 |
| `node --check tests/browser/constitution-helpers.mjs` | PASS / 0 |
| `node --check tests/browser/workbench.visual.spec.mjs` | PASS / 0 |
| `pnpm exec playwright test --list` | PASS / 0；225 测试、12 文件，含两种结果状态在所需三档项目中的用例 |
| `git diff --check` | PASS / 0 |
| `pnpm test:browser` | NOT_RUN / 无退出码；依 `_common.md`，沙箱无法启动 Chromium，由评审方运行并生成截图 |

真实 Service 内存请求另获 HTTP 200，核对展示答卷的 1 个“是”和 2 个“倾向”；请求后已关闭该实例。这不是浏览器验收或专家案例。

## 4. 与设计规范或原型的差异及原因

- 条形采用标准附录顺序，D3 标题、兼夹标签、下钻页头和操作区沿用现行规则，依计划 README 的调整表优先于参考稿。
- 参考稿 12.5/13px 映射为现有 12/14px 档；其他尺寸和间距均取既有令牌。保留完整平和质规则、“判定说明与边界”和版本折叠区。
- 视觉用例数据来自真实 Service，区别于参考稿固定气虚/阳虚示例；当下保留完整客气名称，出生候选分别保留。

## 5. 待决问题或风险

评审方仍需执行 `pnpm test:browser`，检查三档首屏、标签中心差 ≤2px、无数字、换行与 axe 零违规；截图由评审方生成。OpenAPI lint 退出码为 0、带 3 条警告，相关文件不在本卡范围。工程检查不改变规则待专家冻结状态。

## 返工 1

2026-11-18；分支 `feat/prototype-finals`；HEAD 仍为 `b80ccb883baf069972232b3bdd6a55cfa101f6bf`。
从已有 F5 未提交改动继续，保留以上历史证据；本节更正先前关于结果态操作区沿用现状的说明。
Node `v24.18.0`，pnpm `10.32.1`。用户报告返工前评审方 `pnpm test:browser` 为 225 PASS；该结果不代表本轮修改后的浏览器验收。

### 完成内容与边界

- **DONE：互参卡 meta。** 组件末行逐字显示“体质、先天、当下三者并列供医师综合判断，系统不自动辨证、不给方药。”；组件单测断言末行的 meta 类与完整 `textContent`，浏览器 helper 同步断言末行类与全文。
- **DONE：结果态操作区。** DOM 顺序改为左侧文字按钮“‹ 返回修改”、右侧次按钮“结束并销毁答卷”；“‹”放入 `aria-hidden="true"` 的 span，可访问名称保持“返回修改”。复用现有 `constitution-actions` 的 `space-between` 对齐和全部令牌样式，无 CSS 变更。
- **DONE：回归断言。** 单测检查按钮 DOM 顺序、可访问名称、隐藏箭头与文字按钮样式。浏览器共享 helper 检查顺序、可访问名称、隐藏箭头及左右位置；流程改为 Tab 到返回、Tab 到销毁、Shift+Tab 回返回后 Enter，仍验证返回修改与销毁行为。现有视觉用例通过共享 helper 获得新断言。
- **DONE：范围核对。** `ConstitutionForm.tsx` 与返工前逐字节对照，变更仅为结果按钮移动及箭头前缀；作答态操作区、事件处理、确认逻辑保持原样。Service / Domain / Contracts / Client 无 diff；其余已有 F5 源码、CSS、浏览器视觉文件和 README 未被本轮改写。未提交、推送或切换分支。

### 本轮修改文件与源文件哈希

以下六个源码/测试文件按列出顺序连接 `UTF8(路径) + NUL + 文件字节 + NUL`：

```text
apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.test.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionForm.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.test.tsx
apps/yunqi-workbench/src/features/constitution/components/ConstitutionResults.tsx
tests/browser/constitution-actions.flows.spec.mjs
tests/browser/constitution-helpers.mjs
```

- 返工前 SHA-256：`778ac63f7a24959dcee5f39fbec4b6514caf6a4d2c24cf91ce34a20463fa674c`。
- 返工后 SHA-256：`e94bdfde32774e8d15654c8201d6f181f39dbd8eee163f84e43049d47a7f0742`。
- 加上本证据文件，本轮共改 7 个文件。用户未跟踪补丁保留，SHA-256 仍为 `da5d1d9e19d3af990bb2dd6915c9e0ee0efdddc79c191c74a7cfe30870af3337`。

### 检查结果

首轮 `pnpm --filter @yunqi/workbench test:typecheck` **FAIL / 1**：新增 Testing Library `getByRole` 查询误用了 Playwright 的 `exact` 选项，报 TS2769。删除不支持的选项后复跑 **PASS / 0**，并在最终源码上复跑完整 Workbench 单测。未删除测试、放宽断言或调整覆盖率配置。

| 命令 | 最终结果 | 退出码 | 说明 |
| --- | --- | --- | --- |
| `pnpm --filter @yunqi/workbench test` | PASS | 0 | 65 文件、443 测试 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS | 0 | 生产代码类型检查 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS | 0 | 保留上述首轮 FAIL / 1 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS | 0 | 443 测试；语句 99.29%、分支 98.22%、函数 99.70%、行 99.61% |
| `pnpm --filter @yunqi/workbench build` | PASS | 0 | Vite 构建与生产 CSS 检查通过 |
| `pnpm test:workbench-governance` | PASS | 0 | 313 测试及源码检查通过 |
| `pnpm test:project-guidance` | PASS | 0 | 15 测试；预算、链接、命令与历史完整性检查通过 |
| `pnpm test:time-governance` | PASS | 0 | 12 测试及源码检查通过 |
| `node --check tests/browser/constitution-helpers.mjs` | PASS | 0 | 浏览器 helper 语法 |
| `node --check tests/browser/constitution-actions.flows.spec.mjs` | PASS | 0 | 浏览器流程语法 |
| `pnpm exec playwright test --list` | PASS | 0 | 枚举 225 测试、12 文件；不代表用例执行 |
| `git diff --check` | PASS | 0 | 差异格式检查 |
| `pnpm test:browser` | NOT_RUN | —（未启动，无退出码） | 依用户要求与 `_common.md`，本轮由评审方运行 |

### 设计差异与待决项

本轮两处均按 F5 卡片及参考稿修正，无新增设计差异；结果操作区按本次明确要求优先于通用 Workbench 指引中的旧顺序，未改写指引。浏览器实际几何、键盘流程、截图与 axe 仍待评审方对本轮源码运行确认；本轮未启动浏览器或服务，无需清理相关进程。

## 返工 2

2026-11-18；分支 `feat/prototype-finals`；HEAD 仍为 `b80ccb883baf069972232b3bdd6a55cfa101f6bf`。
在现有 F5 与返工 1 的未提交改动上继续，保留全部历史证据及用户补丁；未提交、推送或切换分支。
Node `v24.18.0`，pnpm `10.32.1`。

### 根因与复现

评审方报告的浏览器结果为 **223 PASS、2 FAIL、0 SKIP**；本轮读取既有
`.artifacts/browser/2026-11-18T10-52-12-785Z-d73c5bf9/results.json`，核对统计和两处失败位置一致。
这是评审方此前运行的证据，不代表本轮源码已经通过浏览器验收。

1. **独立量表：旧 Tab 顺序。** `workbench.flows.spec.mjs` 的结果态从“量表来源与适用说明”再按一次 Tab 后，仍直接断言销毁按钮获得焦点。返工 1 已按 F5 要求 4 将 DOM 改为“返回修改 → 结束并销毁答卷”，因此该次 Tab 实际到返回按钮。需要先断言返回按钮焦点，再 Tab 到销毁；原有 Enter、结果消失、答卷清空、男性选项焦点及存储/URL断言全部保留。
2. **出生对照：产品焦点回落时机缺陷，不能归因于旧键盘顺序。** 初始 `birth-assessment.flows.spec.mjs:118` 直接 `.click()` 精确命名的销毁按钮，并没有 Tab/Enter 序列；失败前已经通过表单消失、入口 `aria-expanded="false"` 的断言，说明会话确已结束。`BirthAssessmentSession` 原先在 `active` 变为 false 的 effect 中尝试 `actionRef.current?.focus()`；入口操作由 `PanelView` 的 layout effect 发布到 `PanelShell`，实际按钮在后续 shell commit 才挂载。结果态销毁时，该 effect 执行时 ref 仍为 null，焦点随后留在 body。

复现经过（均为 Workbench/jsdom 单测，不冒称真实浏览器执行）：

- 修改前运行 `pnpm --filter @yunqi/workbench test src/features/yunqi/birth/components/BirthComparisonSession.test.tsx`：**PASS / 0，15 项**。既有焦点回落断言只覆盖作答中销毁，未覆盖结果态。
- 先增加结果态点击/键盘两种销毁回归，再运行同一命令：**FAIL / 1，15 PASS、2 FAIL**。点击回归在入口焦点断言失败，实际为 body；首次键盘回归从关闭的 summary 起步，jsdom 的 Tab 遍历未到首个操作按钮，亦失败。参照既有 `ConstitutionForm.test.tsx` 对 summary 的处理，单测改从第一个操作按钮起步；真实 summary → 操作区遍历仍由浏览器用例明确断言。
- 产品修复前运行 `pnpm --filter @yunqi/workbench test src/features/yunqi/birth/components/BirthComparisonSession.test.tsx -t 'destroys a scored session'`：**FAIL / 1，2 FAIL、15 SKIP**（名称筛选，未给测试添加 skip）。此时点击与“返回修改 → Tab → 销毁 → Enter”均确实销毁了结果及表单，只在入口焦点断言失败，实际为 body。
- 临时探针 `[DEBUG-f5-rework2]` 在原 effect 的销毁分支记录，两种激活方式均为 `actionRef connected: null`；带探针复跑仍为 **FAIL / 1，2 FAIL、15 SKIP**。修复后探针已完全移除。
- 修复后运行上述完整测试文件：**PASS / 0，17 项**；点击及键盘回归均确认销毁、入口焦点、出生对照保留、重新打开无性别选择及无旧结果，评分仍只调用一次。新增 2 项是交互回归，不是专家或临床样本。

### 完成内容与修改文件

- **DONE：按新 DOM 顺序更新两个浏览器流程。** 独立量表新增返回按钮焦点断言及下一次 Tab；出生对照将直接点击替换为从 `.birth-technical > summary` 开始的“Tab → 返回修改 → Tab → 销毁 → Enter”，新增结果区与销毁按钮消失断言。保留原有销毁、入口焦点、重开清空、请求次数、axe 等断言，无删除、放宽或跳过。
- **DONE：修复产品焦点回落。** `onEnd` 标记一次恢复请求，入口按钮的 callback ref 在实际挂载时消费该标记并聚焦。不用延时、重试或测试中的主动聚焦掩盖问题；初次显示入口不请求焦点。保留既有打开时标题焦点、结束/销毁状态转换及预期回落目标。
- **DONE：增加对应单测。** 通过真实 `PanelShell` 和 `BirthComparisonPage` 组合覆盖结果态鼠标及键盘销毁，先 RED 后 GREEN；未改覆盖率配置。

本轮只修改以下四个源码/测试文件及本证据，共 **5 个文件**：

```text
tests/browser/workbench.flows.spec.mjs
tests/browser/birth-assessment.flows.spec.mjs
apps/yunqi-workbench/src/features/yunqi/birth/components/BirthAssessmentSession.tsx
apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonSession.test.tsx
docs/plans/2026-11-18-prototype-finals/evidence/F5-implementation.md
```

上述前四个文件按列出顺序连接 `UTF8(路径) + NUL + 文件字节 + NUL` 的 SHA-256：

- 返工前：`384b88601749e1feb9242151a90538a021c66e805ae91af05342c97dd497d63e`。
- 返工后：`0992631e43b8ce0b91779af5b09853af18a5e8fc7a46fe18659edbce7316fa2d`。

Service / Domain / Contracts / Client 无 diff；其余已有未提交改动保持原样。
用户补丁 SHA-256 仍为 `da5d1d9e19d3af990bb2dd6915c9e0ee0efdddc79c191c74a7cfe30870af3337`。

### 检查结果

| 命令 | 最终结果 | 退出码 | 说明 |
| --- | --- | --- | --- |
| `pnpm --filter @yunqi/workbench test` | PASS | 0 | 65 文件、445 测试；包含新增两种激活方式回归 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS | 0 | 生产代码类型检查 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS | 0 | 测试代码类型检查 |
| `node --check tests/browser/workbench.flows.spec.mjs` | PASS | 0 | 语法检查 |
| `node --check tests/browser/birth-assessment.flows.spec.mjs` | PASS | 0 | 语法检查 |
| `pnpm exec playwright test --list` | PASS | 0 | 225 测试、12 文件；仅枚举，未执行用例 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS | 0 | 445 测试；语句 99.29%、分支 98.22%、函数 99.70%、行 99.61% |
| `pnpm test:workbench-governance` | PASS | 0 | 313 测试与源码检查通过 |
| `git diff --check` | PASS | 0 | 差异格式检查 |
| `pnpm test:browser` | NOT_RUN | —（未启动，无退出码） | 按本次用户要求及 `cards/_common.md`，由评审方运行 |

### 设计差异与证据限制

无新增设计差异；保留返工 1 的 F5 操作区顺序及两种会话原定的焦点回落位置。
本轮未启动浏览器或 Service，无相关监听端口/进程需要清理。真实 Chromium 的 Tab 遍历、焦点、几何、截图及 axe 仍待评审方运行全量浏览器验收；未将语法检查、枚举或 jsdom PASS 记为浏览器 PASS。
