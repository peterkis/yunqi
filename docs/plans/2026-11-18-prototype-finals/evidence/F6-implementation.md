1. **完成内容**

   基线：2026-11-18，分支 `feat/finals-f6-polish`，HEAD `89879698573972730811615efc1c81a0e959d5af`；初始仅有用户提供的未跟踪 F6 卡。Node `v24.18.0`、pnpm `10.32.1`。先完成 `pnpm build`，再运行包内测试。

   | 验收项 | 状态与对应文件 |
   | --- | --- |
   | 说明折叠项 | DONE（实现）：`ConstitutionForm.tsx`、`ConstitutionContext.tsx`、`ConstitutionResults.tsx`、`constitution.css` 统一纵列、32px 最小高度、small 字号及相邻细线；结果依次为判定、来源、计算，出生候选快照保留在其后。独立“本次量表版本”移除，来源首行按是否有结果切换；组件测试覆盖顺序和版本位置。真实 x/y 几何验收 NOT_RUN。 |
   | 互参摘要 | DONE（实现）：`map-constitution.ts` 仅计数 API 已有名单；0/1/2/3/7 个“是”、0/1/2/3 个倾向、平和与基本平和均有单测。3+ 个“是”显示数量，倾向另行；`ConstitutionResults.tsx` 的 dd 通过 `referenceLabel` 读出完整名单。七种兼夹的两行及等高浏览器断言已补，执行 NOT_RUN。 |
   | 分段断行 | DONE（实现）：新增 `components/design/SegmentedText.tsx`，按精确的 ` · ` 分段，保留窄空格点及显式换行机会；接入 `ElementDot`、量表当下/先天和结果当下/先天。覆盖切分、无分隔符、书名中点、首尾空白及空串；实际 400px 文本 Range 断言 NOT_RUN。 |
   | 深色六态 | PARTIAL：`workbench.visual.spec.mjs` 补齐当下、当下原文、1980-03-12 对照、答题、结果、胶囊的采集入口，全部通过应用内按钮切换并断言主题；保留 axe、同源请求及五档字号检查。源码/令牌已逐项核对，实际截图、目测及浏览器规则执行 NOT_RUN，由评审方完成。 |
   | 保留焦点修复及边界 | DONE：`ConstitutionForm.tsx` 状态、焦点和事件处理前缀与 HEAD 逐字相同（SHA256 `6130bc85a7b1fa2a1975399e7f98dde46041e8ff4ec3c430e2f6076dd1c272bb`）；`BirthAssessmentSession.tsx` 完全未改（SHA256 `9fb98c7f086ca67b07df8c0fbfe8ee51b2100a2ea6f88d56155de2f026b6a91b`）。无 Service/Domain/Contracts/Client、判定规则、版本号、依赖或配置改动；未提交、未推送、未切分支。 |

   深色核对限于当前源码和令牌，不冒称已查看渲染图：

   | 核对点 | 可获得的结论 |
   | --- | --- |
   | 年轮内外环与图例 | 外环当前用 accent，内环当前用 favorable-fg；图例对应相同令牌且有文字。非当前刻度 ink-secondary / surface-sunken 对比度 7.53:1，图例 ink-tertiary / card 为 5.87:1；环的实际分辨效果待截图。 |
   | 黛青题头 | 标题使用 accent-on / accent，深色对比度 7.13:1；提示文字也用 accent-on，保留原有 0.85 不透明度。 |
   | 程度圆点 | 未选时边框 border-strong、实心 accent；选中时用 accent-on 区分空/实及不透明度。未发现硬编码颜色，实际可辨性待目测。 |
   | 结果条形 | primary / secondary / neutral 分别为 `#7fb3a2` / `#5e8577` / `#4a4f4b`，轨道 `#262b28`；三个令牌值不同，仍有分数和文字，实际辨识效果待目测。 |
   | 不和与关系标签 | 现有映射仍将“不和”映射为 adverse；深色 adverse 与 favorable 的字/底对比度分别为 8.57:1、8.63:1。未改关系含义和配色用途。 |
   | 胶囊阴影 | 深色 shadow-pill 为 `0 2px 8px rgba(0,0,0,0.50)`，使用黑色阴影；透明宿主和阴影包络断言保留，实际发灰/裁切目测待评审。 |

   对比度用 tokens.json 的深色值（解析别名）按 sRGB 相对亮度计算，仅说明所列颜色组合。当前静态核对未确认需改色的问题，因此两处 tokens 均未改。全仓搜索未找到 `build_css` 生成脚本；现行同步方式是运行时 CSS 的显式令牌声明，由 `src/styles/tokens.test.ts` 逐项校验 JSON/CSS 两主题、别名和缺失/重复/额外声明。此次无需同步写入，漂移测试随包测通过。

