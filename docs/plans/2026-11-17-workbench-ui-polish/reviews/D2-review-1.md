# D2 评审 1（Claude）

结论：返工。实现符合卡片：DateField 只做位数与整数范围、API 负责日期有效性；SegmentedControl 为 radiogroup；年度默认年来自当下 API 查询；
性别折叠与更换确认完整。评审方 `pnpm test:browser`（198 项）：173 通过、25 失败，归为两个原因，均为浏览器用例未随本卡改写。

## 失败与要求

1. `workbench.visual.spec.mjs:256`「Year selector meets the design control-height token (40 px)」（annual-entry/result/invalid/error × 6 个视觉项目，共 24 项）。
   本卡按设计改为 `--input-height`（36）。改写断言：读取根元素计算后的 `--input-height` 值并断言下拉高度等于它（±1），断言说明同步更新；
   不要写死 36，也不要删除该断言。其他控件的 40 高断言不变。
2. `workbench.flows.spec.mjs:343`「inquiry remains a no-query planning entry」：用例从 `/yunqi/year` 起步，本卡起该页会请求当下 API 并跳转到当前运气年，
   因而 `diagnostics.requests` 含 `learning/current` 与 `year/2024`。该用例的意图是“问诊规划页本身不发业务请求”：
   在点击“问诊规划 ›”之前，等待年度页加载完成（`settle`），记录当时请求数，断言进入问诊页后请求数不变（增量为 0）。不得放宽为允许请求。
3. 另：`DateField` 的 legend 写死“出生日期（公历）”。改为由调用方传入 `label`（必填），出生页传原文案。

完成后按原结构报告。
