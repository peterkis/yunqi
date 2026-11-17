# D4 层次与一致性

## 目标

统一当下页入口、原文页对齐与声明、关系说明排版、收起态胶囊。

## 必读

- 本计划 `README.md`、`source-checklist.md` P1-6、P1-9、P1-10、P1-11
- `docs/design/design-system/2-constraints.md`（医疗安全同屏约束）、原型画板 ①②⑦（`docs/design/prototypes/`）
- `features/yunqi/components/CurrentYunQiPage.tsx`、`CurrentYunQiParts.tsx`、`CurrentClassicsPage.tsx`、`styles/views/current-yunqi.css`
- 关系说明“这些关系怎么读？”所在组件（`grep -rn "这些关系怎么读"`）
- `components/layout/PanelShell.tsx` 收起态、`styles/panel-shell.css`、`tests/browser/panel-pill.visual.spec.mjs`
- `tests/browser/learning.flows.spec.mjs`、`workbench.flows.spec.mjs`、`ux-walkthrough.flows.spec.mjs`

## 要求

1. **关系说明（P1-6）**：出处改为 12px `ink-tertiary` 书名号整行链接，内联 SVG 12px 外链图标替代“（新窗口）”文字，可访问名称保留“新窗口打开”；
   去掉项目符号；块内重复的“教学口径，待专家确认”删除，只保留页脚一次。
2. **当下页“更多”列表（P1-9）**：卡片之外一组列表，依次为“其余阶段”“年度详情”“指定时点”“计算说明与版本”；
   行高 44px（使用令牌或带来源注释的局部令牌）、左文字右内联 chevron、行间 `border-subtle`。
   展开类（其余阶段、计算说明）保持 `details/summary` 语义，跳转类为链接；四行视觉一致，焦点环可见。
3. **原文页（P1-10）**：卡片左右边缘与分段轨道对齐（面板 16px 安全边距，去掉阅读区额外内缩造成的错位，但保留焦点环不被裁切）；
   “文献线索，非个体发病预测”改为与当下页原文卡相同的下沉提示块，并保证**始终与可见原文同屏**
   （仍固定在阅读区外或每张卡内各一处，二选一并说明；现有 `toBeInViewport` 断言不得放宽）。
   “查看原文出处”与“原文与释义 ›”统一为同一种文字链：常态无下划线，悬停与 `:focus-visible` 显示下划线。先天原文页（`BirthClassicsView`）的出处链接同步。
4. **收起态胶囊（P1-11）**：加 44px 圆标（`accent` 底、`accent-on` 字、宋体，内容为当前岁运干支）；胶囊外留 8px 边距，阴影不被裁切。
   400×64 视觉项目截图中阴影完整。

## 检查（机械约束）

- 浏览器：关系说明块内“教学口径，待专家确认”计数为 0、页脚为 1；“更多”四行高度均 ≥ 44 且相等；原文卡与分段轨道左右边缘差 ≤ 1px；
  胶囊圆标 44×44、胶囊与视口边缘 ≥ 8px；原文页声明在滚动/展开后仍在视口内。
- 单测覆盖新增结构。

## 不做

时间精度与先天表单（D1/D2）、操作区（D3）、动效与等宽数字（D5）。不改 Service/Domain/Contracts/Client。

## 验收标准

- 四项一致性问题按上述落地，截图对照原型；全部门禁绿。

## 检查命令

- `pnpm --filter @yunqi/workbench test`、`typecheck`、`test:typecheck`、`test:coverage`、`build`
- `pnpm test:workbench-governance`、`pnpm test:time-governance`、`pnpm test:project-guidance`
- `pnpm test:browser`（评审方运行）