2. **修改文件清单**

   以下大括号逐一列出文件，共 18 个实现/测试/说明文件，另新增本证据：

   - `apps/yunqi-workbench/src/components/design/{SegmentedText.tsx, SegmentedText.test.tsx, ElementDot.tsx, ElementDot.test.tsx}`。
   - `apps/yunqi-workbench/src/features/constitution/components/{ConstitutionForm.tsx, ConstitutionForm.test.tsx, ConstitutionContext.tsx, ConstitutionResults.tsx, ConstitutionResults.test.tsx}`。
   - `apps/yunqi-workbench/src/features/constitution/presentation/{map-constitution.ts, map-constitution.test.ts}`。
   - `apps/yunqi-workbench/src/styles/{design-components.css, views/constitution.css}`。
   - `tests/browser/{constitution-helpers.mjs, constitution-actions.flows.spec.mjs, workbench.flows.spec.mjs, workbench.visual.spec.mjs, README.md}`。
   - `docs/plans/2026-11-18-prototype-finals/evidence/F6-implementation.md`。

   用户的 `cards/F6-polish.md` 保持未跟踪、字节未变，SHA256 `472d5e61ec3c486015eecbe2f667bc6907ecba9679c3837d6574fdc10e5ceec7`。

3. **检查结果**

   | 命令 | 状态 / 退出码 / 结果 |
   | --- | --- |
   | `pnpm build`（包测前） | PASS / 0 |
   | `pnpm --filter @yunqi/workbench test` | PASS / 0；66 文件、458 测试 |
   | `pnpm --filter @yunqi/workbench typecheck` | PASS / 0 |
   | `pnpm --filter @yunqi/workbench test:typecheck` | PASS / 0 |
   | `pnpm --filter @yunqi/workbench test:coverage` | PASS / 0；语句 99.30%、分支 98.25%、函数 99.70%、行 99.61% |
   | `pnpm --filter @yunqi/workbench build` | PASS / 0；生产 CSS 检查通过 |
   | `pnpm test` | PASS / 0；含重建、各包测试、契约/时间治理、时区、生产入口、OpenAPI 和指引检查 |
   | `pnpm typecheck` | PASS / 0；根目录完整类型门禁 |
   | `pnpm test:coverage` | PASS / 0；根目录完整覆盖率门禁，Workbench 指标同上 |
   | `pnpm test:workbench-governance` | PASS / 0；313 测试及源码检查 |
   | `pnpm test:project-guidance` | PASS / 0；15 测试及指引检查 |
   | `pnpm test:time-governance` | PASS / 0；12 测试及时间治理检查 |
   | `node --check tests/browser/constitution-helpers.mjs` | PASS / 0 |
   | `node --check tests/browser/constitution-actions.flows.spec.mjs` | PASS / 0 |
   | `node --check tests/browser/workbench.flows.spec.mjs` | PASS / 0 |
   | `node --check tests/browser/workbench.visual.spec.mjs` | PASS / 0 |
   | `pnpm exec playwright test --list` | PASS / 0；231 测试、12 文件，仅发现清单 |
   | `git diff --check` | PASS / 0（修正末尾空行后） |
   | `pnpm test:browser` | NOT_RUN / 无退出码；按用户与通用卡说明，沙箱无法运行 Chromium，由评审方运行。截图基线、axe 零违规、无外部请求和几何断言均未声称 PASS。 |

   中间失败保留：首次 `pnpm --filter @yunqi/workbench test -- src/components/design/SegmentedText.test.tsx src/components/design/ElementDot.test.tsx src/features/constitution/presentation/map-constitution.test.ts src/features/constitution/components/ConstitutionResults.test.tsx src/features/constitution/components/ConstitutionForm.test.tsx` 为 **FAIL / 1**（该参数形式实际跑了全包：457 通过、1 失败）；旧单测仍查找“本次量表版本”，已改为从来源折叠项验证同一版本信息，随后全包 PASS。首次 `git diff --check` 为 **FAIL / 2**（ElementDot 末尾多余空行，已修正）。可选 Python 字宽探针为 **FAIL / 1**（`ModuleNotFoundError: No module named 'fontTools'`），未将其用于行数结论；行数保留为浏览器 NOT_RUN。

   源证据绑定：以上 18 个文件按相对路径排序，逐项拼接 `路径 + NUL + 文件SHA256 + 换行` 后的 SHA256 为 `46b8ac19daf5ce914f077decb9c198f556f4235c3e561cae48e79aeababe325c`（排除本证据和原始任务卡）。产物：`index-CI16w95B.css` SHA256 `eeb4c46f3db2e26887b6af3ecf312e63664c16e74aa47a6002756cac186d9c94`；`index-B-u_DWHZ.js` SHA256 `c259ed5c7158c68aed058c1a3487d8c1721bcd8cb0fadf30fd7a48f652be42eb`。未手动启动浏览器或常驻开发服务，也未手动清理用户进程；测试内临时服务由既有 runner 管理。

