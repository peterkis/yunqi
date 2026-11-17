# DESIGN

运气通 Workbench 的 UI 设计入口。2026-11-17 起界面按下列设计规范与原型重构；
重构前的页面布局、样式和截图均为 demo，不再作为设计参考或验收基线。

完整说明（来源、版本、哈希、授权边界）见 [docs/design/README.md](docs/design/README.md)。
设计不改变规则、API Contract、固定北京时间和医疗边界，这些仍以 [AGENTS.md](AGENTS.md) 为准。

## 设计规范

| 内容 | 链接 |
| --- | --- |
| 设计原则、色彩、字体、字号与排版 | [design-system/README.md](docs/design/design-system/README.md) |
| 面板骨架、网格、间距、层次、阴影、圆角 | [design-system/1-layout.md](docs/design/design-system/1-layout.md) |
| 视觉、交互、文案、医疗安全、可访问性硬约束 | [design-system/2-constraints.md](docs/design/design-system/2-constraints.md) |
| 设计令牌（浅/深主题颜色、字体、间距、圆角、阴影、尺寸、z-index） | [design-system/tokens.json](docs/design/design-system/tokens.json) |
| 本地字体与许可 | [NotoSansSC-VF.woff2](docs/design/design-system/fonts/NotoSansSC-VF.woff2)、[NotoSerifSC-VF.woff2](docs/design/design-system/fonts/NotoSerifSC-VF.woff2)、[OFL.txt](docs/design/design-system/fonts/OFL.txt) |
| 上游在线规范 | <https://claude.ai/artifact/Uhzvz2FGqfiCoxk4JH8yGo> |

## 组件

| 组件 | 规范 | 预览 |
| --- | --- | --- |
| Button 按钮 | [README](docs/design/design-system/components/Button/README.md) | [preview](docs/design/design-system/components/Button/preview.html) |
| ElementDot 五行圆点 | [README](docs/design/design-system/components/ElementDot/README.md) | [preview](docs/design/design-system/components/ElementDot/preview.html) |
| InfoCard 信息卡 | [README](docs/design/design-system/components/InfoCard/README.md) | [preview](docs/design/design-system/components/InfoCard/preview.html) |
| PanelHeader 标题栏 | [README](docs/design/design-system/components/PanelHeader/README.md) | [preview](docs/design/design-system/components/PanelHeader/preview.html) |
| QuoteBlock 原文块 | [README](docs/design/design-system/components/QuoteBlock/README.md) | [preview](docs/design/design-system/components/QuoteBlock/preview.html) |
| RelationChip 关系标签 | [README](docs/design/design-system/components/RelationChip/README.md) | [preview](docs/design/design-system/components/RelationChip/preview.html) |
| ScaleOption 量表选项 | [README](docs/design/design-system/components/ScaleOption/README.md) | [preview](docs/design/design-system/components/ScaleOption/preview.html) |
| SegmentedNav 分段导航 | [README](docs/design/design-system/components/SegmentedNav/README.md) | [preview](docs/design/design-system/components/SegmentedNav/preview.html) |
| Cover 封面 | — | [preview](docs/design/design-system/components/Cover/preview.html) |

预览片段依赖上游生成的 `tokens.css`，单独打开不带令牌样式。

## 原型

[门诊侧栏插件重构原型](docs/design/prototypes/2026-11-17-门诊侧栏插件重构原型.html)：
单文件离线包，在浏览器中打开。七个画板：当下默认态、原文与释义、先天 × 当下对照、
体质量表作答中、体质结果与运气互参、收起态胶囊条、在医生工作站中的位置。示例数据均为演示数据。

原型中的 HIS 患者信息、“复制结论到病历”、宿主停靠部署及未进入三段导航的路由超出当前授权，
见[超出当前授权的原型元素](docs/design/README.md#超出当前授权的原型元素)。

## 实现与验证

- 实现约束：[Workbench 约束 · 界面设计](docs/agents/workbench.md#界面设计)
- 门禁与浏览器验收迁移：[验证与交付 · UI重构期间的门禁](docs/agents/verification.md#ui重构期间的门禁)、[浏览器验收说明](tests/browser/README.md#ui-refactor-migration)
