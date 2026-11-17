# Button
按钮：四种，按强度递减——主、次、文字、图标。

- 主：高 40，`accent` 底、`accent-on` 字，14/600，`radius-md`。每个视图最多一个，放底部操作区或完成态中央。
- 次：高 40，`surface-card` 底、1px `border-strong`，13.5/400 `ink-secondary`。与主按钮并排时放左边，宽度比主按钮窄（1 : 1.3）。
- 文字：高 36，透明底，13px `ink-secondary`，悬停 `surface-sunken`。用于“上一题”“返回修改”。
- 图标：32×32，透明底，悬停 `surface-sunken`，图标 16px 线性；必须有 `aria-label`。
- 销毁类操作（结束测评）用次按钮，不用红色。