4. **与设计规范或原型的差异及原因**

   - 七种兼夹的既有真实 Service 答卷还带一个气郁倾向。体质互参摘要使用既有 `--ts-small`（12px），互参卡横内距 `--space-3`、各格横内距 `--space-1`，为“数量 + 倾向”两行留空间；三栏仍等宽，不新增字号或间距档。
   - 分段外层保持 nowrap 和 max-width，内层只在单段超宽时允许断行，防止极窄容器横向溢出。ElementDot 仅对含分隔符的复合标签使用分段节点，普通标签结构保留；浏览器以内部文本 Range 计行，避免将包装盒误计为文字行。其余页面的 InlineText 未强制替换。
   - 只新增截图采集用例，没有伪造或改写截图文件；深色视觉和全量浏览器验收仍为 NOT_RUN。tokens.json / tokens.css 保持一致且未变更。

5. **待决问题或风险**

   评审方仍需运行 `pnpm test:browser`，检查六态深色图，以及 400×860、1366×768、1920×1080 对照图、七兼夹两行/等高、折叠项几何和段内不断行。231 是发现的用例数，重复主题/视口/断言均不是独立样本或专家案例。工程检查不代表专家冻结或临床验收；本卡未改“主客同运”或任何判定/教学规则。

## 返工 1（2026-11-18）

### 基线与范围

在 `feat/finals-f6-polish` 的现有未提交改动上继续，HEAD 仍为 `89879698573972730811615efc1c81a0e959d5af`。开始时有 20 个已修改/未跟踪文件，已记录文件哈希及原始内容；本节仅追加，前文历史证据保留。Node `v24.18.0`、pnpm `10.32.1`。

本次用户反馈：评审方已运行 `pnpm test:browser`，231 PASS，且深色六页人工核对通过；这是**评审方上一轮结果**，不冒称本轮执行。此前深色待核对项由该反馈补充；本轮按要求保持 tokens 不变。

### 完成内容与顺带核对

| 项目 | 结果与证据边界 |
| --- | --- |
| 所处气细节 | DONE（实现、单测）：`BirthComparisonTable.tsx` 的共享 `Fact` 将非空 `detail.join(' · ')` 交给 `SegmentedText`，保留 `\u202f·\u202f` 和分隔点处的 `<wbr />`；空明细仍保留隐藏占位。单测覆盖评审报告中的左右两列完整短语。 |
| 继承的断行规则 | DONE：原 `.birth-table th, .birth-table td` 有 `overflow-wrap: anywhere`，明细行会继承。现于 `.birth-page .birth-table__detail` 显式设为 `break-word`；分段内部继续使用现有组件的超宽兜底规则，不改共享组件或 tokens。 |
| 镜像对齐 | DONE（实现、断言）：保留左栏 `text-align: right`、右栏左对齐以及值/圆点布局；分段沿用行内排版。浏览器新增每段外盒恰为 1 个 rect、内部文字 Range 恰为 1 行、无横向溢出，以及左栏续行末段右缘/右栏续行首缘对齐检查。真实几何执行 NOT_RUN。 |
| 所处运 | 存在同类未分段渲染路径，并继承同一 `anywhere` 规则；已通过共享 `Fact` 一并处理。单测分别覆盖两列的“主少角 / 客太商”“主太羽 / 客少商”，浏览器也检查该行的 4 个分段。此处未声称已在浏览器观察到词内断行。 |
| 出生资料摘要“1980-03-12 · 时刻不详 · 修改” | 静态核对未发现同类问题：已有 `InlineText` 窄空格，`.birth-input-summary` 明确 `white-space: nowrap`；保留现有实现。`birth-result` 新增摘要正文单行和不溢出的文字 Range 断言。真实页面执行 NOT_RUN。 |
| 当下页“全年 · 2024 / 2026” | 静态核对未发现同类词内断行的证据：`CurrentYunQiPage` 使用短 `InfoCard` label，`InfoCard` 已用 `InlineText`；该 label 仍继承 shell 的 `anywhere`，静态检查不能确认实际行数，保留实现。`current`（2024）与 `current-stage-facts`（2026）均新增全年 label 单行和不溢出的文字 Range 断言，覆盖浅/深及其余既有面板矩阵；真实执行 NOT_RUN。 |

`birth-result` 继续使用 `1980-03-12` 与既有真实 Service 快照；在应用内主题切换、字体稳定及面板布局检查后执行新增断言。两侧“所处气”要求完整主/客短语分为两行，检查实际续行对齐；所有非空细节的每个 `.ds-seg` 都检查 `getClientRects().length === 1`，并额外检查内部文字，避免 inline-block 外盒掩盖段内折行。测量写入 `birth-detail-segments` JSON 附件。

