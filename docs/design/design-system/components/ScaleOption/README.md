# ScaleOption
量表选项：体质量表的五级作答按钮，一题一屏纵向排列。

- 高 `option-height` 48，`radius-md`，1px `border-default`，间距 8。
- 左起：按键角标（22×22，`radius-xs`）→ 主标签（600，固定宽 36）→ 程度说明（`ink-tertiary`）。
- 选中：`accent-subtle` 底、`accent` 2px 内外描边、角标反白。
- 用 `role="radio"` + `aria-checked`，外层 `role="radiogroup"`；数字键 1–5 直接作答。
- 五级固定为：没有/根本不、很少/有一点、有时/有些、经常/相当、总是/非常。
