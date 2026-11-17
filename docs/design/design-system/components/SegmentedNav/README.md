# SegmentedNav
分段导航：面板顶部在三个主视图间切换，固定为“当下运气 / 先天对照 / 体质量表”。

- 轨道 `surface-sunken`，内距 3，`radius-md`；分段高 32，缝 2，`radius-sm`。
- 当前段：`surface-card` 底、`shadow-segment`、13px/600 `ink-primary`；其余 13px/400 `ink-secondary`。
- 用 `a` + `aria-current="page"`，不用 div。
- 原文页内的“全年 / 当下阶段”用同一组件的 30px 高变体。
- 最多 3 段；不放图标，不放角标数字。