### 本轮修改文件

1. `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.tsx`
2. `apps/yunqi-workbench/src/features/yunqi/birth/components/BirthComparisonTable.test.tsx`
3. `apps/yunqi-workbench/src/styles/views/birth.css`
4. `tests/browser/birth-helpers.mjs`
5. `tests/browser/workbench.visual.spec.mjs`（在此前 F6 改动上局部增加断言）
6. 本证据文件（仅追加“返工 1”）。

### 检查结果

| 命令 | 状态 / 退出码 / 结果 |
| --- | --- |
| `pnpm --filter @yunqi/workbench exec vitest run src/features/yunqi/birth/components/BirthComparisonTable.test.tsx` | 最终 PASS / 0；5 测试。先增回归断言、后修复；中间失败见下文。 |
| `pnpm --filter @yunqi/workbench test` | PASS / 0；66 文件、460 测试。 |
| `pnpm --filter @yunqi/workbench typecheck` | PASS / 0。 |
| `pnpm --filter @yunqi/workbench test:typecheck` | PASS / 0。 |
| `pnpm --filter @yunqi/workbench test:coverage` | PASS / 0；66 文件、460 测试；语句 99.30%（857/863）、分支 98.25%（734/747）、函数 99.70%（340/341）、行 99.61%（779/782）；阈值未改。 |
| `pnpm test:workbench-governance` | PASS / 0；313 测试及源码检查。 |
| `pnpm exec playwright test --list` | PASS / 0；231 用例、12 文件，仅发现清单。新增断言复用既有用例，没有增加浏览器用例数。 |
| `node --check tests/browser/birth-helpers.mjs` | PASS / 0。 |
| `node --check tests/browser/workbench.visual.spec.mjs` | PASS / 0。 |
| `pnpm test:time-governance` | PASS / 0；12 测试及时间治理检查。 |
| `pnpm --filter @yunqi/workbench build` | PASS / 0；178 modules，生产 CSS 检查通过。 |
| `git diff --check` | PASS / 0。 |
| `pnpm test:browser` | NOT_RUN / 无退出码；按 [`cards/_common.md`](../cards/_common.md) 的“你的沙箱无法启动 Chromium：`pnpm test:browser` 记为 NOT_RUN，由评审方在本机运行”，本轮未启动浏览器。新增几何断言、截图、axe 和同源请求检查均未冒称 PASS。 |

保留中间失败：定向单测首次为 **FAIL / 1，2 失败、3 通过**，新增“所处气”“所处运”断言都收到空分段列表；接入组件后为 **FAIL / 1，1 失败、4 通过**，旧的行可访问名称仍要求普通空格，实际已为窄空格。将该精确预期更新为窄空格后，5/5 PASS；未删除或放宽原有行头关联、读序、空明细、缺失关系断言。单测验证分段 DOM 与文案，不能代替浏览器排版验证。

源与产物绑定（路径排序后拼接 `路径 + NUL + 文件SHA256 + 换行`，再取 SHA256）：

- 本轮 5 个实现/测试文件（上述 1–5）：`41f28bd2a477519c30255d4b6007ad1e99ee98d8af850cab7d6bd935041eb0cb`。
- 全部 22 个 dirty 实现/测试/浏览器说明文件（含此前 F6，排除任务卡与本证据）：`771aebf16818bbe9dd88c6604002d7d37f37d29c3fc15a6314118fb444e079b3`。
- `dist/assets/index-ChRySDQT.css`：`be673940d23aecd73f5ff8230a6c8a9147d2d549643379319cc95c704f1ba5a1`。
- `dist/assets/index-CJ4m4qU5.js`：`280fe77e1d3cfb11576d6185e1154a0673a9f26a2f426d4d3bc975fb61244495`。

与返工开始时比较，原有 20 个 dirty 文件中，18 个字节未变；另两项为共享 visual spec 的局部增补和本证据的追加。前文内容保持原样，原始任务卡及 `tokens.json` / `tokens.css` 均未改变。未改规则、契约、业务时间、依赖或医疗语义；未提交、未推送、未切分支。没有手动启动常驻服务或浏览器，也未清理用户进程。

### 差异与待验

没有新增设计差异。仅落实 F6 原有分段要求，保留镜像布局及现有超窄容器兜底行为。评审方复验入口仍为 `pnpm test:browser`：重点查看 400×860 浅/深的 `birth-result` 新增分段、续行对齐和摘要单行断言，以及 2024/2026 的全年题头。此前 231 PASS 与深色人工通过属于上一轮，不能替代新增断言的本轮执行；工程检查不代表专家或临床验收。
