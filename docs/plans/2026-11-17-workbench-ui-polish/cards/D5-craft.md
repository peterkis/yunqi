# D5 工艺细节

## 目标

完成清单 P2-12～17 的出版级细节。

## 必读

- 本计划 `README.md`、`source-checklist.md` P2
- `styles/global.css`、`design-components.css`、`panel-shell.css`、`styles/views/*.css`、`components/design/*`
- `features/yunqi/components/CurrentYunQiParts.tsx`（进度条）、相关 presentation mapper
- `tests/browser/design-foundations.flows.spec.mjs`（焦点环、reduced-motion 重试断言）

## 要求

1. **等宽数字（12）**：全局 `time, .num { font-variant-numeric: tabular-nums; }`；日期、年份、分数、进度“4/26”等数字包上 `.num` 或已在 `time` 内。
2. **进度条段内进度（13）**：当前段用硬边分割“已过 / 未过”（不用渐变）。比例必须来自 API：若当下 DTO 已有可直接使用的进度/比例字段则用之；
   **没有则本项不做**并在报告中说明（不得用两个 `localTime` 字符串自行计算时间差）。
3. **动效（14）**：分段切换、选项选中、展开收起 120–160ms `ease-out`（用已有 motion 令牌，没有则局部令牌加来源注释）；
   `@media (prefers-reduced-motion: reduce)` 下一律取消。C1/C5 的焦点环重试断言须仍成立。
4. **中文标点（15）**：原文首字全角引号用 `text-spacing-trim: trim-start`（保留引号，不删除）；分隔符“ · ”统一为两侧 4px 外边距的独立元素或窄空格，全应用一致。
5. **焦点（16）**：按钮的高亮/焦点样式只在 `:focus-visible` 出现；鼠标点击主题按钮后不保留高亮（浅/深都验证）。
6. **开发态宿主区（17）**：仅 `import.meta.env.DEV` 时给 body 中性灰（令牌色）表示工作站区域；生产构建产物中不出现该样式。

## 检查（机械约束）

- 浏览器：抽样 `time` 与 `.num` 计算样式含 `tabular-nums`；reduced-motion 下关键元素 `transition-duration` 为 0s；
  鼠标点击主题按钮后 `:focus-visible` 不匹配且无高亮背景，键盘 Tab 时匹配；原文 `blockquote` 计算样式含 `text-spacing-trim`（如浏览器支持）。
- 单测/构建检查：生产 `dist` 的 CSS 不含开发态宿主区规则。

## 不做

自算进度比例、新增依赖、修改令牌 JSON。不改 Service/Domain/Contracts/Client。

## 验收标准

- 六项落地或按规则说明不做；全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
