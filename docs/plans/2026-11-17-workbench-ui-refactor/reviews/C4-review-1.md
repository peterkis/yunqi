# C4 评审 · 第 1 轮（2026-11-17）

结论：**返工**（3 项必改）。

## 独立验证（评审方本机，工作树 `ui-c4`）

`pnpm test:browser` FAIL 1：152 通过、2 失败（`flows-chromium`）。

## 通过项

- 对照表 `52px | 1fr | 1fr`，先天/当下列头干支 + 年份，岁运/司天/在泉/所处气/所处运五行，每行关系标签 + 说明，
  五行圆点与紧凑标签变体；无因果箭头、无“综合结论”（截图核对）。
- 多候选完整展示、编辑隐藏、清空、重复提交保护的实现；出生原文下钻；同页测评入口与销毁语义保留，`gcTime: 0` 保持。

## 必改

1. **新增的“提交中”用例拦截路径写错，导致 45s 超时**（`birth-assessment.flows.spec.mjs` “birth inputs enforce required time…”）：
   `page.route('**/api/v1/learning/birth-comparison')` 与真实路径 `/api/v1/yunqi/learning/birth-comparison` 不匹配，
   请求未被挂起，`await reached` 永不返回。改为与 Client 实际路径一致（或用 `endsWith('/learning/birth-comparison')` 的函数匹配），
   并保证挂起分支的断言真实生效。其余新用例中的路径拦截按同一方式核对。
2. **共享走查用例未随新界面改写**（`ux-walkthrough.flows.spec.mjs:66`）：先天对照页的 `h2` 现为 visually-hidden，
   `toBeInViewport()` 永远失败。改为断言新界面中可见的首个内容（例如出生日期输入或对照入口）在视口内，保持“切换分段后焦点到内容区、内容可见”的强度。
3. **对照值用了令牌以外的 13px**：设计 `tokens.json` 规定 `body-strong`（14/600）用于“对照表的值”。值改用 `--type-body-strong-*`；
   默认屏 5 级字号约束通过在令牌字号中取舍满足（在样式或报告写明本屏采用的 5 级），不要引入令牌外字号。按钮沿用 Button 组件规格。

# C4 评审 · 第 2 轮（2026-11-17）

结论：**通过**。出生请求拦截路径修正并补充挂起断言；共享走查改为断言新界面可见内容；对照值改用 `body-strong` 14/600。

独立验证（评审方本机，工作树 `ui-c4`）：`pnpm test:browser` PASS（154 通过，全部视口 axe 零违规）；覆盖率、Workbench 治理、时间治理、
`git diff --check` 退出码 0。全应用字号阶梯（T1）在合并后统一处理。
